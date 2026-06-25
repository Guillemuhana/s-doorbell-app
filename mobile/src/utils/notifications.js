// src/utils/notifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Configure notification handler ──────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true, // compat SDK anteriores
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications and return Expo push token
 */
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Notificaciones desactivadas',
      'Activa las notificaciones en Ajustes para recibir alertas del timbre.',
      [{ text: 'OK' }]
    );
    return null;
  }

  // Canal de Android (necesario también para notificaciones LOCALES)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('doorbell', {
        name: 'Timbre',
        description: 'Alertas cuando alguien toca el timbre',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E9BE0',
        enableVibrate: true,
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch {}
  }

  // Token push REMOTO: solo si hay un projectId de EAS válido (no en Expo Go).
  // Hoy usamos notificaciones LOCALES (RingWatcher), así que esto es opcional.
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
  if (!UUID_RE.test(projectId || '')) {
    return null; // sin EAS project → sin token remoto, no es un error
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.warn('No se pudo obtener push token remoto:', error?.message);
    return null;
  }
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (user tapped notification)
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Clear badge count
 */
export const clearBadge = async () => {
  await Notifications.setBadgeCountAsync(0);
};

/**
 * Schedule local notification (for testing)
 */
export const scheduleLocalNotification = async ({ title, body, data }) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // inmediata
  });
};
