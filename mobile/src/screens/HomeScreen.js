// src/screens/HomeScreen.js — "Mis direcciones"
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ImageBackground, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { direccionesAPI } from '../utils/api';
import { clearBadge } from '../utils/notifications';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const DireccionCard = ({ direccion, onPress, onInvite }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
    <ImageBackground
      source={direccion.foto ? { uri: direccion.foto } : undefined}
      style={styles.cardImage}
      imageStyle={{ borderRadius: RADIUS.xl }}
    >
      {!direccion.foto && (
        <LinearGradient colors={['#3C3C42', '#19191C']} style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.xl }]} />
      )}
      <View style={styles.cardOverlay}>
        {/* Top row: familiares badge + invite */}
        <View style={styles.cardTop}>
          <View style={styles.badge}>
            <Ionicons name="people" size={13} color={COLORS.white} />
            <Text style={styles.badgeText}>{direccion.familiaresCount ?? 1}</Text>
          </View>
          <TouchableOpacity style={styles.inviteIcon} onPress={onInvite}>
            <Ionicons name="person-add" size={16} color={COLORS.gray900} />
          </TouchableOpacity>
        </View>

        {/* Bottom: name + type */}
        <View style={styles.cardBottom}>
          <View style={styles.homeIconWrap}>
            <Ionicons name="home" size={14} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{direccion.nombre}</Text>
            <Text style={styles.cardSub}>
              {direccion.tipo} {direccion.direccion ? `| ${direccion.direccion}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
  const { usuario } = useAuth();
  const [direcciones, setDirecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await direccionesAPI.list();
      setDirecciones(data.direcciones || []);
    } catch (err) {
      console.warn('Error cargando direcciones:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      clearBadge();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Text style={styles.greeting}>¡Hola, {usuario?.nombre}!</Text>

        {/* Visitas esperando */}
        <View style={styles.waitCard}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.gray400} />
          <Text style={styles.waitText}>No tienes visitas esperando</Text>
        </View>

        {/* Mis direcciones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis direcciones</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddAddress')}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : direcciones.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={40} color={COLORS.gray300} />
            <Text style={styles.emptyText}>Todavía no tenés direcciones.{'\n'}Tocá + para agregar la primera.</Text>
          </View>
        ) : (
          direcciones.map((d) => (
            <DireccionCard
              key={d._id}
              direccion={d}
              onPress={() => navigation.navigate('UnitDetail', { direccionId: d._id })}
              onInvite={() => navigation.navigate('InviteFamily', { direccionId: d._id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING['3xl'] },
  greeting: { fontSize: FONT_SIZES['2xl'], fontWeight: '800', color: COLORS.text, marginBottom: SPACING.base },
  waitCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  waitText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.base, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  addBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.gold,
  },
  card: { height: 180, marginBottom: SPACING.base, borderRadius: RADIUS.xl, ...SHADOWS.md },
  cardImage: { flex: 1, justifyContent: 'space-between' },
  cardOverlay: { flex: 1, justifyContent: 'space-between', padding: SPACING.md, borderRadius: RADIUS.xl, backgroundColor: 'rgba(0,0,0,0.12)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.xs },
  inviteIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  homeIconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '800' },
  cardSub: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZES.xs, marginTop: 1 },
  empty: { alignItems: 'center', padding: SPACING['2xl'], gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.sm, lineHeight: 20 },
});

export default HomeScreen;
