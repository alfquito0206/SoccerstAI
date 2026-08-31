import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import TeamLogo from '../components/TeamLogo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTeamLastMatches, getTeamStats, getTeamSquad, searchNationalTeam } from '../services/footballApi';
import { getFDTeamMatches, getFDTeamSquad } from '../services/footballDataApi';
import { COLORS } from '../utils/constants';

const TABS = ['Últimos 6', 'Temporada', 'Plantilla'];

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
const POSITION_LABELS = {
  Goalkeeper: 'Porteros',
  Defender: 'Defensas',
  Midfielder: 'Centrocampistas',
  Attacker: 'Delanteros',
};

function FormBadge({ result }) {
  const bg = result === 'W' ? COLORS.primary : result === 'D' ? '#8B949E' : '#FF4C4C';
  const label = result === 'W' ? 'G' : result === 'D' ? 'E' : 'P';
  return (
    <View style={[styles.formBadge, { backgroundColor: bg }]}>
      <Text style={styles.formBadgeText}>{label}</Text>
    </View>
  );
}

function getResult(match, teamId) {
  const isHome = match.teams.home.id === teamId;
  const won = (isHome && match.teams.home.winner) || (!isHome && match.teams.away.winner);
  const drew = !match.teams.home.winner && !match.teams.away.winner;
  return won ? 'W' : drew ? 'D' : 'L';
}

function UltimosPartidosTab({ matches, teamId }) {
  if (!matches.length) {
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyText}>Sin partidos disponibles.</Text>
      </View>
    );
  }

  const finished = matches.filter((m) => m.fixture.status.short === 'FT');
  const formResults = finished.map((m) => getResult(m, teamId));
  const hasFinished = finished.length > 0;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPad}>

      {/* Forma visual solo si hay partidos jugados */}
      {hasFinished && (
        <View style={styles.formaRow}>
          <Text style={styles.formaLabel}>Forma reciente</Text>
          <View style={styles.formaBadges}>
            {formResults.map((r, i) => <FormBadge key={i} result={r} />)}
          </View>
        </View>
      )}

      {!hasFinished && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Próximos partidos del torneo</Text>
        </View>
      )}

      {/* Lista de partidos */}
      <View style={styles.matchList}>
        {matches.map((m) => {
          const isHome = m.teams.home.id === teamId;
          const opponent = isHome ? m.teams.away : m.teams.home;
          const isScheduled = ['NS', 'TIMED', 'SCHEDULED'].includes(m.fixture.status.short);
          const result = !isScheduled ? getResult(m, teamId) : null;
          const date = new Date(m.fixture.date).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: '2-digit',
          });
          const time = new Date(m.fixture.date).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit',
          });

          return (
            <View key={m.fixture.id} style={styles.matchRow}>
              {result
                ? <FormBadge result={result} />
                : <View style={styles.scheduledDot} />
              }
              <TeamLogo uri={opponent.logo} name={opponent.name} size={28} />
              <View style={styles.matchInfo}>
                <Text style={styles.matchOpponent} numberOfLines={1}>
                  {isHome ? 'vs' : 'en'} {opponent.name}
                </Text>
                <Text style={styles.matchLeague} numberOfLines={1}>
                  {m.league.name} · {m.league.season}
                </Text>
              </View>
              <View style={styles.matchRight}>
                {isScheduled ? (
                  <Text style={styles.matchTime}>{time}</Text>
                ) : (
                  <Text style={styles.matchScore}>
                    {m.goals.home ?? 0} - {m.goals.away ?? 0}
                  </Text>
                )}
                <Text style={styles.matchDate}>{date}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function TemporadaTab({ stats }) {
  if (!stats) {
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyText}>Estadísticas de temporada no disponibles.</Text>
      </View>
    );
  }

  const { fixtures, goals, clean_sheet, form } = stats;
  const formStr = (form ?? '').split('').slice(-6);
  const n = fixtures.played.total || 1;
  const over25 = stats.goals?.for?.total?.total != null
    ? null
    : null;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ ...styles.tabPad, paddingBottom: 32 }}>

      {/* Forma */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Forma reciente</Text>
        <View style={styles.formaBadges}>
          {formStr.map((r, i) => <FormBadge key={i} result={r} />)}
        </View>
      </View>

      {/* Registro general */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registro en la temporada</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Jugados" value={fixtures.played.total} />
          <StatCard label="Ganados" value={fixtures.wins.total} />
          <StatCard label="Empates" value={fixtures.draws.total} />
          <StatCard label="Perdidos" value={fixtures.loses.total} />
        </View>
      </View>

      {/* Goles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goles</Text>
        <View style={styles.statsGrid}>
          <StatCard label="GF promedio" value={goals.for.average.total} sub="por partido" />
          <StatCard label="GC promedio" value={goals.against.average.total} sub="por partido" />
          <StatCard label="GF total" value={goals.for.total.total} />
          <StatCard label="Portería a 0" value={clean_sheet.total} />
        </View>
      </View>

      {/* Local vs Visitante */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local vs Visitante</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableHeaderCell} />
            <Text style={styles.tableHeaderCell}>Local</Text>
            <Text style={styles.tableHeaderCell}>Visitante</Text>
            <Text style={styles.tableHeaderCell}>Total</Text>
          </View>
          {[
            { label: 'Jugados',  h: fixtures.played.home,  a: fixtures.played.away,  t: fixtures.played.total },
            { label: 'Ganados',  h: fixtures.wins.home,    a: fixtures.wins.away,    t: fixtures.wins.total },
            { label: 'Empates',  h: fixtures.draws.home,   a: fixtures.draws.away,   t: fixtures.draws.total },
            { label: 'Perdidos', h: fixtures.loses.home,   a: fixtures.loses.away,   t: fixtures.loses.total },
            { label: 'GF prom.', h: goals.for.average.home,     a: goals.for.average.away,     t: goals.for.average.total },
            { label: 'GC prom.', h: goals.against.average.home, a: goals.against.average.away, t: goals.against.average.total },
            { label: 'Portería 0', h: clean_sheet.home, a: clean_sheet.away, t: clean_sheet.total },
          ].map(({ label, h, a, t }) => (
            <View key={label} style={styles.tableRow}>
              <Text style={styles.tableCell}>{label}</Text>
              <Text style={styles.tableStat}>{h ?? '—'}</Text>
              <Text style={styles.tableStat}>{a ?? '—'}</Text>
              <Text style={[styles.tableStat, styles.tableTotal]}>{t ?? '—'}</Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

function PlantillaTab({ squad }) {
  const players = squad?.[0]?.players ?? [];

  if (!players.length) {
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptyText}>Plantilla no disponible.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{ ...styles.tabPad, paddingBottom: 32 }}>
      {POSITIONS.map((pos) => {
        const group = players.filter((p) => p.position === pos);
        if (!group.length) return null;
        return (
          <View key={pos} style={styles.section}>
            <Text style={styles.sectionTitle}>{POSITION_LABELS[pos]}</Text>
            {group.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                {player.photo
                  ? <Image source={{ uri: player.photo }} style={styles.playerPhoto} />
                  : (
                    <View style={styles.playerInitials}>
                      <Text style={styles.playerInitialsText}>
                        {(player.name ?? '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )
                }
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerMeta}>
                    {player.age ? `${player.age} años` : ''}
                    {player.number ? ` · #${player.number}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function TeamScreen({ route }) {
  const { team, leagueId, season, source } = route.params ?? {};
  const isFD = source === 'fd';
  const [activeTab, setActiveTab] = useState('Últimos 6');
  const [matches, setMatches] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!team) return;
    setLoading(true);

    const loadData = async () => {
      if (isFD) {
        // Para equipos del Mundial: buscar ID en API-Football por nombre
        // para obtener historial real; plantilla viene de football-data.org
        const [afTeam, sq] = await Promise.all([
          searchNationalTeam(team.name).catch(() => null),
          getFDTeamSquad(team.id).catch(() => null),
        ]);

        const [matches, stats] = await Promise.all([
          afTeam
            ? getTeamLastMatches(afTeam.id, 6).catch(() => [])
            : [],
          afTeam
            ? getTeamStats(afTeam.id, 1, 2024).catch(() => null) // Liga 1 = WC qualifier en AF
            : null,
        ]);

        return [matches, stats, sq];
      } else {
        return Promise.all([
          getTeamLastMatches(team.id, 6).catch(() => []),
          getTeamStats(team.id, leagueId, season).catch(() => null),
          getTeamSquad(team.id).catch(() => null),
        ]);
      }
    };

    loadData()
      .then(([m, s, sq]) => {
        setMatches(m);
        setTeamStats(s);
        setSquad(sq);
        setError('');
      })
      .catch(() => setError('No se pudieron cargar los datos del equipo.'))
      .finally(() => setLoading(false));
  }, [team?.id]);

  if (!team) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Equipo no encontrado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* Header */}
      <View style={styles.teamHeader}>
        <TeamLogo uri={team.logo} name={team.name} size={52} />
        <View style={styles.teamHeaderInfo}>
          <Text style={styles.teamName}>{team.name}</Text>
          {season ? <Text style={styles.teamSeason}>Temporada {season}</Text> : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {activeTab === 'Últimos 6'  && <UltimosPartidosTab matches={matches} teamId={team.id} />}
          {activeTab === 'Temporada'  && <TemporadaTab stats={teamStats} />}
          {activeTab === 'Plantilla'  && <PlantillaTab squad={squad} />}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center' },

  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 14,
  },
  teamLogo: { width: 52, height: 52, resizeMode: 'contain' },
  teamHeaderInfo: { flex: 1, gap: 4 },
  teamName: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  teamSeason: { color: COLORS.textMuted, fontSize: 13 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },

  tabContent: { flex: 1 },
  tabPad: { padding: 12 },

  formaRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    marginBottom: 4,
  },
  formaLabel: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  formaBadges: { flexDirection: 'row', gap: 6 },
  formBadge: {
    width: 30, height: 30, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  formBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

  matchList: { gap: 8, marginTop: 8 },
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  opponentLogo: { width: 28, height: 28, resizeMode: 'contain' },
  matchInfo: { flex: 1, gap: 3 },
  matchOpponent: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  matchLeague: { color: COLORS.textMuted, fontSize: 11 },
  matchRight: { alignItems: 'flex-end', gap: 3 },
  matchScore: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  matchDate: { color: COLORS.textMuted, fontSize: 11 },
  matchTime: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
  scheduledDot: {
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  infoBox: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 8, padding: 10, marginBottom: 4,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  infoText: { color: COLORS.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  section: { gap: 10, marginBottom: 8 },
  sectionTitle: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14,
    flex: 1, minWidth: '45%', borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  statValue: { color: COLORS.primary, fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: COLORS.text, fontSize: 12 },
  statSub: { color: COLORS.textMuted, fontSize: 11 },

  table: {
    backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableHeader: { backgroundColor: '#1C2128' },
  tableHeaderCell: { flex: 1, color: COLORS.primary, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  tableCell: { flex: 1.6, color: COLORS.textMuted, fontSize: 13 },
  tableStat: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tableTotal: { color: COLORS.primary },

  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  playerPhoto: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.border },
  playerInitials: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1A3A2A',
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  playerInitialsText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
  playerInfo: { flex: 1, gap: 3 },
  playerName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  playerMeta: { color: COLORS.textMuted, fontSize: 12 },

  emptySection: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
