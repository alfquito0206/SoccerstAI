import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function StatRow({ label, home, away }) {
  const h = parseFloat(String(home ?? 0).replace('%', '')) || 0;
  const a = parseFloat(String(away ?? 0).replace('%', '')) || 0;
  const total = h + a || 1;
  const homePct = h / total;
  const awayPct = a / total;

  const isPercent = String(home).includes('%');

  return (
    <View style={styles.container}>
      <Text style={styles.valueHome}>{home ?? 0}{isPercent ? '' : ''}</Text>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barHome, { flex: homePct }]} />
          <View style={[styles.barAway, { flex: awayPct }]} />
        </View>
      </View>
      <Text style={styles.valueAway}>{away ?? 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  valueHome: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    width: 36,
    textAlign: 'left',
  },
  valueAway: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    width: 36,
    textAlign: 'right',
  },
  center: { flex: 1, alignItems: 'center', gap: 4 },
  label: { color: COLORS.textMuted, fontSize: 11 },
  barBg: {
    flexDirection: 'row',
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  barHome: { backgroundColor: COLORS.primary, borderRadius: 3 },
  barAway: { backgroundColor: '#4C9EFF', borderRadius: 3 },
});
