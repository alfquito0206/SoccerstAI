import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function LeagueHeader({ league, count, highlight }) {
  return (
    <View style={[styles.container, highlight && styles.containerHighlight]}>
      {highlight && <View style={styles.accent} />}
      <Image source={{ uri: league.logo }} style={styles.logo} />
      <View style={styles.info}>
        <Text style={[styles.name, highlight && styles.nameHighlight]}>
          {league.name}
        </Text>
        <Text style={styles.sub}>
          {league.country} · {count} partido{count !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  containerHighlight: {
    backgroundColor: '#0D1F0F',
    borderBottomColor: `${COLORS.primary}40`,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  logo:   { width: 22, height: 22, resizeMode: 'contain' },
  info:   { flex: 1 },
  name:   { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  nameHighlight: { color: COLORS.primary },
  sub:    { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  accentIntl: { backgroundColor: COLORS.premium },

  big5Badge: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${COLORS.primary}50`,
  },
  big5Text: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

  intlBadge: {
    backgroundColor: `${COLORS.premium}20`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${COLORS.premium}50`,
  },
  intlText: { color: COLORS.premium, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
});
