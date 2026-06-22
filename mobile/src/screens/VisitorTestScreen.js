// src/screens/VisitorTestScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  useColorScheme, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

const VisitorTestScreen = ({ navigation, route }) => {
  const { usuario } = useAuth();
  const qrId = route?.params?.qrId || usuario?.qrId;
  const isDark = useColorScheme() === 'dark';
  const [ringing, setRinging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const animateRing = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 15 }),
      ]),
    ]).start();
  };

  const handleRing = async () => {
    if (ringing) return;
    animateRing();
    setRinging(true);
    setSuccess(false);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/visitor/${qrId}/ring`,
        { visitorName: visitorName.trim() || 'Prueba desde app' }
      );

      setSuccess(true);
      Alert.alert(
        '🔔 Timbre enviado!',
        res.data.notificationSent
          ? 'La notificación fue enviada a tu dispositivo.'
          : 'Timbrazo guardado. No se pudo enviar notificación (verifica el token).'
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo enviar el timbrazo.');
    } finally {
      setRinging(false);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#000', '#0A0A12']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.glow} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simular Visitante</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Simulated visitor page */}
      <View style={styles.visitorPreview}>
        <Text style={styles.previewLabel}>VISTA DEL VISITANTE</Text>

        {/* House info */}
        <View style={styles.houseCard}>
          <Text style={styles.houseEmoji}>🏠</Text>
          <Text style={styles.houseOwner}>{usuario?.nombre} {usuario?.apellido}</Text>
          {usuario?.direccion && (
            <Text style={styles.houseAddress}>📍 {usuario.direccion}</Text>
          )}
        </View>

        {/* Visitor name input */}
        <View style={styles.nameInputContainer}>
          <Text style={styles.nameInputLabel}>Tu nombre (opcional)</Text>
          <TextInput
            style={styles.nameInput}
            value={visitorName}
            onChangeText={setVisitorName}
            placeholder="Escribe tu nombre..."
            placeholderTextColor={COLORS.gray600}
            selectionColor={COLORS.primary}
          />
        </View>

        {/* THE BUTTON */}
        <View style={styles.buttonSection}>
          <Animated.View style={[styles.buttonGlowOuter, { opacity: glowOpacity, transform: [{ scale: scaleAnim }] }]} />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleRing}
              disabled={ringing}
              activeOpacity={0.9}
              style={styles.ringButtonWrapper}
            >
              <LinearGradient
                colors={
                  success
                    ? [COLORS.success, '#27A24B']
                    : ringing
                    ? [COLORS.gray700, COLORS.gray600]
                    : ['#007AFF', '#0040BB']
                }
                style={styles.ringButton}
              >
                {ringing ? (
                  <ActivityIndicator color={COLORS.white} size="large" />
                ) : (
                  <>
                    <Text style={styles.ringBtnIcon}>{success ? '✅' : '🔔'}</Text>
                    <Text style={styles.ringBtnText}>
                      {success ? 'TIMBRE ENVIADO' : 'TOCAR TIMBRE'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.ringHint}>
            {ringing ? 'Enviando...' : 'Toca el botón para simular un visitante'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  glow: {
    position: 'absolute', bottom: '20%', left: '50%',
    width: 300, height: 300, marginLeft: -150,
    borderRadius: 150,
    backgroundColor: 'rgba(0,122,255,0.08)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl,
  },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  visitorPreview: { flex: 1, paddingHorizontal: SPACING.xl, alignItems: 'center' },
  previewLabel: { color: COLORS.gray600, fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 2, marginBottom: SPACING.xl },
  houseCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', width: '100%',
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  houseEmoji: { fontSize: 48, marginBottom: SPACING.md },
  houseOwner: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: '700' },
  houseAddress: { color: COLORS.gray400, fontSize: FONT_SIZES.sm, marginTop: SPACING.xs },
  nameInputContainer: { width: '100%', marginBottom: SPACING.xl },
  nameInputLabel: { color: COLORS.gray500, fontSize: FONT_SIZES.xs, fontWeight: '600', letterSpacing: 1, marginBottom: SPACING.xs },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 50, color: COLORS.white,
    fontSize: FONT_SIZES.base, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  buttonGlowOuter: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(0,122,255,0.25)',
  },
  ringButtonWrapper: {
    width: 180, height: 180, borderRadius: 90,
    overflow: 'hidden', ...SHADOWS.blue,
  },
  ringButton: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  ringBtnIcon: { fontSize: 48 },
  ringBtnText: {
    color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: '900',
    letterSpacing: 1.5, textAlign: 'center',
  },
  ringHint: { color: COLORS.gray500, fontSize: FONT_SIZES.sm, marginTop: SPACING.xl, textAlign: 'center' },
});

export default VisitorTestScreen;
