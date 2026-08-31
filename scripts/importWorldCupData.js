#!/usr/bin/env node
/**
 * Importa todos los partidos de Copa del Mundo (1930-2026) a Firestore.
 *
 * Prerequisitos:
 *   1. Descarga tu Service Account desde Firebase Console →
 *      Project Settings → Service Accounts → Generate new private key
 *      Guárdalo como: scripts/serviceAccountKey.json
 *
 *   2. cd scripts && npm install
 *
 *   3. node importWorldCupData.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore }        = require('firebase-admin/firestore');
const https                   = require('https');
const path                    = require('path');

// ── Firebase Admin ─────────────────────────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── URLs raw del dataset ───────────────────────────────────────────────────────
const RAW = 'https://raw.githubusercontent.com/martj42/international_results/master';
const URLS = {
  results:     `${RAW}/results.csv`,
  goalscorers: `${RAW}/goalscorers.csv`,
  shootouts:   `${RAW}/shootouts.csv`,
};

// ── Utilidades ─────────────────────────────────────────────────────────────────
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve(raw));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines   = text.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"')          { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else                     { cur += ch; }
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function slugify(str) {
  return (str ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Clave simétrica para consultas H2H: siempre el mismo orden alfabético
function h2hKey(t1, t2) {
  return [slugify(t1), slugify(t2)].sort().join('_vs_');
}

function toInt(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// Escribe en lotes de 499 (límite Firestore: 500 ops/batch)
async function batchWrite(collection, docs) {
  const SIZE = 499;
  let total  = 0;
  for (let i = 0; i < docs.length; i += SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + SIZE);
    for (const { id, data } of chunk) {
      batch.set(db.collection(collection).doc(id), data);
    }
    await batch.commit();
    total += chunk.length;
    console.log(`  lote ${Math.ceil((i + 1) / SIZE)}: ${total}/${docs.length} documentos`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('⬇  Descargando CSVs desde GitHub...');
  const [resText, goalsText, shootText] = await Promise.all([
    fetchText(URLS.results),
    fetchText(URLS.goalscorers),
    fetchText(URLS.shootouts),
  ]);

  console.log('📄 Parseando...');
  const allResults   = parseCSV(resText);
  const allGoals     = parseCSV(goalsText);
  const allShootouts = parseCSV(shootText);

  // Solo partidos oficiales de Copa del Mundo
  const wcResults = allResults.filter((r) => r.tournament === 'FIFA World Cup');
  console.log(`⚽ Partidos de Copa del Mundo encontrados: ${wcResults.length}`);

  // Índice de goles por partido → "date_home_away"
  const goalIdx = {};
  for (const g of allGoals) {
    const k = `${g.date}_${g.home_team}_${g.away_team}`;
    if (!goalIdx[k]) goalIdx[k] = [];
    goalIdx[k].push({
      team:      g.team,
      scorer:    g.scorer,
      minute:    toInt(g.minute),
      own_goal:  g.own_goal === 'TRUE',
      penalty:   g.penalty  === 'TRUE',
    });
  }

  // Índice de penales por partido
  const shootIdx = {};
  for (const s of allShootouts) {
    shootIdx[`${s.date}_${s.home_team}_${s.away_team}`] = s.winner || null;
  }

  // Construir documentos Firestore
  const docs = wcResults.map((m) => {
    const matchKey   = `${m.date}_${m.home_team}_${m.away_team}`;
    const home_score = toInt(m.home_score);
    const away_score = toInt(m.away_score);
    const finished   = home_score !== null && away_score !== null;

    return {
      id: `${m.date}_${slugify(m.home_team)}_${slugify(m.away_team)}`,
      data: {
        date:            m.date,
        year:            toInt(m.date.substring(0, 4)),
        home_team:       m.home_team,
        away_team:       m.away_team,
        home_score,
        away_score,
        tournament:      m.tournament,
        city:            m.city,
        country:         m.country,
        neutral:         m.neutral === 'TRUE',
        finished,
        // Campos indexados para queries Firestore
        teams:           [m.home_team, m.away_team],  // array-contains
        h2h_key:         h2hKey(m.home_team, m.away_team),
        // Datos enriquecidos de otros CSVs
        goals:           goalIdx[matchKey] ?? [],
        shootout_winner: shootIdx[matchKey] ?? null,
      },
    };
  });

  console.log(`\n🔥 Importando a Firestore (colección: wc_matches)...`);
  await batchWrite('wc_matches', docs);

  console.log(`\n✅ Importación completa. ${docs.length} partidos en Firestore.`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
