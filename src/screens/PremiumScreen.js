import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeMatch } from '../services/groqApi';
import { getFixtureStats, getH2H } from '../services/footballApi';
import { COLORS } from '../utils/constants';
import TeamLogo from '../components/TeamLogo';

const CONFIANZA_COLOR = {
  'Alta': COLORS.primary,
  'Media': '#FFD700',
  'Baja': '#FF4C4C',
};

const VALOR_COLOR = {
  'Alto': COLORS.primary,
  'Medio': '#FFD700',
  'Bajo': '#8B949E',
};

function ProbabilityBar({ value }) {
  return (
    <View style={styles.probContainer}>
      <View style={styles.probBg}>
        <View style={[styles.probFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.probText}>{value}%</Text>
    </View>
  );
}

function MercadoCard({ item }) {
  return (
    <View style={styles.mercadoCard}>
      <View style={styles.mercadoHeader}>
        <Text style={styles.mercadoNombre}>{item.mercado}</Text>
        <View style={[styles.confianzaBadge, { backgroundColor: CONFIANZA_COLOR[item.confianza] ?? COLORS.border }]}>
          <Text style={styles.confianzaText}>{item.confianza}</Text>
        </View>
      </View>
      <Text style={styles.mercadoPrediccion}>{item.prediccion}</Text>
      <ProbabilityBar value={item.probabilidad} />
      <Text style={styles.mercadoRazon}>{item.razon}</Text>
    </View>
  );
}

function ValueBetCard({ item }) {
  return (
    <View style={styles.valueBetCard}>
      <View style={styles.valueBetHeader}>
        <Text style={styles.valueBetIcon}>🎯</Text>
        <Text style={styles.valueBetApuesta}>{item.apuesta}</Text>
        <View style={[styles.valorBadge, { borderColor: VALOR_COLOR[item.valor] ?? COLORS.border }]}>
          <Text style={[styles.valorText, { color: VALOR_COLOR[item.valor] ?? COLORS.textMuted }]}>
            {item.valor}
          </Text>
        </View>
      </View>
      <Text style={styles.valueBetRazon}>{item.razon}</Text>
    </View>
  );
}

export default function PremiumScreen({ route }) {
  const fixture = route?.params?.fixture;
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    if (!fixture) return;
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const [stats, h2h] = await Promise.all([
        getFixtureStats(fixture.fixture.id).catch(() => []),
        getH2H(fixture.teams.home.id, fixture.teams.away.id).catch(() => []),
      ]);

      const result = await analyzeMatch({
        homeTeam: fixture.teams.home,
        awayTeam: fixture.teams.away,
        league: fixture.league,
        stats,
        h2h,
      });

      setAnalysis(result);
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!fixture) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>Análisis Premium con IA</Text>
          <Text style={styles.emptyText}>
            Abre un partido desde la pantalla de Partidos y toca el botón
            "Análisis IA" para obtener predicciones y Value Bets.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { teams, league } = fixture;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header del partido */}
        <View style={styles.matchHeader}>
          <TeamLogo uri={teams.home.logo} name={teams.home.name} size={40} />
          <View style={styles.matchMid}>
            <Text style={styles.leagueText}>{league.name}</Text>
            <Text style={styles.vsText}>{teams.home.name} vs {teams.away.name}</Text>
          </View>
          <TeamLogo uri={teams.away.logo} name={teams.away.name} size={40} />
        </View>

        {/* Botón de análisis */}
        {!analysis && !loading && (
          <View style={styles.analyzeSection}>
            <Text style={styles.analyzeDesc}>
              La IA analizará las estadísticas del partido y el historial H2H
              para identificar Value Bets y generar predicciones por mercado.
            </Text>
            <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze}>
              <Text style={styles.analyzeBtnText}>✨ Generar Análisis IA</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Analizando el partido con IA...</Text>
            <Text style={styles.loadingSub}>Esto puede tomar unos segundos</Text>
          </View>
        )}

        {/* Resultado */}
        {analysis && (
          <View style={styles.results}>

            {/* Resumen */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen del Partido</Text>
              <View style={styles.resumenCard}>
                <Text style={styles.resumenText}>{analysis.resumen}</Text>
              </View>
            </View>

            {/* Value Bets */}
            {analysis.valueBets?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Value Bets Detectadas</Text>
                {analysis.valueBets.map((vb, i) => (
                  <ValueBetCard key={i} item={vb} />
                ))}
              </View>
            )}

            {/* Mercados */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Análisis por Mercado</Text>
              {analysis.mercados?.map((m, i) => (
                <MercadoCard key={i} item={m} />
              ))}
            </View>

            {/* Regenerar */}
            <TouchableOpacity style={styles.regenBtn} onPress={handleAnalyze}>
              <Text style={styles.regenText}>↺ Regenerar análisis</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40 },

  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    gap: 12,
  },
  teamLogo: { width: 40, height: 40, resizeMode: 'contain' },
  matchMid: { flex: 1, alignItems: 'center', gap: 4 },
  leagueText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  vsText: { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  analyzeSection: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  analyzeDesc: {
    color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  analyzeBtn: {
    backgroundColor: COLORS.premium,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  analyzeBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: COLORS.danger, fontSize: 13, textAlign: 'center' },

  loadingSection: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  loadingText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  loadingSub: { color: COLORS.textMuted, fontSize: 13 },

  results: { gap: 24 },
  section: { gap: 10 },
  sectionTitle: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  resumenCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  resumenText: { color: COLORS.text, fontSize: 14, lineHeight: 22 },

  mercadoCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  mercadoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mercadoNombre: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', flex: 1 },
  confianzaBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  confianzaText: { color: '#000', fontSize: 11, fontWeight: 'bold' },
  mercadoPrediccion: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  probContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  probBg: {
    flex: 1, height: 6, backgroundColor: COLORS.border,
    borderRadius: 3, overflow: 'hidden',
  },
  probFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  probText: { color: COLORS.text, fontSize: 13, fontWeight: 'bold', width: 36 },
  mercadoRazon: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

  valueBetCard: {
    backgroundColor: '#0D2B1A', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.primary, gap: 6,
  },
  valueBetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueBetIcon: { fontSize: 16 },
  valueBetApuesta: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', flex: 1 },
  valorBadge: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  valorText: { fontSize: 11, fontWeight: 'bold' },
  valueBetRazon: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

  regenBtn: {
    alignItems: 'center', paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
  },
  regenText: { color: COLORS.textMuted, fontSize: 14 },
});
