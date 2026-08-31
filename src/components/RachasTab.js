import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import TeamLogo from './TeamLogo';
import { getH2H, getTeamLastMatches } from '../services/footballApi';
import { getFDHeadToHead } from '../services/footballDataApi';
import { COLORS } from '../utils/constants';

function getResult(match, teamId) {
  const isHome = match.teams.home.id === teamId;
  const won = (isHome && match.teams.home.winner) || (!isHome && match.teams.away.winner);
  const drew = !match.teams.home.winner && !match.teams.away.winner;
  return won ? 'W' : drew ? 'D' : 'L';
}

function FormBadge({ result }) {
  const bg = result === 'W' ? COLORS.primary : result === 'D' ? '#8B949E' : '#FF4C4C';
  const label = result === 'W' ? 'G' : result === 'D' ? 'E' : 'P';
  return (
    <View style={[styles.formBadge, { backgroundColor: bg }]}>
      <Text style={styles.formBadgeText}>{label}</Text>
    </View>
  );
}

function FormaSection({ team, matches }) {
  return (
    <View style={styles.formaSection}>
      <View style={styles.formaHeader}>
        <TeamLogo uri={team.logo} name={team.name} size={28} />
        <Text style={styles.formaTeamName} numberOfLines={1}>{team.name}</Text>
        <View style={styles.formaBadges}>
          {matches.length
            ? matches.map((m, i) => <FormBadge key={i} result={getResult(m, team.id)} />)
            : <Text style={styles.noDataText}>Sin datos</Text>
          }
        </View>
      </View>

      {matches.map((m) => {
        const isHome = m.teams.home.id === team.id;
        const opponent = isHome ? m.teams.away : m.teams.home;
        const result = getResult(m, team.id);
        const date = new Date(m.fixture.date).toLocaleDateString('es-MX', {
          day: '2-digit', month: 'short',
        });
        return (
          <View key={m.fixture.id} style={styles.formaMatchRow}>
            <FormBadge result={result} />
            <TeamLogo uri={opponent.logo} name={opponent.name} size={22} />
            <View style={styles.formaMatchInfo}>
              <Text style={styles.formaMatchOpp} numberOfLines={1}>{opponent.name}</Text>
              <Text style={styles.formaMatchLeague} numberOfLines={1}>{m.league.name}</Text>
            </View>
            <View style={styles.formaMatchScore}>
              <Text style={styles.formaScore}>{m.goals.home} - {m.goals.away}</Text>
              <Text style={styles.formaDate}>{date}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function calcH2HStats(matches, homeId) {
  let wins = 0, draws = 0, losses = 0;
  let totalGoals = 0, forGoals = 0;
  let btts = 0;

  for (const m of matches) {
    const isHome = m.teams.home.id === homeId;
    const gFor = isHome ? m.goals.home : m.goals.away;
    if (!m.teams.home.winner && !m.teams.away.winner) draws++;
    else if ((isHome && m.teams.home.winner) || (!isHome && m.teams.away.winner)) wins++;
    else losses++;
    totalGoals += (m.goals.home ?? 0) + (m.goals.away ?? 0);
    forGoals += gFor ?? 0;
    if ((m.goals.home ?? 0) > 0 && (m.goals.away ?? 0) > 0) btts++;
  }

  const n = matches.length || 1;
  return {
    wins, draws, losses,
    avgTotal: (totalGoals / n).toFixed(1),
    avgFor: (forGoals / n).toFixed(1),
    bttsRate: Math.round((btts / n) * 100),
    over25: matches.filter((m) => (m.goals.home + m.goals.away) > 2.5).length,
    over25Rate: Math.round((matches.filter((m) => (m.goals.home + m.goals.away) > 2.5).length / n) * 100),
  };
}

function WDLBar({ wins, draws, losses }) {
  const total = wins + draws + losses || 1;
  return (
    <View style={styles.wdlRow}>
      <View style={[styles.wdlSeg, { flex: wins / total, backgroundColor: COLORS.primary }]} />
      <View style={[styles.wdlSeg, { flex: draws / total, backgroundColor: '#8B949E' }]} />
      <View style={[styles.wdlSeg, { flex: losses / total, backgroundColor: '#FF4C4C' }]} />
    </View>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function RachasTab({ homeTeam, awayTeam, fdMatchId, source }) {
  const isFD = source === 'fd';
  const [h2h, setH2H] = useState([]);
  const [homeMatches, setHomeMatches] = useState([]);
  const [awayMatches, setAwayMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const h2hPromise = isFD && fdMatchId
      ? getFDHeadToHead(fdMatchId)
      : getH2H(homeTeam.id, awayTeam.id);

    const teamMatchesPromise = isFD
      ? Promise.resolve([[], []])  // Last matches via API-Football no compatible con IDs de FD
      : Promise.all([
          getTeamLastMatches(homeTeam.id, 6).catch(() => []),
          getTeamLastMatches(awayTeam.id, 6).catch(() => []),
        ]);

    Promise.all([h2hPromise, teamMatchesPromise])
      .then(([h, [hm, am]]) => {
        setH2H(h);
        setHomeMatches(hm ?? []);
        setAwayMatches(am ?? []);
        setError('');
      })
      .catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setLoading(false));
  }, [homeTeam.id, awayTeam.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando rachas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const h2hStats = h2h.length ? calcH2HStats(h2h, homeTeam.id) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Forma Local ── */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Forma reciente — Local</Text>
        <FormaSection team={homeTeam} matches={homeMatches} />
      </View>

      {/* ── Forma Visitante ── */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Forma reciente — Visitante</Text>
        <FormaSection team={awayTeam} matches={awayMatches} />
      </View>

      {/* ── H2H ── */}
      {h2hStats ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>
            H2H · Últimos {h2h.length} enfrentamientos
          </Text>

          <View style={styles.wdlLegend}>
            <Text style={[styles.wdlNum, { color: COLORS.primary }]}>{h2hStats.wins} G</Text>
            <Text style={[styles.wdlNum, { color: '#8B949E' }]}>{h2hStats.draws} E</Text>
            <Text style={[styles.wdlNum, { color: '#FF4C4C' }]}>{h2hStats.losses} P</Text>
          </View>
          <WDLBar wins={h2hStats.wins} draws={h2hStats.draws} losses={h2hStats.losses} />
          <Text style={styles.wdlCaption}>
            Desde la perspectiva de {homeTeam.name}
          </Text>

          <View style={styles.statsGrid}>
            <StatCard label="Promedio goles" value={h2hStats.avgTotal} sub="por partido" />
            <StatCard label="GF promedio" value={h2hStats.avgFor} sub={homeTeam.name.split(' ')[0]} />
            <StatCard label="Ambos marcan" value={`${h2hStats.bttsRate}%`} sub="de los partidos" />
            <StatCard label="Más de 2.5" value={`${h2hStats.over25Rate}%`} sub={`${h2hStats.over25}/${h2h.length} partidos`} />
          </View>

          {h2h.map((m) => {
            const result = getResult(m, homeTeam.id);
            const date = new Date(m.fixture.date).toLocaleDateString('es-MX', {
              day: '2-digit', month: 'short', year: '2-digit',
            });
            return (
              <View key={m.fixture.id} style={styles.h2hRow}>
                <FormBadge result={result} />
                <View style={styles.h2hInfo}>
                  <Text style={styles.h2hLeague} numberOfLines={1}>
                    {m.league.name} · {m.league.season}
                  </Text>
                  <Text style={styles.h2hTeams} numberOfLines={1}>
                    {m.teams.home.name} vs {m.teams.away.name}
                  </Text>
                </View>
                <View style={styles.h2hRight}>
                  <Text style={styles.h2hScore}>
                    {m.goals.home} - {m.goals.away}
                  </Text>
                  <Text style={styles.h2hDate}>{date}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sin historial de enfrentamientos.</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },

  sectionBlock: { paddingHorizontal: 14, paddingTop: 18, gap: 10 },
  sectionTitle: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },

  // Forma section
  formaSection: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  formaHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10,
  },
  formaLogo: { width: 28, height: 28, resizeMode: 'contain' },
  formaTeamName: { color: COLORS.text, fontSize: 13, fontWeight: '700', flex: 1 },
  formaBadges: { flexDirection: 'row', gap: 5 },
  formBadge: {
    width: 26, height: 26, borderRadius: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  formBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  noDataText: { color: COLORS.textMuted, fontSize: 12 },

  formaMatchRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  formaOppLogo: { width: 22, height: 22, resizeMode: 'contain' },
  formaMatchInfo: { flex: 1, gap: 2 },
  formaMatchOpp: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  formaMatchLeague: { color: COLORS.textMuted, fontSize: 11 },
  formaMatchScore: { alignItems: 'flex-end', gap: 2 },
  formaScore: { color: COLORS.text, fontSize: 14, fontWeight: 'bold' },
  formaDate: { color: COLORS.textMuted, fontSize: 11 },

  // H2H
  wdlLegend: { flexDirection: 'row', gap: 16 },
  wdlNum: { fontSize: 20, fontWeight: 'bold' },
  wdlRow: {
    flexDirection: 'row', height: 10, borderRadius: 5,
    overflow: 'hidden', gap: 2,
  },
  wdlSeg: { borderRadius: 5 },
  wdlCaption: { color: COLORS.textMuted, fontSize: 11 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14,
    flex: 1, minWidth: '45%', borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  statValue: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: COLORS.text, fontSize: 12 },
  statSub: { color: COLORS.textMuted, fontSize: 11 },

  h2hRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  h2hInfo: { flex: 1, gap: 3 },
  h2hLeague: { color: COLORS.textMuted, fontSize: 11 },
  h2hTeams: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  h2hRight: { alignItems: 'flex-end', gap: 3 },
  h2hScore: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  h2hDate: { color: COLORS.textMuted, fontSize: 11 },
});
