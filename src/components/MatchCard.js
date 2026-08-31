import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TeamLogo from './TeamLogo';
import { COLORS } from '../utils/constants';

const STATUS_LABEL = {
  'NS': 'Por jugar',
  'LIVE': '🔴 EN VIVO',
  '1H': '🔴 1er Tiempo',
  '2H': '🔴 2do Tiempo',
  'HT': '🔴 Descanso',
  'FT': 'Finalizado',
  'AET': 'Finalizado (AET)',
  'PEN': 'Finalizado (Pen)',
  'PST': 'Pospuesto',
  'CANC': 'Cancelado',
};

function isLive(short) {
  return ['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(short);
}

export default function MatchCard({ fixture, onPress }) {
  const { fixture: f, teams, goals, league } = fixture;
  const statusShort = f.status.short;
  const live = isLive(statusShort);
  const finished = ['FT', 'AET', 'PEN'].includes(statusShort);
  const time = new Date(f.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.league}>{league.name} · {league.round}</Text>

      <View style={styles.row}>
        <View style={styles.teamBlock}>
          <TeamLogo uri={teams.home.logo} name={teams.home.name} size={36} />
          <Text style={styles.teamName} numberOfLines={1}>{teams.home.name}</Text>
        </View>

        <View style={styles.scoreBlock}>
          {finished || live ? (
            <Text style={[styles.score, live && styles.scoreLive]}>
              {goals.home ?? 0} - {goals.away ?? 0}
            </Text>
          ) : (
            <Text style={styles.time}>{time}</Text>
          )}
          <Text style={[styles.status, live && styles.statusLive]}>
            {live ? `${STATUS_LABEL[statusShort] ?? 'EN VIVO'} ${f.status.elapsed ?? ''}'` : (STATUS_LABEL[statusShort] ?? statusShort)}
          </Text>
        </View>

        <View style={[styles.teamBlock, styles.teamRight]}>
          <TeamLogo uri={teams.away.logo} name={teams.away.name} size={36} />
          <Text style={styles.teamName} numberOfLines={1}>{teams.away.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  league: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamRight: {
    alignItems: 'center',
  },
  teamName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreBlock: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  score: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  scoreLive: {
    color: COLORS.primary,
  },
  time: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  status: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  statusLive: {
    color: '#FF4C4C',
  },
});
