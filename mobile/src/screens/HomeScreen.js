// src/screens/HomeScreen.js — Inicio (estilo pro, con banner y accesos)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ImageBackground, Image, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { direccionesAPI } from '../utils/api';
import { clearBadge } from '../utils/notifications';
import BannerCarousel from '../components/BannerCarousel';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const DireccionCard = ({ direccion, onPress }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
    <ImageBackground
      source={direccion.foto ? { uri: direccion.foto } : undefined}
      style={styles.cardImage}
      imageStyle={styles.cardImageRadius}
    >
      {!direccion.foto && (
        <LinearGradient colors={['#2E9BE0', '#1E5B8F']} style={[StyleSheet.absoluteFillObject, styles.cardImageRadius]} />
      )}
      <LinearGradient colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.55)']} style={[StyleSheet.absoluteFillObject, styles.cardImageRadius]} />
      <View style={styles.cardOverlay}>
        <View style={styles.cardTop}>
          {direccion.activa && (
            <View style={styles.activaBadge}>
              <View style={styles.activaDot} />
              <Text style={styles.activaText}>Activa</Text>
            </View>
          )}
          <View style={styles.famPill}>
            <MaterialCommunityIcons name="account-group" size={13} color={COLORS.white} />
            <Text style={styles.famPillText}>{direccion.familiaresCount ?? 1}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.homeIconWrap}>
            <MaterialCommunityIcons name="home" size={18} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{direccion.nombre}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              <MaterialCommunityIcons name="map-marker" size={12} color="rgba(255,255,255,0.85)" />
              {' '}{direccion.direccion || direccion.tipo}
            </Text>
          </View>
          <View style={styles.cardChevron}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.gray700} />
          </View>
        </View>
      </View>
    </ImageBackground>
  </TouchableOpacity>
);

const ActionTile = ({ icon, label, sub, onPress }) => (
  <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text>
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

  useFocusEffect(useCallback(() => { fetchData(); clearBadge(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const principal = direcciones[0];
  const irHistorial = () => navigation.getParent()?.navigate('PerfilTab', { screen: 'Notifications' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.topbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>¡Hola, {usuario?.nombre || ''}! 👋</Text>
            <Text style={styles.subgreeting}>Bienvenido a tu timbre digital</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={irHistorial}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.text} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Estado */}
        <TouchableOpacity style={styles.statusCard} activeOpacity={0.85} onPress={irHistorial}>
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>No tienes visitas esperando</Text>
            <Text style={styles.statusSub}>Cuando alguien toque el timbre, lo verás aquí.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.gray300} />
        </TouchableOpacity>

        {/* Mis direcciones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis direcciones</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddAddress')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : direcciones.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="home-plus-outline" size={44} color={COLORS.gray300} />
            <Text style={styles.emptyText}>Todavía no tenés direcciones.{'\n'}Tocá “Agregar” para crear la primera.</Text>
          </View>
        ) : (
          direcciones.map((d) => (
            <DireccionCard key={d._id} direccion={d}
              onPress={() => navigation.navigate('UnitDetail', { direccionId: d._id })} />
          ))
        )}

        {/* Banner carrusel (efecto cubo) */}
        {principal && (
          <BannerCarousel onPress={() => navigation.navigate('UnitDetail', { direccionId: principal._id })} />
        )}

        {/* Accesos rápidos */}
        {principal && (
          <View style={styles.tilesRow}>
            <ActionTile icon="bell" label="Timbres" sub={`${principal.timbresCount ?? 1} timbre${(principal.timbresCount ?? 1) === 1 ? '' : 's'}`}
              onPress={() => navigation.navigate('UnitDetail', { direccionId: principal._id })} />
            <ActionTile icon="account-group" label="Familiares" sub={`${principal.familiaresCount ?? 1} usuario${(principal.familiaresCount ?? 1) === 1 ? '' : 's'}`}
              onPress={() => navigation.navigate('InviteFamily', { direccionId: principal._id })} />
            <ActionTile icon="clock-outline" label="Historial" sub="Ver actividad" onPress={irHistorial} />
            <ActionTile icon="cog-outline" label="Ajustes" sub="Mi perfil"
              onPress={() => navigation.getParent()?.navigate('PerfilTab', { screen: 'Profile' })} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING['2xl'] },

  topbar: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.lg },
  greeting: { fontSize: FONT_SIZES['2xl'], fontWeight: '800', color: COLORS.text },
  subgreeting: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  bellBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  bellDot: { position: 'absolute', top: 12, right: 13, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary, borderWidth: 1.5, borderColor: COLORS.surface },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl, ...SHADOWS.sm,
  },
  statusIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  statusSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 9, paddingHorizontal: 15, ...SHADOWS.blue },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.sm },

  card: { height: 200, marginBottom: SPACING.lg, borderRadius: RADIUS.xl, ...SHADOWS.md },
  cardImage: { flex: 1 },
  cardImageRadius: { borderRadius: RADIUS.xl },
  cardOverlay: { flex: 1, justifyContent: 'space-between', padding: SPACING.base },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  activaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 11, paddingVertical: 6 },
  activaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  activaText: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZES.xs },
  famPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  famPillText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.xs },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  homeIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.blue },
  cardName: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: '800' },
  cardSub: { color: 'rgba(255,255,255,0.9)', fontSize: FONT_SIZES.xs, marginTop: 2 },
  cardChevron: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },

  banner: {
    borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg,
    backgroundColor: '#0A1526', ...SHADOWS.md,
  },
  bannerImg: { width: '100%', height: 212 },

  tilesRow: { flexDirection: 'row', gap: SPACING.sm },
  tile: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingVertical: SPACING.md, paddingHorizontal: 4, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: COLORS.border },
  tileLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.text },
  tileSub: { fontSize: 9, color: COLORS.textMuted },

  empty: { alignItems: 'center', padding: SPACING['2xl'], gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.sm, lineHeight: 20 },
});

export default HomeScreen;
