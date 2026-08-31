import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

const FILTERS = [
  { key: 'all',      label: 'Todos' },
  { key: 'live',     label: '🔴 En Vivo' },
  { key: 'upcoming', label: '🕐 Por Jugar' },
  { key: 'finished', label: '✅ Finalizados' },
];

export default function FilterBar({ active, onChange, counts }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.wrapper}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[styles.btn, active === f.key && styles.btnActive]}
          onPress={() => onChange(f.key)}
        >
          <Text style={[styles.label, active === f.key && styles.labelActive]}>
            {f.label}
          </Text>
          {counts?.[f.key] > 0 && (
            <View style={[styles.badge, active === f.key && styles.badgeActive]}>
              <Text style={[styles.badgeText, active === f.key && styles.badgeTextActive]}>
                {counts[f.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  btnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  labelActive: { color: '#000' },
  badge: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeActive: { backgroundColor: 'rgba(0,0,0,0.2)' },
  badgeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: 'bold' },
  badgeTextActive: { color: '#000' },
});
