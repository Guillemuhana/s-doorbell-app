// src/screens/EdificiosScreen.js — lista de edificios/complejos que administra el usuario
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

// Orden y presentación de las categorías de cliente en el cpanel.
const GRUPOS = [
  { key: 'Edificio', titulo: '🏢 Edificios', icon: 'office-building' },
  { key: 'Complejo', titulo: '🏙️ Complejos', icon: 'city-variant-outline' },
  { key: 'Barrio', titulo: '🏘️ Barrios cerrados', icon: 'home-group' },
  { key: 'Casa', titulo: '🏠 Casas', icon: 'home' },
];
const ICON_CAT = { Edificio: 'office-building', Complejo: 'city-variant-outline', Barrio: 'home-group', Casa: 'home' };

const EdificioCard = ({ edificio, onPress }) => {
  const esCasa = edificio.categoria === 'Casa';
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name={ICON_CAT[edificio.categoria] || 'office-building'} size={26} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{edificio.nombre}</Text>
        {!!edificio.direccion && (
          <Text style={styles.cardSub} numberOfLines={1}>
            <MaterialCommunityIcons name="map-marker" size={12} color={COLORS.textMuted} /> {edificio.direccion}
          </Text>
        )}
        <View style={styles.cardMeta}>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name={esCasa ? 'account-group' : 'door'} size={12} color={COLORS.primaryDark} />
            <Text style={styles.metaText}>
              {esCasa
                ? 'Timbre + usuarios'
                : `${edificio.unidadesCount ?? 0} unidad${(edificio.unidadesCount ?? 0) === 1 ? '' : 'es'}`}
            </Text>
          </View>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.gray300} />
    </TouchableOpacity>
  );
};

const EdificiosScreen = ({ navigation }) => {
  const [edificios, setEdificios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await edificiosAPI.list();
      setEdificios(data.edificios || []);
    } catch (err) {
      console.warn('Error cargando edificios:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>Casas, edificios, complejos y barrios</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <TouchableOpacity style={styles.createBtn} activeOpacity={0.9} onPress={() => navigation.navigate('CreateEdificio')}>
          <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.white} />
          <Text style={styles.createBtnText}>Crear cliente</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : edificios.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="office-building-outline" size={46} color={COLORS.gray300} />
            <Text style={styles.emptyText}>
              Todavía no tenés clientes cargados.{'\n'}
              Tocá “Crear” para dar de alta el primero (casa, edificio, complejo o barrio).
            </Text>
          </View>
        ) : (
          GRUPOS.map((g) => {
            const items = edificios.filter((e) => (e.categoria || 'Edificio') === g.key);
            if (!items.length) return null;
            return (
              <View key={g.key} style={{ marginBottom: SPACING.md }}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{g.titulo}</Text>
                  <View style={styles.groupCount}><Text style={styles.groupCountText}>{items.length}</Text></View>
                </View>
                {items.map((e) => (
                  <EdificioCard key={e._id} edificio={e}
                    onPress={() => navigation.navigate('EdificioDetail', { edificioId: e._id })} />
                ))}
              </View>
            );
          })
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

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, height: 52, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, ...SHADOWS.blue,
  },
  createBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },

  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, marginTop: SPACING.xs },
  groupTitle: { fontSize: FONT_SIZES.base, fontWeight: '800', color: COLORS.text },
  groupCount: { backgroundColor: COLORS.gray100, borderRadius: RADIUS.full, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  groupCountText: { fontSize: FONT_SIZES.xs, fontWeight: '800', color: COLORS.textSecondary },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  cardIcon: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.text },
  cardSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  metaText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primaryDark },

  empty: { alignItems: 'center', padding: SPACING['2xl'], gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZES.sm, lineHeight: 20 },
});

export default EdificiosScreen;
