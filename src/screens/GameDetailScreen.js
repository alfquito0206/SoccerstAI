import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import TeamLogo from '../components/TeamLogo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFixtureStats } from '../services/footballApi';
import { getMatchOdds } from '../services/oddsApi';
import StatRow from '../components/StatRow';
import RachasTab from '../components/RachasTab';
import { COLORS } from '../utils/constants';

const TABS = ['Goles', 'Córners', 'Tarjetas', 'Rachas'];

const STAT_MAP = {
  Goles: [
    { key: 'Total Shots',      label: 'Tiros totales' },
    { key: 'Shots on Goal',    label: 'Al arco' },
    { key: 'Shots insidebox',  label: 'Dentro del área' },
    { key: 'Ball Possession',  label: 'Posesión' },
    { key: 'expected_goals',   label: 'xG (Goles esperados)' },
    { key: 'Goalkeeper Saves', label: 'Atajadas' },
  ],
  Córners: [
    { key: 'Corner Kicks',    label: 'Córners' },
    { key: 'Total Shots',     label: 'Tiros totales' },
    { key: 'Shots insidebox', label: 'Tiros dentro del área' },
    { key: 'Offsides',        label: 'Fueras de lugar' },
    { key: 'Total passes',    label: 'Pases totales' },
    { key: 'Passes accurate', label: 'Pases precisos' },
  ],
  Tarjetas: [
    { key: 'Yellow Cards', label: 'Tarjetas amarillas' },
    { key: 'Red Cards',    label: 'Tarjetas rojas' },
    { key: 'Fouls',        label: 'Faltas cometidas' },
    { key: 'Offsides',     label: 'Fueras de lugar' },
  ],
};

function getStat(stats, teamIdx, key) {
  if (!stats?.[teamIdx]) return null;
  const found = stats[teamIdx].statistics.find((s) => s.type === key);
  return found?.value ?? null;
}

function StatsTab({ tab, stats, teams }) {
  const statList = STAT_MAP[tab];
  if (!statList) return null;

  if (!stats || stats.length < 2) {
    return (
      <View style={styles.noStats}>
        <Text style={styles.noStatsText}>
          Estadísticas disponibles solo para partidos finalizados o en vivo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.teamHeaders}>
        <View style={styles.teamHeaderCol}>
          <TeamLogo uri={teams.home.logo} name={teams.home.name} size={20} />
          <Text style={styles.teamHeaderName} numberOfLines={1}>{teams.home.name}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={[styles.teamHeaderCol, styles.teamHeaderRight]}>
          <TeamLogo uri={teams.away.logo} name={teams.away.name} size={20} />
          <Text style={styles.teamHeaderName} numberOfLines={1}>{teams.away.name}</Text>
        </View>
      </View>

      {statList.map(({ key, label }) => (
        <StatRow
          key={key}
          label={label}
          home={getStat(stats, 0, key)}
          away={getStat(stats, 1, key)}
        />
      ))}
    </ScrollView>
  );
}


// Convierte cuota decimal a probabilidad implícita
function oddsToProb(odd) {
  if (!odd) return null;
  return Math.round((1 / odd) * 100);
}

function OddsCard({ odds, teams }) {
  if (!odds?.h2h) return null;
  const { h2h, totals, bookmaker } = odds;
  const over25 = totals.find((t) => t.name === 'Over' && t.point === 2.5);
  const under25 = totals.find((t) => t.name === 'Under' && t.point === 2.5);

  return (
    <View style={styles.oddsCard}>
      <Text style={styles.oddsTitle}>Cuotas · {bookmaker}</Text>

      <View style={styles.oddsRow}>
        <View style={styles.oddsItem}>
          <Text style={styles.oddsTeam} numberOfLines={1}>{teams.home.name}</Text>
          <Text style={styles.oddsValue}>{h2h.home?.toFixed(2) ?? '—'}</Text>
          <Text style={styles.oddsProb}>{oddsToProb(h2h.home) ?? '—'}%</Text>
        </View>
        <View style={[styles.oddsItem, styles.oddsItemCenter]}>
          <Text style={styles.oddsTeam}>Empate</Text>
          <Text style={styles.oddsValue}>{h2h.draw?.toFixed(2) ?? '—'}</Text>
          <Text style={styles.oddsProb}>{oddsToProb(h2h.draw) ?? '—'}%</Text>
        </View>
        <View style={[styles.oddsItem, styles.oddsItemRight]}>
          <Text style={styles.oddsTeam} numberOfLines={1}>{teams.away.name}</Text>
          <Text style={styles.oddsValue}>{h2h.away?.toFixed(2) ?? '—'}</Text>
          <Text style={styles.oddsProb}>{oddsToProb(h2h.away) ?? '—'}%</Text>
        </View>
      </View>

      {(over25 || under25) && (
        <View style={styles.oddsOverUnder}>
          <Text style={styles.oddsOU}>Over 2.5: <Text style={styles.oddsOUVal}>{over25?.price?.toFixed(2) ?? '—'}</Text></Text>
          <Text style={styles.oddsOU}>Under 2.5: <Text style={styles.oddsOUVal}>{under25?.price?.toFixed(2) ?? '—'}</Text></Text>
        </View>
      )}
    </View>
  );
}

export default function GameDetailScreen({ route, navigation }) {
  const { fixture } = route.params ?? {};
  const isFDMatch = fixture?._source === 'fd';
  const [activeTab, setActiveTab] = useState('Goles');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [odds, setOdds] = useState(null);

  useEffect(() => {
    if (!fixture) return;

    // Stats: solo para partidos de API-Football en curso o finalizados
    if (!isFDMatch) {
      const status = fixture.fixture.status.short;
      const hasStats = ['1H', '2H', 'HT', 'FT', 'AET', 'PEN', 'LIVE'].includes(status);
      if (hasStats) {
        setLoadingStats(true);
        getFixtureStats(fixture.fixture.id)
          .then(setStats)
          .catch(() => setStats(null))
          .finally(() => setLoadingStats(false));
      }
    }

    // Odds: para cualquier partido (FD o API-Football)
    const compCode = fixture.league?.code ?? fixture.league?.name?.substring(0, 2).toUpperCase();
    getMatchOdds(
      compCode,
      fixture.teams.home.name,
      fixture.teams.away.name,
      fixture.fixture.date,
    ).then(setOdds).catch(() => setOdds(null));
  }, [fixture]);

  if (!fixture) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Partido no encontrado.</Text>
      </View>
    );
  }

  const { teams, goals, league, fixture: f } = fixture;
  const finished = ['FT', 'AET', 'PEN'].includes(f.status.short);
  const live = ['1H', '2H', 'HT', 'LIVE'].includes(f.status.short);
  const time = new Date(f.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Hero del partido */}
      <View style={styles.hero}>
        <Text style={styles.leagueName}>{league.name}</Text>
        <Text style={styles.leagueRound}>{league.round}</Text>

        <View style={styles.matchRow}>
          <TouchableOpacity
            style={styles.teamCol}
            onPress={() => navigation.navigate('TeamDetail', {
              team: teams.home,
              leagueId: league.id,
              season: league.season,
              source: fixture._source,
            })}
          >
            <TeamLogo uri={teams.home.logo} name={teams.home.name} size={52} />
            <Text style={styles.teamName} numberOfLines={2}>{teams.home.name}</Text>
          </TouchableOpacity>

          <View style={styles.scoreCol}>
            {finished || live ? (
              <>
                <Text style={[styles.score, live && styles.scoreLive]}>
                  {goals.home ?? 0} - {goals.away ?? 0}
                </Text>
                {live && (
                  <Text style={styles.elapsed}>🔴 {f.status.elapsed}'</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.score}>{time}</Text>
                <Text style={styles.scheduledLabel}>Por jugar</Text>
              </>
            )}
            <Text style={styles.statusText}>{f.status.long}</Text>
          </View>

          <TouchableOpacity
            style={[styles.teamCol, styles.teamRight]}
            onPress={() => navigation.navigate('TeamDetail', {
              team: teams.away,
              leagueId: league.id,
              season: league.season,
              source: fixture._source,
            })}
          >
            <TeamLogo uri={teams.away.logo} name={teams.away.name} size={52} />
            <Text style={styles.teamName} numberOfLines={2}>{teams.away.name}</Text>
          </TouchableOpacity>
        </View>

        {/* Cuotas en vivo */}
        {odds && <OddsCard odds={odds} teams={teams} />}

        {/* Botón Premium IA */}
        <TouchableOpacity
          style={styles.premiumBtn}
          onPress={() => navigation.navigate('PremiumAnalysis', { fixture, odds })}
        >
          <Text style={styles.premiumBtnText}>✨ Análisis IA</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
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

      {/* Contenido del tab */}
      {loadingStats ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : activeTab === 'Rachas' ? (
        <RachasTab
          homeTeam={teams.home}
          awayTeam={teams.away}
          fdMatchId={fixture._fdMatchId}
          source={fixture._source}
        />
      ) : (
        <StatsTab tab={activeTab} stats={stats} teams={teams} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: COLORS.danger },

  hero: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  leagueName: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  leagueRound: { color: COLORS.textMuted, fontSize: 11, marginBottom: 14 },
  matchRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  teamCol: { flex: 1, alignItems: 'center', gap: 8 },
  teamRight: { alignItems: 'center' },
  teamLogo: { width: 52, height: 52, resizeMode: 'contain' },
  teamName: { color: COLORS.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  scoreCol: { alignItems: 'center', paddingHorizontal: 8 },
  score: { color: COLORS.text, fontSize: 30, fontWeight: 'bold' },
  scoreLive: { color: COLORS.primary },
  elapsed: { color: '#FF4C4C', fontSize: 12, fontWeight: 'bold' },
  scheduledLabel: { color: COLORS.textMuted, fontSize: 11 },
  statusText: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },

  premiumBtn: {
    marginTop: 12,
    backgroundColor: COLORS.premium,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  premiumBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },

  tabContent: { flex: 1 },
  teamHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  teamHeaderCol: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 2 },
  teamHeaderRight: { justifyContent: 'flex-end' },
  teamLogoSm: { width: 20, height: 20, resizeMode: 'contain' },
  teamHeaderName: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },

  noStats: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  noStatsText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  oddsCard: {
    marginTop: 12, width: '100%',
    backgroundColor: '#0A1F0A', borderRadius: 10,
    borderWidth: 1, borderColor: `${COLORS.primary}40`, padding: 12, gap: 8,
  },
  oddsTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  oddsRow: { flexDirection: 'row' },
  oddsItem: { flex: 1, alignItems: 'flex-start', gap: 2 },
  oddsItemCenter: { alignItems: 'center' },
  oddsItemRight: { alignItems: 'flex-end' },
  oddsTeam: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  oddsValue: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  oddsProb: { color: COLORS.textMuted, fontSize: 11 },
  oddsOverUnder: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  oddsOU: { color: COLORS.textMuted, fontSize: 12 },
  oddsOUVal: { color: COLORS.text, fontWeight: 'bold' },
});
