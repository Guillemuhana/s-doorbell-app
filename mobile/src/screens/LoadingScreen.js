// src/screens/LoadingScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SIZES } from '../constants/theme';

const LoadingScreen = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#000', '#0A0A12']} style={StyleSheet.absoluteFillObject} />
      <Animated.Text style={[styles.icon, { opacity: anim }]}>🔔</Animated.Text>
      <Text style={styles.brand}>S-Doorbell</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  icon: { fontSize: 60, marginBottom: 16 },
  brand: { color: COLORS.white, fontSize: FONT_SIZES['2xl'], fontWeight: '800', letterSpacing: -0.5 },
});

export default LoadingScreen;
