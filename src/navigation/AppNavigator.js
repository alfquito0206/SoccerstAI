import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import PremiumScreen from '../screens/PremiumScreen';
import GameDetailScreen from '../screens/GameDetailScreen';
import TeamScreen from '../screens/TeamScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { COLORS } from '../utils/constants';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const STACK_OPTS = {
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: 'bold' },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTS}>
      <Stack.Screen name="HomeList" component={HomeScreen} options={{ title: 'SoccerstAI' }} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Análisis del Partido' }} />
      <Stack.Screen
        name="PremiumAnalysis"
        component={PremiumScreen}
        options={({ route }) => ({
          title: route.params?.fixture
            ? `${route.params.fixture.teams.home.name} vs ${route.params.fixture.teams.away.name}`
            : 'Análisis IA',
          headerTintColor: COLORS.premium,
        })}
      />
      <Stack.Screen
        name="TeamDetail"
        component={TeamScreen}
        options={({ route }) => ({
          title: route.params?.team?.name ?? 'Equipo',
        })}
      />
    </Stack.Navigator>
  );
}

function PremiumStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTS}>
      <Stack.Screen name="PremiumHome" component={PremiumScreen} options={{ title: 'Premium IA ✨' }} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Partidos',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>⚽</Text>,
        }}
      />
      <Tab.Screen
        name="Premium"
        component={PremiumStack}
        options={{
          tabBarLabel: 'Premium IA',
          tabBarActiveTintColor: COLORS.premium,
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>✨</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return user ? <MainTabs /> : <AuthStack />;
}
