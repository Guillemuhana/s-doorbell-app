// src/screens/CPanelScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  useColorScheme,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { notificacionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const MenuRow = ({ icon, label, subtitle, onPress, isDangerous, isDark, showArrow = true, rightElement }) => (
  <TouchableOpacity
    style={[styles.menuRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIcon, { backgroundColor: isDangerous ? 'rgba(255,59,48,0.12)' : 'rgba(0,122,255,0.1)' }]}>
      <Text style={styles.menuEmoji}>{icon}</Text>
    </View>
    <View style={styles.menuText}>
      <Text style={[styles.menuLabel, { color: isDangerous ? COLORS.error : (isDark ? COLORS.white : COLORS.gray900) }]}>
        {label}
      </Text>
      {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
    </View>
    {rightElement || (showArrow && <Text style={styles.menuArrow}>›</Text>)}
  </TouchableOpacity>
);

const CPanelScreen = ({ navigation }) => {
  const { usuario, logout, updateUser } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const [testingPush, setTestingPush] = useState(false);

  const bg = isDark ? '#000' : '#F0F0F5';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#fff';
  const textColor = isDark ? COLORS.white : COLORS.gray900;
  const mutedColor = isDark ? COLORS.gray400 : COLORS.gray500;

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const handleTestNotification = async () => {
    setTestingPush(true);
    try {
      await notificacionesAPI.testNotification();
      Alert.alert('✅ Éxito', 'Recibirás una notificación de prueba en segundos.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Error enviando notificación de prueba.');
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : COLORS.primary }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Panel de Control</Text>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.2)' }]}>
            <View style={styles.avatar}>
              {usuario?.foto_fachada ? (
                <Image source={{ uri: usuario.foto_fachada }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitials}>
                  {(usuario?.nombre?.[0] || '') + (usuario?.apellido?.[0] || '')}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{usuario?.nombre} {usuario?.apellido}</Text>
              <Text style={styles.profileEmail}>{usuario?.email}</Text>
              {usuario?.direccion && (
                <Text style={styles.profileAddress}>📍 {usuario.direccion}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* QR & Timbre */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Timbre & QR</Text>
            <MenuRow icon="📱" label="Ver mi QR" subtitle="Código para compartir con visitantes" onPress={() => navigation.navigate('QRViewer')} isDark={isDark} />
            <MenuRow icon="🔔" label="Probar Notificación" subtitle={testingPush ? 'Enviando...' : 'Envía un timbrazo de prueba'} onPress={handleTestNotification} isDark={isDark} />
            <MenuRow icon="📋" label="Historial de Visitas" subtitle="Ver todos los timbrazos" onPress={() => navigation.navigate('Notifications')} isDark={isDark} />
          </View>

          {/* Account */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Mi Cuenta</Text>
            <MenuRow icon="✏️" label="Editar Perfil" subtitle="Nombre, teléfono, dirección, foto" onPress={() => navigation.navigate('EditProfile')} isDark={isDark} />
            <MenuRow icon="🧪" label="Simular Visitante" subtitle="Ver cómo se ve tu timbre" onPress={() => navigation.navigate('VisitorTest')} isDark={isDark} />
          </View>

          {/* Info */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>Sistema</Text>
            <MenuRow
              icon="🔔"
              label="Notificaciones"
              subtitle={usuario?.pushToken ? 'Activas' : 'Sin configurar'}
              isDark={isDark}
              showArrow={false}
              rightElement={<Text style={[styles.badge, { backgroundColor: usuario?.pushToken ? COLORS.success : COLORS.warning }]}>{usuario?.pushToken ? 'ON' : 'OFF'}</Text>}
            />
            <MenuRow
              icon="📶"
              label="qrId"
              subtitle={usuario?.qrId?.substring(0, 20) + '...'}
              isDark={isDark}
              showArrow={false}
            />
          </View>

          {/* Logout */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <MenuRow
              icon="🚪"
              label="Cerrar Sesión"
              onPress={handleLogout}
              isDangerous
              isDark={isDark}
              showArrow={false}
            />
          </View>

          <Text style={[styles.version, { color: mutedColor }]}>S-Doorbell v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  backBtn: { marginBottom: SPACING.sm },
  backIcon: { fontSize: 22, color: COLORS.white, fontWeight: '600' },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.white, marginBottom: SPACING.lg },
  profileCard: { borderRadius: RADIUS.xl, padding: SPACING.base, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md, overflow: 'hidden',
  },
  avatarImg: { width: 64, height: 64 },
  avatarInitials: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  profileEmail: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.sm, marginTop: 2 },
  profileAddress: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZES.xs, marginTop: 4 },
  content: { padding: SPACING.base, gap: SPACING.md },
  card: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm },
  cardTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', padding: SPACING.base, paddingBottom: SPACING.sm, opacity: 0.6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  menuEmoji: { fontSize: 18 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: FONT_SIZES.base, fontWeight: '600' },
  menuSub: { fontSize: FONT_SIZES.xs, color: COLORS.gray400, marginTop: 1 },
  menuArrow: { color: COLORS.gray400, fontSize: 22, fontWeight: '300' },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: FONT_SIZES.xs, marginVertical: SPACING.md },
});

export default CPanelScreen;
