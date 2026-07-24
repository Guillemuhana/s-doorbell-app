// src/screens/BulkUsuariosScreen.js — alta masiva de usuarios en un timbre (admin/PC)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Share, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { edificiosAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const CHIPS = [2, 3, 4, 5, 8, 10, 25];

const credsTexto = (unidadNombre, usuarios) =>
  `Credenciales · ${unidadNombre}\n\n` +
  usuarios
    .filter((u) => u.estado === 'creado')
    .map((u, i) => `${i + 1}) ${u.nombre}\n   email: ${u.email}\n   clave: ${u.password}`)
    .join('\n\n') +
  '\n\nCada usuario cambia su clave al primer ingreso.';

const BulkUsuariosScreen = ({ route, navigation }) => {
  const { edificioId, unidadId, unidadNombre } = route.params || {};
  const [cantidad, setCantidad] = useState('5');
  const [baseNombre, setBaseNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const crear = async () => {
    const n = parseInt(cantidad, 10);
    if (!n || n < 1) return Alert.alert('Cantidad inválida', 'Ingresá cuántos usuarios querés crear.');
    if (n > 100) return Alert.alert('Demasiados', 'Máximo 100 usuarios por vez.');
    setCreating(true);
    try {
      const { data } = await edificiosAPI.bulkUsuarios(edificioId, unidadId, {
        count: n,
        baseNombre: baseNombre.trim() || undefined,
      });
      setResultado(data);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudieron crear los usuarios.');
    } finally {
      setCreating(false);
    }
  };

  const compartir = async () => {
    const txt = credsTexto(unidadNombre, resultado.usuarios);
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(txt);
        setCopiado(true); setTimeout(() => setCopiado(false), 2000);
        return;
      }
      await Share.share({ message: txt });
    } catch { Alert.alert('Credenciales', txt); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Text style={styles.headerTitle} numberOfLines={1}>Cargar usuarios{unidadNombre ? ` · ${unidadNombre}` : ''}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!resultado ? (
          <>
            <View style={styles.hint}>
              <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.hintText}>
                Se crean N usuarios con email y clave provisoria (los entregás al cliente). Cada uno cambia su clave al ingresar.
              </Text>
            </View>

            <Text style={styles.label}>¿Cuántos usuarios?</Text>
            <View style={styles.chips}>
              {CHIPS.map((n) => (
                <TouchableOpacity key={n} style={[styles.chip, cantidad === String(n) && styles.chipActive]} onPress={() => setCantidad(String(n))}>
                  <Text style={[styles.chipText, cantidad === String(n) && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} value={cantidad} onChangeText={setCantidad} keyboardType="number-pad" placeholder="Cantidad" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Nombre base (opcional)</Text>
            <TextInput style={styles.input} value={baseNombre} onChangeText={setBaseNombre} placeholder="Ej: Depto — se numeran solos" placeholderTextColor={COLORS.textMuted} />

            <TouchableOpacity style={styles.primaryBtn} onPress={crear} disabled={creating} activeOpacity={0.85}>
              {creating ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <MaterialCommunityIcons name="account-multiple-plus" size={20} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Crear {cantidad || ''} usuarios</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.okBox}>
              <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
              <Text style={styles.okText}>
                {resultado.creados} creados{resultado.agregados ? ` · ${resultado.agregados} ya existentes agregados` : ''} · {resultado.residentesCount} usuarios en total
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={compartir} activeOpacity={0.85}>
              <MaterialCommunityIcons name={copiado ? 'check' : 'share-variant'} size={20} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>{copiado ? '¡Copiado!' : 'Compartir credenciales'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Credenciales generadas</Text>
            <Text style={styles.warn}>⚠️ Guardá o compartí esto ahora: las claves no se vuelven a mostrar.</Text>
            {resultado.usuarios.map((u, i) => (
              <View key={i} style={styles.credCard}>
                <Text style={styles.credName}>{u.nombre}</Text>
                {u.estado === 'creado' ? (
                  <>
                    <Text style={styles.credLine} selectable>📧 {u.email}</Text>
                    <Text style={styles.credLine} selectable>🔑 {u.password}</Text>
                  </>
                ) : (
                  <Text style={styles.credMuted}>{u.estado === 'agregado' ? 'Ya existía · agregado al timbre' : u.estado === 'ya_miembro' ? 'Ya era usuario del timbre' : 'No se pudo crear'}</Text>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.outlineText}>Listo</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, gap: SPACING.sm },
  headerTitle: { flex: 1, fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  scroll: { padding: SPACING.lg, gap: SPACING.xs, paddingBottom: SPACING['2xl'] },
  hint: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md, padding: SPACING.base, marginBottom: SPACING.sm },
  hintText: { flex: 1, color: COLORS.primaryDark, fontSize: FONT_SIZES.sm, lineHeight: 19 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  chip: { minWidth: 48, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONT_SIZES.base },
  chipTextActive: { color: COLORS.primaryDark },
  input: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base, fontSize: FONT_SIZES.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  primaryBtn: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg, ...SHADOWS.blue },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  outlineBtn: { height: 50, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.base },
  outlineText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONT_SIZES.base },
  okBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: RADIUS.md, padding: SPACING.base },
  okText: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZES.sm },
  warn: { fontSize: FONT_SIZES.xs, color: COLORS.warning, marginBottom: SPACING.sm, fontWeight: '600' },
  credCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  credName: { fontSize: FONT_SIZES.base, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  credLine: { fontSize: FONT_SIZES.sm, color: COLORS.primaryDark, fontWeight: '600', marginTop: 1 },
  credMuted: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
});

export default BulkUsuariosScreen;
