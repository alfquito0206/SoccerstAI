import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../utils/constants';

// Genera un color consistente a partir del nombre del equipo
function nameToColor(name) {
  if (!name) return '#2A3A2F';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#1A3A2A', '#1A2A3A', '#2A1A3A', '#3A1A2A', '#1A3A3A', '#2A3A1A'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function TeamLogo({ uri, name, size = 36 }) {
  const initials = getInitials(name);
  const bgColor  = nameToColor(name);
  const fontSize = Math.round(size * 0.36);

  if (!uri) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      contentFit="contain"
      placeholder={{ color: bgColor }}
      transition={200}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  initials: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
