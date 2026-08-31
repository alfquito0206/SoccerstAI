const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const FD_BASE   = 'https://api.football-data.org/v4';
const ODDS_BASE = 'https://api.the-odds-api.com/v4';

// ── Normalización (espejo de footballDataApi.js) ──────────────────────────────

const STATUS_MAP = {
  TIMED:     { short: 'NS',   long: 'Not Started'    },
  SCHEDULED: { short: 'NS',   long: 'Not Started'    },
  IN_PLAY:   { short: 'LIVE', long: 'In Progress'     },
  PAUSED:    { short: 'HT',   long: 'Half Time'       },
  FINISHED:  { short: 'FT',   long: 'Match Finished'  },
  AWARDED:   { short: 'FT',   long: 'Match Finished'  },
  POSTPONED: { short: 'PST',  long: 'Match Postponed' },
  CANCELLED: { short: 'CANC', long: 'Match Cancelled' },
  SUSPENDED: { short: 'SUSP', long: 'Match Suspended' },
};

function normalizeMatch(m) {
  const status = STATUS_MAP[m.status] ?? { short: 'NS', long: m.status };
  let goalsHome = null, goalsAway = null;
  if (['FINISHED', 'AWARDED', 'IN_PLAY', 'PAUSED'].includes(m.status)) {
    goalsHome = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
    goalsAway = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
  }
  return {
    fixture: {
      id:        m.id,
      date:      m.utcDate,
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
      code:    m.competition.code,
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

function getActiveCompetitions(dateStr) {
  const month = parseInt(dateStr.substring(5, 7));
  const year  = parseInt(dateStr.substring(0, 4));
  const comps = [];
  if (month >= 6 && month <= 7 && year % 4 === 2) comps.push('WC');
  if (month >= 6 && month <= 7 && year % 4 === 0) comps.push('EC');
  if (month >= 2 && month <= 11)                   comps.push('CLI');
  if (month >= 4 && month <= 12)                   comps.push('BSA');
  if (month >= 8 || month <= 5) {
    comps.push('PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'EL', 'DED', 'PPL', 'ELC');
  }
  return comps;
}

const SPORT_KEY_MAP = {
  WC:  'soccer_fifa_world_cup',
  EC:  'soccer_uefa_european_championship',
  CL:  'soccer_uefa_champs_league',
  EL:  'soccer_uefa_europa_league',
  PL:  'soccer_epl',
  PD:  'soccer_spain_la_liga',
  BL1: 'soccer_germany_bundesliga',
  SA:  'soccer_italy_serie_a',
  FL1: 'soccer_france_ligue_one',
  CLI: 'soccer_conmebol_copa_libertadores',
};

// ── Function 1: Partidos del día ──────────────────────────────────────────────
// Corre cada 2 minutos. Actualiza matches/{YYYY-MM-DD} con todos los partidos
// del día usando football-data.org. Todos los usuarios leen de ahí.

exports.syncMatchesByDate = onSchedule(
  { schedule: '*/2 * * * *', secrets: ['FD_API_KEY'], timeoutSeconds: 60 },
  async () => {
    const dateStr = new Date().toISOString().substring(0, 10);
    const competitions = getActiveCompetitions(dateStr);

    const results = await Promise.allSettled(
      competitions.map((code) =>
        fetch(`${FD_BASE}/competitions/${code}/matches?dateFrom=${dateStr}&dateTo=${dateStr}`, {
          headers: { 'X-Auth-Token': process.env.FD_API_KEY },
        })
          .then((r) => (r.ok ? r.json() : { matches: [] }))
          .then((json) => (json.matches ?? []).map(normalizeMatch))
          .catch(() => [])
      )
    );

    const seen = new Set();
    const matches = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .filter((m) => {
        if (seen.has(m.fixture.id)) return false;
        seen.add(m.fixture.id);
        return true;
      });

    const hasLive = matches.some((m) =>
      ['LIVE', 'HT'].includes(m.fixture.status.short)
    );

    await db.collection('matches').doc(dateStr).set({
      updatedAt: Timestamp.now(),
      hasLive,
      matches,
    });
  }
);

// ── Function 2: Cuotas ────────────────────────────────────────────────────────
// Corre cada 5 minutos. Actualiza odds/{sportKey} con las cuotas vigentes.
// Solo fetcha las competencias activas hoy para no gastar requests de la API.

exports.syncOdds = onSchedule(
  { schedule: '*/5 * * * *', secrets: ['ODDS_API_KEY'], timeoutSeconds: 60 },
  async () => {
    const dateStr    = new Date().toISOString().substring(0, 10);
    const activeComps = getActiveCompetitions(dateStr);
    const sportKeys  = [...new Set(
      activeComps.map((c) => SPORT_KEY_MAP[c]).filter(Boolean)
    )];

    await Promise.allSettled(
      sportKeys.map(async (sportKey) => {
        const url = `${ODDS_BASE}/sports/${sportKey}/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us&markets=h2h,totals&oddsFormat=decimal`;
        const res = await fetch(url);
        if (!res.ok) return;
        const events = await res.json();
        if (!Array.isArray(events) || !events.length) return;
        await db.collection('odds').doc(sportKey).set({
          updatedAt: Timestamp.now(),
          events,
        });
      })
    );
  }
);
