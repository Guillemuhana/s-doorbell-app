// App.js
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { addNotificationResponseListener, clearBadge } from './src/utils/notifications';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash visible while loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Handle tapping notifications to open app
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      clearBadge();
      // Navigation to specific screen can be added here
      console.log('Notification tapped:', data);
    });

    // Hide splash after a short delay
    const timer = setTimeout(() => SplashScreen.hideAsync(), 500);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
