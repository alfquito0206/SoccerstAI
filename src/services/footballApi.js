import { getCache, setCache } from '../utils/cache';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = '5c293b02937c9df0661c3b3089fedc69';
const TIMEZONE = 'America/Mexico_City';

async function apiFetch(endpoint) {
  const cached = await getCache(endpoint);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    const planError = json.errors.plan ?? json.errors.token ?? null;
    if (planError) {
      const err = new Error(planError);
      err.code = 'PLAN_LIMIT';
      throw err;
    }
    throw new Error(JSON.stringify(json.errors));
  }

  await setCache(endpoint, json.response);
  return json.response;
}

export function getFixturesByDate(dateStr) {
  return apiFetch(`/fixtures?date=${dateStr}&timezone=${TIMEZONE}`);
}

export function getTodayFixtures() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return getFixturesByDate(dateStr);
}

export function getFixtureStats(fixtureId) {
  return apiFetch(`/fixtures/statistics?fixture=${fixtureId}`);
}

export function getFixtureEvents(fixtureId) {
  return apiFetch(`/fixtures/events?fixture=${fixtureId}`);
}

export async function getH2H(homeId, awayId) {
  const all = await apiFetch(`/fixtures/headtohead?h2h=${homeId}-${awayId}`);
  return all
    .filter((f) => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short))
    .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
    .slice(0, 10);
}

export async function getTeamLastMatches(teamId, last = 6) {
  // El plan free no soporta &last= — usamos &season= y filtramos en cliente
  // Intentamos desde el año más reciente permitido hacia atrás
  const maxSeason = Math.min(new Date().getFullYear() - 1, 2024);
  for (const season of [maxSeason, maxSeason - 1, maxSeason - 2]) {
    try {
      const all = await apiFetch(`/fixtures?team=${teamId}&season=${season}&timezone=${TIMEZONE}`);
      if (!all?.length) continue;
      const finished = all
        .filter((f) => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short))
        .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
        .slice(0, last);
      if (finished.length) return finished;
    } catch { continue; }
  }
  return [];
}

// Busca el equipo nacional senior en API-Football por nombre
export async function searchNationalTeam(name) {
  const results = await apiFetch(`/teams?search=${encodeURIComponent(name)}`);
  const nationals = (results ?? []).filter(
    (r) => r.team.national && !r.team.name.match(/\b(W|U\d{2})\b/i)
  );
  if (!nationals.length) return null;
  const exact = nationals.find(
    (r) => r.team.name.toLowerCase() === name.toLowerCase()
  );
  return (exact ?? nationals[0]).team;
}

export function getTeamStats(teamId, leagueId, season) {
  return apiFetch(`/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`);
}

export function getTeamSquad(teamId) {
  return apiFetch(`/players/squads?team=${teamId}`);
}
