import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getFixturesByDate } from '../services/footballApi';
import MatchCard from '../components/MatchCard';
import LeagueHeader from '../components/LeagueHeader';
import FilterBar from '../components/FilterBar';
import { COLORS } from '../utils/constants';

// ── Ligas target ─────────────────────────────────────────────────────────────

const TARGET_LEAGUES = [
  { id: 262, name: 'Liga MX',          country: 'Mexico'  },
  { id: 39,  name: 'Premier League',   country: 'England' },
  { id: 140, name: 'La Liga',          country: 'Spain'   },
  { id: 2,   name: 'Champions League', country: 'Europe'  },
];
const TARGET_IDS = TARGET_LEAGUES.map((l) => l.id);

// ── Status helpers ────────────────────────────────────────────────────────────

const LIVE_STATUSES     = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];
const UPCOMING_STATUSES = ['NS', 'TBD'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

function getFixtureStatus(f) {
  const s = f.fixture.status.short;
  if (LIVE_STATUSES.includes(s))     return 'live';
  if (UPCOMING_STATUSES.includes(s)) return 'upcoming';
  if (FINISHED_STATUSES.includes(s)) return 'finished';
  return 'other';
}

function applyFilters(fixtures, statusFilter, leagueId) {
  const byLeague = leagueId !== null
    ? fixtures.filter((f) => f.league.id === leagueId)
    : fixtures.filter((f) => TARGET_IDS.includes(f.league.id));

  if (statusFilter === 'all') return byLeague;
  return byLeague.filter((f) => getFixtureStatus(f) === statusFilter);
}

function buildSections(fixtures) {
  const map = {};
  for (const f of fixtures) {
    const id = f.league.id;
    if (!map[id]) map[id] = { league: f.league, data: [] };
    map[id].data.push(f);
  }

  return TARGET_IDS
    .filter((id) => map[id])
    .map((id) => ({
      ...map[id],
      isTarget: true,
      data: [...map[id].data].sort((a, b) => a.fixture.timestamp - b.fixture.timestamp),
    }));
}

function countByFilter(fixtures, leagueId) {
  const scoped = leagueId !== null
    ? fixtures.filter((f) => f.league.id === leagueId)
    : fixtures.filter((f) => TARGET_IDS.includes(f.league.id));

  return {
    all:      scoped.length,
    live:     scoped.filter((f) => getFixtureStatus(f) === 'live').length,
    upcoming: scoped.filter((f) => getFixtureStatus(f) === 'upcoming').length,
    finished: scoped.filter((f) => getFixtureStatus(f) === 'finished').length,
  };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAYS_SHORT   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayStr() { return toDateStr(new Date()); }

function buildDateRange() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 15 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i - 1);
    return d;
  });
}

function formatHeaderDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── LeagueStrip ───────────────────────────────────────────────────────────────

function LeagueStrip({ selected, onSelect }) {
  const items = [{ id: null, name: 'Todas' }, ...TARGET_LEAGUES];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={leagueStyles.strip}
      contentContainerStyle={leagueStyles.content}
    >
      {items.map((l) => {
        const active = l.id === selected;
        return (
          <TouchableOpacity
            key={String(l.id)}
            style={[leagueStyles.chip, active && leagueStyles.chipActive]}
            onPress={() => onSelect(l.id)}
          >
            <Text style={[leagueStyles.label, active && leagueStyles.labelActive]}>
              {l.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const leagueStyles = StyleSheet.create({
  strip:     { backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  content:   { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip:      { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipActive:  { borderColor: COLORS.primary, backgroundColor: '#00230F' },
  label:       { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  labelActive: { color: COLORS.primary },
});

// ── DateStrip ─────────────────────────────────────────────────────────────────

function DateStrip({ selectedDate, onSelect }) {
  const today = todayStr();
  const dates = useMemo(() => buildDateRange(), []);

  const getTopLabel = (date) => {
    const diff = Math.round((date - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (diff === 0)  return 'HOY';
    if (diff === -1) return 'AYER';
    if (diff === 1)  return 'MAÑ';
    return DAYS_SHORT[date.getDay()].toUpperCase();
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={stripStyles.strip}
      contentContainerStyle={stripStyles.content}
    >
      {dates.map((date) => {
        const dateStr = toDateStr(date);
        const isSelected = dateStr === selectedDate;
        const isToday = dateStr === today;

        return (
          <TouchableOpacity
            key={dateStr}
            style={[
              stripStyles.chip,
              isSelected && stripStyles.chipActive,
              isToday && !isSelected && stripStyles.chipToday,
            ]}
            onPress={() => onSelect(dateStr)}
          >
            <Text style={[stripStyles.chipLabel, isSelected && stripStyles.chipLabelActive]}>
              {getTopLabel(date)}
            </Text>
            <Text style={[stripStyles.chipNum, isSelected && stripStyles.chipNumActive]}>
              {date.getDate()}
            </Text>
            <Text style={[stripStyles.chipMonth, isSelected && stripStyles.chipLabelActive]}>
              {MONTHS_SHORT[date.getMonth()].toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const stripStyles = StyleSheet.create({
  strip:   { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  content: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  chip: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 58,
    gap: 1,
  },
  chipActive:      { borderColor: COLORS.primary, backgroundColor: '#00230F' },
  chipToday:       { borderColor: '#2A3A2F' },
  chipLabel:       { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  chipLabelActive: { color: COLORS.primary },
  chipNum:         { color: COLORS.text, fontSize: 20, fontWeight: 'bold', lineHeight: 26 },
  chipNumActive:   { color: COLORS.primary },
  chipMonth:       { color: COLORS.textMuted, fontSize: 10 },
});

// ── HomeScreen ────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { logout } = useAuth();
  const [selectedDate, setSelectedDate]     = useState(todayStr);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [allFixtures, setAllFixtures]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState('');
  const [activeFilter, setActiveFilter]     = useState('all');

  const loadFixtures = useCallback(async (date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getFixturesByDate(date);
      setAllFixtures(data ?? []);
    } catch {
      setError('No se pudieron cargar los partidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setAllFixtures([]);
    setActiveFilter('all');
    loadFixtures(selectedDate);
  }, [selectedDate]);

  const counts   = useMemo(() => countByFilter(allFixtures, selectedLeague), [allFixtures, selectedLeague]);
  const filtered = useMemo(() => applyFilters(allFixtures, activeFilter, selectedLeague), [allFixtures, activeFilter, selectedLeague]);
  const sections = useMemo(() => buildSections(filtered), [filtered]);

  const headerDate = formatHeaderDate(selectedDate);
  const isToday = selectedDate === todayStr();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      <View style={styles.header}>
        <View>
          <Text style={styles.dateText} numberOfLines={1}>
            {isToday ? `Hoy · ${headerDate}` : headerDate}
          </Text>
          {!loading && (
            <Text style={styles.countText}>
              {sections.length} ligas · {filtered.length} partidos
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <LeagueStrip selected={selectedLeague} onSelect={setSelectedLeague} />
      <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
      <FilterBar active={activeFilter} onChange={setActiveFilter} counts={counts} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando partidos...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFixtures(selectedDate)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.fixture.id)}
          renderItem={({ item }) => (
            <MatchCard
              fixture={item}
              onPress={() => navigation.navigate('GameDetail', { fixture: item })}
            />
          )}
          renderSectionHeader={({ section }) => (
            <LeagueHeader
              league={section.league}
              count={section.data.length}
              highlight={section.isTarget}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFixtures(selectedDate, true)}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {activeFilter === 'live'     ? 'No hay partidos en vivo ahora.' :
                 activeFilter === 'upcoming' ? 'No hay partidos por jugar.'     :
                 activeFilter === 'finished' ? 'No hay partidos finalizados.'   :
                 'No hay partidos de estas ligas para este día.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateText:    { color: COLORS.text, fontSize: 15, fontWeight: 'bold', textTransform: 'capitalize', maxWidth: 260 },
  countText:   { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  logoutBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  logoutText:  { color: COLORS.textMuted, fontSize: 13 },
  list:        { paddingBottom: 24 },
  loadingText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
  errorText:   { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText:   { color: '#000', fontWeight: 'bold' },
  emptyText:   { color: COLORS.textMuted, fontSize: 15 },
});
