// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import RingWatcher from '../components/RingWatcher';
import { navigationRef } from './navigationRef';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import UnitDetailScreen from '../screens/UnitDetailScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import InviteFamilyScreen from '../screens/InviteFamilyScreen';
import QRViewerScreen from '../screens/QRViewerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import VisitorTestScreen from '../screens/VisitorTestScreen';
import LoadingScreen from '../screens/LoadingScreen';
import CallScreen from '../screens/CallScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Stack del tab Inicio
const InicioStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="UnitDetail" component={UnitDetailScreen} />
    <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="InviteFamily" component={InviteFamilyScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="QRViewer" component={QRViewerScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="VisitorTest" component={VisitorTestScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

// Stack del tab Perfil
const PerfilStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { display: 'none' }, // barra de tabs oculta; se navega con el avatar / botón atrás
    })}
  >
    <Tab.Screen name="InicioTab" component={InicioStack} options={{ title: 'Inicio' }} />
    <Tab.Screen name="PerfilTab" component={PerfilStack} options={{ title: 'Perfil' }} />
  </Tab.Navigator>
);

// Stack raíz: tabs + la videollamada como pantalla a pantalla completa
// (accesible desde cualquier lugar vía navigationRef).
const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={AppTabs} />
    <Stack.Screen
      name="Call"
      component={CallScreen}
      options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }}
    />
  </Stack.Navigator>
);

const navTheme = {
  dark: false,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.error,
  },
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
      {isAuthenticated && <RingWatcher />}
    </NavigationContainer>
  );
};

export default AppNavigator;
