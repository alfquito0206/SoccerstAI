import { getCache, setCache } from '../utils/cache';

const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY  = process.env.EXPO_PUBLIC_FD_API_KEY;

const STATUS_MAP = {
  TIMED:      { short: 'NS',   long: 'Not Started'    },
  SCHEDULED:  { short: 'NS',   long: 'Not Started'    },
  IN_PLAY:    { short: 'LIVE', long: 'In Progress'     },
  PAUSED:     { short: 'HT',   long: 'Half Time'       },
  FINISHED:   { short: 'FT',   long: 'Match Finished'  },
  AWARDED:    { short: 'FT',   long: 'Match Finished'  },
  POSTPONED:  { short: 'PST',  long: 'Match Postponed' },
  CANCELLED:  { short: 'CANC', long: 'Match Cancelled' },
  SUSPENDED:  { short: 'SUSP', long: 'Match Suspended' },
};

async function fdFetch(endpoint) {
  const cacheKey = `fd:${endpoint}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'X-Auth-Token': API_KEY },
  });

  if (res.status === 429) {
    const err = new Error('Rate limit');
    err.code = 'RATE_LIMIT';
    throw err;
  }
  if (!res.ok) throw new Error(`FD error ${res.status}`);

  const json = await res.json();
  await setCache(cacheKey, json);
  return json;
}

function normalizeMatch(m) {
  const status = STATUS_MAP[m.status] ?? { short: 'NS', long: m.status };

  let goalsHome = null, goalsAway = null;
  if (['FINISHED', 'AWARDED', 'IN_PLAY', 'PAUSED'].includes(m.status)) {
    goalsHome = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
    goalsAway = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
  }

  return {
    fixture: {
      id: m.id,
      date: m.utcDate,
      timestamp: Math.floor(new Date(m.utcDate).getTime() / 1000),
      status,
    },
    teams: {
      home: {
        id:     m.homeTeam.id,
        name:   m.homeTeam.name ?? m.homeTeam.shortName ?? 'TBD',
        logo:   m.homeTeam.crest ?? null,
        winner: m.status === 'FINISHED'
          ? (goalsHome > goalsAway ? true : goalsHome < goalsAway ? false : null)
          : null,
      },
      away: {
        id:     m.awayTeam.id,
        name:   m.awayTeam.name ?? m.awayTeam.shortName ?? 'TBD',
        logo:   m.awayTeam.crest ?? null,
        winner: m.status === 'FINISHED'
          ? (goalsAway > goalsHome ? true : goalsAway < goalsHome ? false : null)
          : null,
      },
    },
    goals: { home: goalsHome, away: goalsAway },
    league: {
      id:      m.competition.id,
      code:    m.competition.code,   // ← necesario para odds API
      name:    m.competition.name,
      country: m.area?.name ?? '',
      logo:    m.competition.emblem ?? null,
      flag:    m.area?.flag ?? null,
      round:   m.matchday ? `Jornada ${m.matchday}` : (m.stage ?? ''),
      season:  m.season?.startDate
        ? new Date(m.season.startDate).getFullYear()
        : new Date(m.utcDate).getFullYear(),
    },
    _source:    'fd',
    _fdMatchId: m.id,
  };
}

// Devuelve qué competencias consultar según el mes — evita llamadas innecesarias
function getActiveCompetitions(dateStr) {
  const month = parseInt(dateStr.substring(5, 7));
  const year  = parseInt(dateStr.substring(0, 4));
  const comps = [];

  // Copa del Mundo: junio-julio cada 4 años (2026, 2030…)
  if (month >= 6 && month <= 7 && year % 4 === 2) comps.push('WC');

  // Eurocopa: junio-julio años pares no divisibles por 4 (2024, 2028…)
  if (month >= 6 && month <= 7 && year % 4 === 0) comps.push('EC');

  // Copa Libertadores: feb-nov
  if (month >= 2 && month <= 11) comps.push('CLI');

  // Brasileirao Serie A: abril-dic
  if (month >= 4 && month <= 12) comps.push('BSA');

  // Ligas europeas: agosto-mayo
  if (month >= 8 || month <= 5) {
    comps.push('PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'EL', 'DED', 'PPL', 'ELC');
  }

  return comps;
}

// Partidos por fecha — consulta cada competencia activa individualmente
export async function getFixturesByDate(dateStr) {
  const competitions = getActiveCompetitions(dateStr);

  const results = await Promise.allSettled(
    competitions.map((code) =>
      fdFetch(`/competitions/${code}/matches?dateFrom=${dateStr}&dateTo=${dateStr}`)
        .then((json) => (json.matches ?? []).map(normalizeMatch))
        .catch(() => [])
    )
  );

  const allMatches = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // Deduplicar por ID de partido
  const seen = new Set();
  return allMatches.filter((m) => {
    if (seen.has(m.fixture.id)) return false;
    seen.add(m.fixture.id);
    return true;
  });
}

// Últimos/próximos partidos de un equipo
export async function getFDTeamMatches(teamId, limit = 6) {
  const json = await fdFetch(`/teams/${teamId}/matches?limit=${limit}`);
  const all = json.matches ?? [];
  // Preferir terminados; si no hay, mostrar próximos
  const finished = all
    .filter((m) => ['FINISHED', 'AWARDED'].includes(m.status))
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
    .slice(0, limit);
  if (finished.length) return finished.map(normalizeMatch);
  // Fallback: próximos partidos del torneo
  return all
    .filter((m) => ['TIMED', 'SCHEDULED'].includes(m.status))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
    .slice(0, limit)
    .map(normalizeMatch);
}

// Info y plantilla de un equipo
export async function getFDTeamSquad(teamId) {
  const json = await fdFetch(`/teams/${teamId}`);
  // Normalizar al formato que espera PlantillaTab (compatible con API-Football)
  // football-data.org usa: Goalkeeper, Defence, Midfield, Offence
  // Normalizar al formato de API-Football: Goalkeeper, Defender, Midfielder, Attacker
  const POS_MAP = {
    Goalkeeper: 'Goalkeeper',
    Defence:    'Defender',
    Midfield:   'Midfielder',
    Offence:    'Attacker',
    Forward:    'Attacker',
    Defender:   'Defender',
    Midfielder: 'Midfielder',
    Attacker:   'Attacker',
  };

  const players = (json.squad ?? []).map((p) => ({
    id:       p.id,
    name:     p.name,
    age:      p.dateOfBirth
      ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()
      : null,
    number:   p.shirtNumber ?? null,
    position: POS_MAP[p.position] ?? 'Attacker',
    photo:    null,
  }));
  return [{ players }];
}

// H2H usando el endpoint propio de football-data.org
export async function getFDHeadToHead(fdMatchId, limit = 10) {
  const json = await fdFetch(`/matches/${fdMatchId}/head2head?limit=${limit}`);
  return (json.matches ?? [])
    .filter((m) => ['FINISHED', 'AWARDED'].includes(m.status))
    .map(normalizeMatch);
}
