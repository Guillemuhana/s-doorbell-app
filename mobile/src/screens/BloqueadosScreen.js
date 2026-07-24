// src/screens/BloqueadosScreen.js — visitantes bloqueados (ver y desbloquear)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { direccionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const BloqueadosScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await direccionesAPI.list();
      const dirs = data.direcciones || [];
      const listas = await Promise.all(dirs.map(async (d) => {
        try {
          const r = await direccionesAPI.getBloqueos(d._id);
          return (r.data.bloqueos || []).map((b) => ({ ...b, direccionNombre: d.nombre }));
        } catch { return []; }
      }));
      setItems(listas.flat());
    } catch (err) {
      console.warn('Error bloqueados:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const desbloquear = (b) => {
    Alert.alert('Desbloquear', `¿Volver a permitir a ${b.visitorName || 'este visitante'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear', onPress: async () => {
          try { await direccionesAPI.desbloquear(b.direccionId, b._id); fetchData(); }
          catch { Alert.alert('Error', 'No se pudo desbloquear.'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Visitantes bloqueados</Text>
          <Text style={styles.subtitle}>No pueden tocar tu timbre ni llamarte</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="shield-check-outline" size={46} color={COLORS.gray300} />
            <Text style={styles.emptyText}>
              No tenés a nadie bloqueado.{'\n'}
              Si alguien te molesta, bloquealo desde el historial de timbrazos.
            </Text>
          </View>
        ) : (
          items.map((b) => (
            <View key={b._id} style={styles.card}>
              <View style={styles.icon}>
                <MaterialCommunityIcons name="account-cancel" size={22} color={COLORS.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.visitorName || 'Visitante sin nombre'}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {b.direccionNombre}{b.visitorIp ? ` · ${b.visitorIp}` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => desbloquear(b)}>
                <Text style={styles.unblockText}>Desbloquear</Text>
              </TouchableOpacity>
            </View>
          ))
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
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, ...SHADOWS.sm },
  icon: { width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,59,48,0.1)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  unblockBtn: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary },
  unblockText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: FONT_SIZES.sm },
  empty: { alignItems: 'center', padding: SPACING['2xl'], gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.sm, lineHeight: 20 },
});

export default BloqueadosScreen;
