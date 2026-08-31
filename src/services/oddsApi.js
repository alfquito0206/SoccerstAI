import { getCache, setCache } from '../utils/cache';
import { getOddsEventsFromCache } from './firestoreCache';

const BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY  = process.env.EXPO_PUBLIC_ODDS_API_KEY;

// Mapeo competition code (football-data.org) → sport key (The Odds API)
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

// Normaliza nombre de equipo para comparación aproximada
function normName(name) {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .replace(/[^a-z\s]/g, '')
    .trim();
}

function namesMatch(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer  = na.length < nb.length ? nb : na;
  return longer.includes(shorter.substring(0, Math.min(5, shorter.length)));
}

async function oddsFetch(sportKey) {
  // 1. Firestore compartido entre usuarios (escrito por Cloud Function)
  const firestoreEvents = await getOddsEventsFromCache(sportKey).catch(() => null);
  if (firestoreEvents) return firestoreEvents;

  // 2. AsyncStorage local como segunda línea de caché
  const cacheKey = `odds:${sportKey}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  // 3. API directa como fallback final
  const url = `${BASE_URL}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=us&markets=h2h,totals&oddsFormat=decimal`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 401 || res.status === 422) return [];
    throw new Error(`Odds API error ${res.status}`);
  }

  const data = await res.json();
  if (data.error_code) return [];

  await setCache(cacheKey, data);
  return data;
}

// Devuelve las cuotas para un partido específico dado su competition code y los nombres de equipos
export async function getMatchOdds(competitionCode, homeTeamName, awayTeamName, matchDate) {
  const sportKey = SPORT_KEY_MAP[competitionCode];
  if (!sportKey) return null;

  const events = await oddsFetch(sportKey);
  if (!events?.length) return null;

  const matchDay = matchDate ? matchDate.substring(0, 10) : null;

  const event = events.find((e) => {
    const sameDay = !matchDay || e.commence_time.substring(0, 10) === matchDay;
    return sameDay &&
      namesMatch(e.home_team, homeTeamName) &&
      namesMatch(e.away_team, awayTeamName);
  });

  if (!event) return null;

  // Consolidar cuotas: elegir la casa con más mercados o la primera disponible
  const bookmaker = event.bookmakers?.[0];
  if (!bookmaker) return null;

  const h2hMarket    = bookmaker.markets.find((m) => m.key === 'h2h');
  const totalsMarket = bookmaker.markets.find((m) => m.key === 'totals');

  const h2h = h2hMarket
    ? {
        home: h2hMarket.outcomes.find((o) => namesMatch(o.name, homeTeamName))?.price ?? null,
        away: h2hMarket.outcomes.find((o) => namesMatch(o.name, awayTeamName))?.price ?? null,
        draw: h2hMarket.outcomes.find((o) => o.name === 'Draw')?.price ?? null,
      }
    : null;

  const totals = totalsMarket
    ? totalsMarket.outcomes.map((o) => ({ name: o.name, point: o.point, price: o.price }))
    : [];

  return {
    bookmaker: bookmaker.title,
    h2h,
    totals,
    eventId: event.id,
  };
}

// Devuelve todos los partidos con cuotas para un sport key dado
export async function getOddsBySport(sportKey) {
  return oddsFetch(sportKey);
}
