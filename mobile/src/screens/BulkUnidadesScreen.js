// src/screens/BulkUnidadesScreen.js — cargar unidades de un edificio (auto/manual)
// Genera cada unidad con su timbre/QR + usuario provisorio, y arma el entregable
// ordenado para darle al que compra. Pensado para ser simple e intuitivo.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Switch, Share, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { edificiosAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const CHIPS = [5, 10, 15, 20, 25, 30];

const armarEntregable = (nombre, unidades) => {
  let t = `🏢 ${nombre}\nCredenciales de acceso — S-Doorbell\n\n`;
  unidades.forEach((u, i) => {
    t += `${i + 1}) ${u.etiqueta}${u.nombre && u.nombre !== u.etiqueta ? ` · ${u.nombre}` : ''}\n`;
    t += `   🔔 Timbre: ${u.visitorUrl}\n`;
    if (u.usuario && u.usuario.estado === 'creado') {
      t += `   👤 Usuario: ${u.usuario.email}\n   🔑 Clave provisoria: ${u.usuario.password}\n`;
    }
    t += '\n';
  });
  t += 'Cada usuario cambia su clave al primer ingreso.';
  return t;
};

const BulkUnidadesScreen = ({ route, navigation }) => {
  const { edificioId, edificioNombre } = route.params || {};
  const [modo, setModo] = useState('auto');
  const [cantidad, setCantidad] = useState('10');
  const [baseEtiqueta, setBaseEtiqueta] = useState('Depto');
  const [conUsuario, setConUsuario] = useState(true);
  const [filas, setFilas] = useState([{ piso: '', depto: '', nombreFamilia: '', email: '' }]);
  const [creating, setCreating] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const setFila = (i, campo, val) => setFilas((f) => f.map((row, idx) => (idx === i ? { ...row, [campo]: val } : row)));
  const agregarFila = () => setFilas((f) => [...f, { piso: '', depto: '', nombreFamilia: '', email: '' }]);
  const quitarFila = (i) => setFilas((f) => (f.length > 1 ? f.filter((_, idx) => idx !== i) : f));

  const crear = async () => {
    let body;
    if (modo === 'auto') {
      const n = parseInt(cantidad, 10);
      if (!n || n < 1) return Alert.alert('Cantidad inválida', 'Ingresá cuántas unidades querés crear.');
      if (n > 200) return Alert.alert('Demasiadas', 'Máximo 200 por vez.');
      body = { modo: 'auto', count: n, baseEtiqueta: baseEtiqueta.trim() || 'Depto', conUsuario };
    } else {
      const validas = filas.filter((r) => r.piso || r.depto || r.nombreFamilia || r.email);
      if (!validas.length) return Alert.alert('Sin unidades', 'Cargá al menos una unidad.');
      body = { modo: 'manual', unidades: validas, conUsuario };
    }
    setCreating(true);
    try {
      const { data } = await edificiosAPI.bulkUnidades(edificioId, body);
      setResultado(data);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudieron crear las unidades.');
    } finally {
      setCreating(false);
    }
  };

  const compartir = async () => {
    const txt = armarEntregable(resultado.edificio?.nombre || edificioNombre, resultado.unidades);
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(txt);
        setCopiado(true); setTimeout(() => setCopiado(false), 2000);
        return;
      }
      await Share.share({ message: txt });
    } catch { Alert.alert('Entregable', txt); }
  };

  // ── Resultado / entregable ──
  if (resultado) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Entregable</Text>
          <TouchableOpacity onPress={() => navigation.replace('EdificioDetail', { edificioId })}>
            <MaterialCommunityIcons name="close" size={26} color={COLORS.gray500} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.okBox}>
            <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
            <Text style={styles.okText}>{resultado.creadas} unidades creadas, cada una con su timbre y usuario.</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={compartir} activeOpacity={0.85}>
            <MaterialCommunityIcons name={copiado ? 'check' : 'share-variant'} size={20} color={COLORS.white} />
            <Text style={styles.primaryBtnText}>{copiado ? '¡Copiado!' : 'Compartir entregable'}</Text>
          </TouchableOpacity>
          <Text style={styles.warn}>⚠️ Guardá o compartí esto ahora: las claves no se vuelven a mostrar.</Text>

          {resultado.unidades.map((u, i) => (
            <View key={i} style={styles.credCard}>
              <Text style={styles.credName}>{i + 1}) {u.etiqueta}{u.nombre && u.nombre !== u.etiqueta ? ` · ${u.nombre}` : ''}</Text>
              <Text style={styles.credLine} selectable>🔔 {u.visitorUrl}</Text>
              {u.usuario && u.usuario.estado === 'creado' && (
                <>
                  <Text style={styles.credLine} selectable>👤 {u.usuario.email}</Text>
                  <Text style={styles.credLine} selectable>🔑 {u.usuario.password}</Text>
                </>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.replace('EdificioDetail', { edificioId })}>
            <Text style={styles.outlineText}>Ir al panel del edificio</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Formulario ──
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Text style={styles.headerTitle} numberOfLines={1}>Cargar unidades</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!!edificioNombre && <Text style={styles.sub}>🏢 {edificioNombre}</Text>}

        {/* Selector de modo */}
        <View style={styles.modoRow}>
          <TouchableOpacity style={[styles.modoTab, modo === 'auto' && styles.modoTabActive]} onPress={() => setModo('auto')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color={modo === 'auto' ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.modoText, modo === 'auto' && styles.modoTextActive]}>Automático</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modoTab, modo === 'manual' && styles.modoTabActive]} onPress={() => setModo('manual')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="format-list-bulleted" size={18} color={modo === 'manual' ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.modoText, modo === 'manual' && styles.modoTextActive]}>Manual</Text>
          </TouchableOpacity>
        </View>

        {modo === 'auto' ? (
          <>
            <Text style={styles.hint}>Elegí cuántas unidades tiene el edificio. Se numeran solas y cada una recibe su timbre y usuario.</Text>
            <Text style={styles.label}>¿Cuántas unidades?</Text>
            <View style={styles.chips}>
              {CHIPS.map((n) => (
                <TouchableOpacity key={n} style={[styles.chip, cantidad === String(n) && styles.chipActive]} onPress={() => setCantidad(String(n))}>
                  <Text style={[styles.chipText, cantidad === String(n) && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} value={cantidad} onChangeText={setCantidad} keyboardType="number-pad" placeholder="Cantidad" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Etiqueta base</Text>
            <TextInput style={styles.input} value={baseEtiqueta} onChangeText={setBaseEtiqueta} placeholder="Depto" placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.preview}>Se crearán: {baseEtiqueta || 'Depto'} 1, {baseEtiqueta || 'Depto'} 2, {baseEtiqueta || 'Depto'} 3…</Text>
          </>
        ) : (
          <>
            <Text style={styles.hint}>Cargá cada unidad con su piso, depto y familia. El email es opcional (si no ponés, se genera un usuario provisorio).</Text>
            {filas.map((row, i) => (
              <View key={i} style={styles.filaCard}>
                <View style={styles.filaHead}>
                  <Text style={styles.filaTitle}>Unidad {i + 1}</Text>
                  {filas.length > 1 && (
                    <TouchableOpacity onPress={() => quitarFila(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.gray400} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.filaRow}>
                  <TextInput style={[styles.input, styles.inputHalf]} value={row.piso} onChangeText={(v) => setFila(i, 'piso', v)} placeholder="Piso (ej: 5)" placeholderTextColor={COLORS.textMuted} />
                  <TextInput style={[styles.input, styles.inputHalf]} value={row.depto} onChangeText={(v) => setFila(i, 'depto', v)} placeholder="Depto (ej: B)" placeholderTextColor={COLORS.textMuted} />
                </View>
                <TextInput style={styles.input} value={row.nombreFamilia} onChangeText={(v) => setFila(i, 'nombreFamilia', v)} placeholder="Nombre de la familia (opcional)" placeholderTextColor={COLORS.textMuted} />
                <TextInput style={styles.input} value={row.email} onChangeText={(v) => setFila(i, 'email', v)} placeholder="Email del residente (opcional)" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" keyboardType="email-address" />
              </View>
            ))}
            <TouchableOpacity style={styles.addRow} onPress={agregarFila} activeOpacity={0.85}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.primaryDark} />
              <Text style={styles.addRowText}>Agregar otra unidad</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Crear un usuario por unidad</Text>
            <Text style={styles.switchSub}>Con email y clave provisoria para entregar</Text>
          </View>
          <Switch value={conUsuario} onValueChange={setConUsuario} trackColor={{ true: COLORS.primary, false: COLORS.gray300 }} thumbColor={COLORS.white} />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={crear} disabled={creating} activeOpacity={0.85}>
          {creating ? <ActivityIndicator color={COLORS.white} /> : (
            <>
              <MaterialCommunityIcons name="check" size={20} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Crear unidades</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, gap: SPACING.sm },
  headerTitle: { flex: 1, fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  scroll: { padding: SPACING.lg, gap: SPACING.xs, paddingBottom: SPACING['2xl'] },
  sub: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  modoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  modoTab: { flex: 1, flexDirection: 'row', gap: 6, height: 48, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  modoTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modoText: { fontWeight: '700', color: COLORS.textSecondary, fontSize: FONT_SIZES.base },
  modoTextActive: { color: COLORS.white },
  hint: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 19, marginBottom: SPACING.sm },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  chip: { minWidth: 52, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONT_SIZES.base },
  chipTextActive: { color: COLORS.primaryDark },
  input: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base, fontSize: FONT_SIZES.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  inputHalf: { flex: 1 },
  preview: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontStyle: 'italic' },
  filaCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  filaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  filaTitle: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.text },
  filaRow: { flexDirection: 'row', gap: SPACING.sm },
  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', marginTop: SPACING.xs },
  addRowText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: FONT_SIZES.base },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  switchTitle: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  switchSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },
  primaryBtn: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg, ...SHADOWS.blue },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  outlineBtn: { height: 50, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.base },
  outlineText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONT_SIZES.base },
  okBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: RADIUS.md, padding: SPACING.base, marginBottom: SPACING.md },
  okText: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZES.sm },
  warn: { fontSize: FONT_SIZES.xs, color: COLORS.warning, marginTop: SPACING.sm, marginBottom: SPACING.sm, fontWeight: '600' },
  credCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  credName: { fontSize: FONT_SIZES.base, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  credLine: { fontSize: FONT_SIZES.sm, color: COLORS.primaryDark, fontWeight: '600', marginTop: 1 },
});

export default BulkUnidadesScreen;
