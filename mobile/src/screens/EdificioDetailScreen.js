// src/screens/EdificioDetailScreen.js — panel de administración de un edificio/complejo
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { edificiosAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const UnidadRow = ({ unidad, onPress, onDelete, onBulk }) => (
  <View style={styles.unitRow}>
    <TouchableOpacity style={styles.unitMain} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.unitBadge}>
        <Text style={styles.unitBadgeText}>{unidad.unidad || '—'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.unitName} numberOfLines={1}>{unidad.nombre}</Text>
        <Text style={styles.unitSub}>
          <MaterialCommunityIcons name="account-group" size={12} color={COLORS.textMuted} />
          {' '}{unidad.residentesCount ?? 0} usuario{(unidad.residentesCount ?? 0) === 1 ? '' : 's'}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.gray300} />
    </TouchableOpacity>
    <TouchableOpacity style={styles.unitAction} onPress={onBulk} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
      <MaterialCommunityIcons name="account-multiple-plus" size={20} color={COLORS.primary} />
    </TouchableOpacity>
    <TouchableOpacity style={styles.unitAction} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
      <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
    </TouchableOpacity>
  </View>
);

const EdificioDetailScreen = ({ route, navigation }) => {
  const { edificioId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await edificiosAPI.get(edificioId);
      setData(res.data);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo cargar el edificio.');
    } finally {
      setLoading(false);
    }
  }, [edificioId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const eliminarUnidad = (u) => {
    Alert.alert('Eliminar unidad', `Se borra "${u.nombre}", su timbre y sus residentes. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await edificiosAPI.removeUnidad(edificioId, u._id); fetchData(); }
          catch { Alert.alert('Error', 'No se pudo eliminar la unidad.'); }
        },
      },
    ]);
  };

  const eliminarEdificio = () => {
    Alert.alert('Eliminar edificio', 'Se borra el edificio con TODAS sus unidades y residentes. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await edificiosAPI.delete(edificioId); navigation.goBack(); }
          catch { Alert.alert('Error', 'No se pudo eliminar el edificio.'); }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  const edificio = data?.edificio || {};
  const entrada = (data?.entradas || [])[0] || null;
  const unidades = data?.unidades || [];
  const esCasa = (edificio.categoria || 'Edificio') === 'Casa';
  const casaUnidad = esCasa ? unidades[0] : null;
  const irBulk = (u) => navigation.navigate('BulkUsuarios', { edificioId, unidadId: u._id, unidadNombre: u.nombre });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{edificio.nombre}</Text>
          {!!edificio.direccion && <Text style={styles.subtitle} numberOfLines={1}>📍 {edificio.direccion}</Text>}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {esCasa ? (
          /* ── Cliente CASA: un solo timbre con N usuarios ── */
          <>
            <View style={styles.card}>
              <View style={styles.catRow}>
                <View style={styles.catChip}><Text style={styles.catChipText}>🏠 CASA · UN TIMBRE</Text></View>
                <Text style={styles.usersBig}>{casaUnidad?.residentesCount ?? 0}</Text>
                <Text style={styles.usersBigLabel}>usuario{(casaUnidad?.residentesCount ?? 0) === 1 ? '' : 's'}</Text>
              </View>
              <TouchableOpacity
                style={styles.entryBtn} activeOpacity={0.85} disabled={!casaUnidad}
                onPress={() => irBulk(casaUnidad)}
              >
                <MaterialCommunityIcons name="account-multiple-plus" size={20} color={COLORS.white} />
                <Text style={styles.entryBtnText}>Cargar usuarios</Text>
              </TouchableOpacity>
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn} disabled={!casaUnidad?.timbre}
                  onPress={() => navigation.navigate('QRViewer', { timbreId: casaUnidad.timbre._id, direccionNombre: edificio.nombre })}
                >
                  <MaterialCommunityIcons name="qrcode" size={18} color={COLORS.primaryDark} />
                  <Text style={styles.secondaryText}>Ver QR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn} disabled={!casaUnidad}
                  onPress={() => navigation.navigate('UnitDetail', { direccionId: casaUnidad._id })}
                >
                  <MaterialCommunityIcons name="cog-outline" size={18} color={COLORS.primaryDark} />
                  <Text style={styles.secondaryText}>Gestionar</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.histBtn} onPress={() => navigation.navigate('EdificioHistorial', { edificioId, nombre: edificio.nombre })}>
              <MaterialCommunityIcons name="history" size={20} color={COLORS.primary} />
              <Text style={styles.histText}>Ver historial de visitas</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray300} />
            </TouchableOpacity>
          </>
        ) : (
          /* ── Cliente MULTI-UNIDAD: edificio/complejo/barrio ── */
          <>
            {/* Timbre de entrada (directorio) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Timbre de entrada</Text>
              <Text style={styles.cardDesc}>
                Pegá este QR en la puerta principal. El visitante ve la lista de unidades y elige a quién tocar.
              </Text>
              <TouchableOpacity
                style={[styles.entryBtn, !entrada && { opacity: 0.5 }]}
                activeOpacity={0.85}
                disabled={!entrada}
                onPress={() => navigation.navigate('QRViewer', { timbreId: entrada._id, direccionNombre: edificio.nombre })}
              >
                <MaterialCommunityIcons name="qrcode" size={20} color={COLORS.white} />
                <Text style={styles.entryBtnText}>Ver / imprimir QR de entrada</Text>
              </TouchableOpacity>
            </View>

            {/* Stats + historial */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{unidades.length}</Text>
                <Text style={styles.statLabel}>Unidades</Text>
              </View>
              <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('EdificioHistorial', { edificioId, nombre: edificio.nombre })}>
                <MaterialCommunityIcons name="history" size={22} color={COLORS.primary} />
                <Text style={styles.statLabel}>Historial</Text>
              </TouchableOpacity>
            </View>

            {/* Carga masiva de unidades */}
            <TouchableOpacity
              style={styles.bulkBtn} activeOpacity={0.9}
              onPress={() => navigation.navigate('BulkUnidades', { edificioId, edificioNombre: edificio.nombre })}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={20} color={COLORS.white} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bulkBtnTitle}>Cargar varias unidades</Text>
                <Text style={styles.bulkBtnSub}>Automático (ej: 10) o manual, con usuario y clave por unidad</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Unidades */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Unidades</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddUnidad', { edificioId })} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
                <Text style={styles.addBtnText}>Una</Text>
              </TouchableOpacity>
            </View>

            {unidades.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="door" size={40} color={COLORS.gray300} />
                <Text style={styles.emptyText}>Todavía no hay unidades.{'\n'}Tocá “Agregar” para crear la primera.</Text>
              </View>
            ) : (
              <View style={styles.unitsCard}>
                {unidades.map((u) => (
                  <UnidadRow key={u._id} unidad={u}
                    onPress={() => navigation.navigate('UnitDetail', { direccionId: u._id })}
                    onBulk={() => irBulk(u)}
                    onDelete={() => eliminarUnidad(u)} />
                ))}
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={eliminarEdificio}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteText}>Eliminar edificio</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, gap: SPACING.xs },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING['2xl'] },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, ...SHADOWS.sm },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.text },
  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 19 },
  entryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, height: 48, borderRadius: RADIUS.md, marginTop: SPACING.base, ...SHADOWS.blue },
  entryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.base },

  statsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  stat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingVertical: SPACING.base, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },

  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.lg, ...SHADOWS.blue },
  bulkBtnTitle: { color: COLORS.white, fontWeight: '800', fontSize: FONT_SIZES.base },
  bulkBtnSub: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZES.xs, marginTop: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 9, paddingHorizontal: 15, ...SHADOWS.blue },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.sm },

  unitsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm },
  unitRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  unitMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingLeft: SPACING.base },
  unitBadge: { minWidth: 44, height: 40, paddingHorizontal: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  unitBadgeText: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.primaryDark },
  unitName: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  unitSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  unitAction: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.base },

  catRow: { alignItems: 'center', marginBottom: SPACING.base },
  catChip: { backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: SPACING.sm },
  catChipText: { fontSize: FONT_SIZES.xs, fontWeight: '800', color: COLORS.primaryDark, letterSpacing: 0.5 },
  usersBig: { fontSize: 44, fontWeight: '900', color: COLORS.text, lineHeight: 48 },
  usersBigLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '600' },
  secondaryRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  secondaryBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 46, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: FONT_SIZES.sm },
  histBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  histText: { flex: 1, fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },

  empty: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.sm, lineHeight: 20 },

  deleteBtn: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base, marginTop: SPACING.xl },
  deleteText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZES.base },
});

export default EdificioDetailScreen;
