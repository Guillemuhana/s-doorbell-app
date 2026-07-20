// src/screens/ProfileScreen.js — tab Perfil
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { notificacionesAPI } from '../utils/api';
import { suscribirWebPush, estadoWebPush } from '../utils/webPush';
import { reproducirTimbre } from '../utils/doorbellSound';
import Logo from '../components/Logo';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { APP_VERSION } from '../constants/version';

const Row = ({ icon, label, subtitle, onPress, danger }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.rowIcon, danger && { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
      <MaterialCommunityIcons name={icon} size={18} color={danger ? COLORS.error : COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
      {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
    </View>
    {!danger && <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.gray300} />}
  </TouchableOpacity>
);

// Cómo se muestra cada estado de las notificaciones nativas (Web Push / PWA).
const ESTADO_PUSH = {
  'ok': { icon: 'bell-check', color: '#2FA35A', label: 'Notificaciones activas', sub: 'Te llega el timbre con la app cerrada.' },
  'no-instalado': { icon: 'cellphone-arrow-down', color: '#E0A82E', label: 'Agregá la app a tu pantalla', sub: 'Safari → Compartir → "Agregar a inicio". Después abrila desde el ícono.' },
  'permiso-pendiente': { icon: 'bell-alert-outline', color: '#E0A82E', label: 'Falta activar notificaciones', sub: 'Tocá acá para activarlas.' },
  'sin-suscripcion': { icon: 'bell-alert-outline', color: '#E0A82E', label: 'Falta activar notificaciones', sub: 'Tocá acá para activarlas.' },
  'permiso-denegado': { icon: 'bell-off', color: '#E0483B', label: 'Notificaciones bloqueadas', sub: 'Activalas en Ajustes → Notificaciones → S-Doorbell.' },
  'no-soportado': { icon: 'bell-off-outline', color: '#9AA5B2', label: 'No disponible en este navegador', sub: 'Abrí la app instalada en la pantalla de inicio.' },
};

const ProfileScreen = ({ navigation }) => {
  const { usuario, logout } = useAuth();
  const [pushEstado, setPushEstado] = useState(null);

  // Recalcula el estado de notificaciones cada vez que se entra al Perfil.
  const refrescarEstado = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    try { setPushEstado(await estadoWebPush()); } catch { setPushEstado(null); }
  }, []);

  useFocusEffect(useCallback(() => { refrescarEstado(); }, [refrescarEstado]));

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const probarNotificacion = async () => {
    try {
      await notificacionesAPI.testNotification();
      Alert.alert(
        '📩 Enviada',
        'Bloqueá el teléfono o cerrá la app: en unos segundos debería llegar la notificación de prueba.\n\nSi no llega, tocá "Activar notificaciones" primero.'
      );
    } catch (e) {
      Alert.alert('No se pudo', e?.response?.data?.error || 'No se pudo enviar la notificación de prueba.');
    }
  };

  // Web (PWA): activar notificaciones con la app cerrada (Web Push).
  const activarNotificaciones = async () => {
    const estado = await suscribirWebPush();
    const mensajes = {
      'ok': ['✅ Listo', 'Vas a recibir el timbre aunque la app esté cerrada.\n\nEn iPhone suena con el sonido del sistema (no el timbre propio) y no puede sonar en silencio ni en modo Concentración.'],
      'no-instalado': ['Agregá la app a tu pantalla', 'Para recibir notificaciones con la app cerrada, primero agregá S-Doorbell a la pantalla de inicio: en Safari, tocá Compartir → "Agregar a pantalla de inicio". Después abrila desde el ícono.'],
      'permiso-denegado': ['Permiso denegado', 'Activá las notificaciones desde Ajustes → Notificaciones → S-Doorbell.'],
      'no-soportado': ['No disponible', 'Este dispositivo o navegador no permite notificaciones web.'],
      'error': ['Error', 'No se pudo activar. Probá de nuevo en un momento.'],
    };
    const [titulo, cuerpo] = mensajes[estado] || mensajes['error'];
    Alert.alert(titulo, cuerpo);
    refrescarEstado();
  };

  // Reproduce el timbre al instante (el toque cuenta como gesto → desbloquea el
  // audio de iOS). Sirve para confirmar que el sonido funciona.
  const probarSonido = () => {
    reproducirTimbre();
    Alert.alert('🔔 Timbre', 'Si no sonó, revisá que el interruptor de silencio del costado del teléfono NO esté en naranja, y que el volumen esté arriba.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.getParent()?.navigate('InicioTab')}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Perfil</Text>
        </View>
        {/* Avatar + nombre */}
        <View style={styles.profileHead}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{usuario?.nombre?.[0]?.toUpperCase()}{usuario?.apellido?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{usuario?.nombre} {usuario?.apellido}</Text>
          <Text style={styles.email}>{usuario?.email}</Text>
        </View>

        <View style={styles.card}>
          <Row icon="account-outline" label="Editar perfil" subtitle="Nombre, email, teléfono, contraseña" onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="history" label="Historial de timbrazos" onPress={() => navigation.navigate('Notifications')} />
        </View>

        {Platform.OS === 'web' && pushEstado && pushEstado !== 'ok' && (
          <TouchableOpacity style={[styles.statusBanner, { borderColor: (ESTADO_PUSH[pushEstado] || {}).color }]} onPress={activarNotificaciones} activeOpacity={0.8}>
            <MaterialCommunityIcons name={(ESTADO_PUSH[pushEstado] || {}).icon || 'bell-alert-outline'} size={22} color={(ESTADO_PUSH[pushEstado] || {}).color || COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: (ESTADO_PUSH[pushEstado] || {}).color }]}>{(ESTADO_PUSH[pushEstado] || {}).label || 'Notificaciones'}</Text>
              <Text style={styles.statusSub}>{(ESTADO_PUSH[pushEstado] || {}).sub || ''}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.gray300} />
          </TouchableOpacity>
        )}

        {Platform.OS === 'web' && (
          <View style={styles.card}>
            {pushEstado === 'ok' && (
              <View style={styles.okRow}>
                <MaterialCommunityIcons name="bell-check" size={18} color="#2FA35A" />
                <Text style={styles.okText}>Notificaciones activas · te llega el timbre con la app cerrada</Text>
              </View>
            )}
            <Row icon="bell-ring-outline" label="Activar notificaciones" subtitle="Recibir el timbre con la app cerrada" onPress={activarNotificaciones} />
            <Row icon="bell-check-outline" label="Probar notificación" subtitle="Confirmá que llega con la app cerrada" onPress={probarNotificacion} />
            <Row icon="volume-high" label="Probar sonido" subtitle="Escuchar cómo suena el timbre" onPress={probarSonido} />
          </View>
        )}

        <View style={styles.card}>
          <Row icon="logout" label="Cerrar sesión" danger onPress={cerrarSesion} />
        </View>

        <View style={styles.footer}>
          <Logo size="sm" />
          <Text style={styles.version}>{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING['3xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  screenTitle: { fontSize: FONT_SIZES['2xl'], fontWeight: '800', color: COLORS.text },
  profileHead: { alignItems: 'center', paddingVertical: SPACING.lg },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.gold },
  avatarText: { color: COLORS.white, fontSize: FONT_SIZES['2xl'], fontWeight: '800' },
  name: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
  email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: SPACING.base, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },
  footer: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.xs },
  version: { color: COLORS.textMuted, fontSize: FONT_SIZES.xs },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.base,
    borderWidth: 1.5,
  },
  statusLabel: { fontSize: FONT_SIZES.base, fontWeight: '800' },
  statusSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  okRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingTop: SPACING.md, paddingBottom: SPACING.xs,
  },
  okText: { flex: 1, fontSize: FONT_SIZES.xs, color: '#2FA35A', fontWeight: '600' },
});

export default ProfileScreen;
