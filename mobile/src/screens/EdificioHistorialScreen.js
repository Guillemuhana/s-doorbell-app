// src/screens/EdificioHistorialScreen.js — actividad de todas las unidades del edificio
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { edificiosAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const ICONO = {
  timbrazo: { icon: 'bell-ring', color: COLORS.primary },
  vista_qr: { icon: 'qrcode-scan', color: COLORS.textSecondary },
};

const fmtFecha = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const EventoRow = ({ ev }) => {
  const meta = ICONO[ev.tipo] || { icon: 'circle-outline', color: COLORS.gray400 };
  const unidad = ev.direccionId?.nombre || 'Unidad';
  const label = ev.tipo === 'timbrazo'
    ? `${ev.visitorName || 'Alguien'} tocó el timbre`
    : 'Escaneó el QR';
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: meta.color + '1A' }]}>
        <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{label}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{unidad} · {fmtFecha(ev.createdAt)}</Text>
      </View>
    </View>
  );
};

const EdificioHistorialScreen = ({ route, navigation }) => {
  const { edificioId, nombre } = route.params || {};
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await edificiosAPI.historial(edificioId);
      setEventos(data.eventos || []);
    } catch (err) {
      console.warn('Error historial edificio:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [edificioId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Historial</Text>
          {!!nombre && <Text style={styles.subtitle} numberOfLines={1}>{nombre}</Text>}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : eventos.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={44} color={COLORS.gray300} />
            <Text style={styles.emptyText}>Todavía no hay actividad en el edificio.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {eventos.map((ev) => <EventoRow key={ev._id} ev={ev} />)}
          </View>
        )}
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
  listCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: { width: 38, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  rowSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', padding: SPACING['2xl'], gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.sm, lineHeight: 20 },
});

export default EdificioHistorialScreen;
