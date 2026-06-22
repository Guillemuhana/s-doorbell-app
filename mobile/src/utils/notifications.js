// src/utils/notifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// ─── Configure notification handler ──────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'tu-eas-project-id', // Replace with your EAS project ID
    });

    const pushToken = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('doorbell', {
        name: 'Timbre',
        description: 'Alertas cuando alguien toca el timbre',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'doorbell',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return pushToken;
  } catch (error) {
    console.error('Error getting push token:', error);
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
    trigger: { seconds: 1 },
  });
};
