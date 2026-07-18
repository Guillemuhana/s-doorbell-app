// src/screens/AcceptInviteScreen.js
// Muestra una invitación (llegó por link /invitacion/:token) y permite aceptarla
// o rechazarla. Requiere estar logueado (a este punto ya lo está).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { invitacionesAPI } from '../utils/api';
import { clearPendingInvite } from '../utils/pendingInvite';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const AcceptInviteScreen = ({ route, navigation }) => {
  const token = route.params?.token;
  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!token) { setError('Invitación inválida.'); setLoading(false); return; }
      try {
        const { data } = await invitacionesAPI.get(token);
        if (vivo) setInv(data.invitacion || data);
      } catch (err) {
        if (vivo) setError(err?.response?.data?.error || 'No se pudo cargar la invitación.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [token]);

  const irAlInicio = () => {
    clearPendingInvite();
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  const aceptar = async () => {
    setWorking(true);
    try {
      await invitacionesAPI.aceptar(token);
      await clearPendingInvite();
      Alert.alert('✅ ¡Listo!', 'Te uniste a la dirección. Ya vas a recibir los timbrazos.', [
        { text: 'OK', onPress: irAlInicio },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo aceptar la invitación.');
      setWorking(false);
    }
  };

  const rechazar = async () => {
    setWorking(true);
    try { await invitacionesAPI.rechazar(token); } catch { /* da igual */ }
    await clearPendingInvite();
    irAlInicio();
  };

  const direccion = inv?.direccion || inv?.direccionId || null;
  const nombreDireccion = direccion?.nombre || inv?.direccionNombre || 'una dirección';
  // invitadoPor llega como objeto { nombre, apellido }.
  const ip = inv?.invitadoPor;
  const invitadoPor = ip && typeof ip === 'object'
    ? `${ip.nombre || ''} ${ip.apellido || ''}`.trim()
    : (typeof ip === 'string' ? ip : '');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : error ? (
          <>
            <MaterialCommunityIcons name="email-remove-outline" size={72} color={COLORS.gray300} />
            <Text style={styles.title}>Invitación no válida</Text>
            <Text style={styles.desc}>{error}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={irAlInicio} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Ir al inicio</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.illustration}>
              <MaterialCommunityIcons name="home-heart" size={90} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Te invitaron a un timbre</Text>
            <Text style={styles.desc}>
              {invitadoPor ? `${invitadoPor} te invitó` : 'Te invitaron'} a atender el timbre de{' '}
              <Text style={styles.strong}>{nombreDireccion}</Text>.
              {'\n'}Si aceptás, vas a recibir los timbrazos de esa dirección.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={aceptar} disabled={working} activeOpacity={0.85}>
              {working ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Aceptar invitación</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={rechazar} disabled={working} activeOpacity={0.8}>
              <Text style={styles.outlineBtnText}>Rechazar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  illustration: { marginBottom: SPACING.sm },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  desc: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg, paddingHorizontal: SPACING.md },
  strong: { fontWeight: '800', color: COLORS.text },
  primaryBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', width: '100%', ...SHADOWS.gold },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  outlineBtn: { height: 50, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', width: '100%' },
  outlineBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.base, fontWeight: '600' },
});

export default AcceptInviteScreen;
