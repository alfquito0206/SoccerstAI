import { db } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

function slugify(str) {
  return (str ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function h2hKey(t1, t2) {
  return [slugify(t1), slugify(t2)].sort().join('_vs_');
}

// Todos los enfrentamientos directos entre dos selecciones en Mundiales
export async function getWCHeadToHead(team1, team2) {
  const snap = await getDocs(query(
    collection(db, 'wc_matches'),
    where('h2h_key', '==', h2hKey(team1, team2)),
    orderBy('date', 'desc')
  ));
  return snap.docs.map((d) => d.data()).filter((m) => m.finished);
}

// Historial completo de una selección en Mundiales
export async function getWCTeamHistory(teamName) {
  const snap = await getDocs(query(
    collection(db, 'wc_matches'),
    where('teams', 'array-contains', teamName),
    orderBy('date', 'desc')
  ));
  return snap.docs.map((d) => d.data()).filter((m) => m.finished);
}

// Agrega el contexto completo para el análisis IA de un partido de WC
export async function getWCContext(homeTeamName, awayTeamName) {
  const [h2h, homeHistory, awayHistory] = await Promise.all([
    getWCHeadToHead(homeTeamName, awayTeamName),
    getWCTeamHistory(homeTeamName),
    getWCTeamHistory(awayTeamName),
  ]);
  return { h2h, homeHistory, awayHistory };
}
