import { db } from './firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// Márgenes holgados sobre el intervalo de la Cloud Function
const MATCH_STALE_MS = 3 * 60 * 1000;  // CF corre cada 2 min
const ODDS_STALE_MS  = 7 * 60 * 1000;  // CF corre cada 5 min

function isStale(firestoreTs, maxAgeMs) {
  if (!firestoreTs) return true;
  const ms = firestoreTs.toMillis?.() ?? firestoreTs;
  return Date.now() - ms > maxAgeMs;
}

// One-shot: para fechas que no son hoy (pasado / futuro)
export async function getMatchesFromCache(dateStr) {
  const snap = await getDoc(doc(db, 'matches', dateStr));
  if (!snap.exists()) return null;
  const { updatedAt, matches } = snap.data();
  if (isStale(updatedAt, MATCH_STALE_MS)) return null;
  return matches ?? null;
}

// Real-time: para hoy — recibe push cada vez que la CF actualiza Firestore
// Devuelve la función de unsub; llamar al desmontar el componente.
export function subscribeToMatches(dateStr, onData) {
  return onSnapshot(doc(db, 'matches', dateStr), (snap) => {
    if (snap.exists()) onData(snap.data().matches ?? []);
  });
}

// One-shot: cuotas por sport key (usado por oddsApi.js)
export async function getOddsEventsFromCache(sportKey) {
  const snap = await getDoc(doc(db, 'odds', sportKey));
  if (!snap.exists()) return null;
  const { updatedAt, events } = snap.data();
  if (isStale(updatedAt, ODDS_STALE_MS)) return null;
  return events ?? null;
}
