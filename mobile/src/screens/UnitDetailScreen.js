// src/screens/UnitDetailScreen.js — detalle de una dirección (mockup 2)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, ActivityIndicator, Alert, RefreshControl, Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { direccionesAPI, timbresAPI } from '../utils/api';
import { buildImageFormData } from '../utils/imageUpload';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const CircleAction = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.circleWrap} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.circle, active && styles.circleActive]}>
      <MaterialCommunityIcons name={icon} size={22} color={active ? COLORS.white : COLORS.gray700} />
    </View>
    <Text style={styles.circleLabel}>{label}</Text>
  </TouchableOpacity>
);

const UnitDetailScreen = ({ route, navigation }) => {
  const { direccionId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await direccionesAPI.get(direccionId);
      setData(res.data);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar la dirección.');
    } finally {
      setLoading(false);
    }
  }, [direccionId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const esDueno = data?.rol === 'dueño';

  const cambiarFoto = async () => {
    if (!esDueno) return Alert.alert('Solo el dueño puede cambiar la foto.');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [16, 9] });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const form = await buildImageFormData('foto', asset);
      await direccionesAPI.uploadFoto(direccionId, form);
      fetchData();
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto.');
    }
  };

  // Exigir ubicación (modo_geo): el visitante debe compartir su ubicación para
  // poder tocar el timbre. Evita que timbren de lejos o al pasar escaneando.
  const toggleGeo = async (timbre, valor) => {
    if (!esDueno) return Alert.alert('Solo el dueño puede cambiar esto.');
    // Optimista: reflejamos el cambio en pantalla mientras guarda.
    setData((prev) => prev && {
      ...prev,
      timbres: prev.timbres.map((t) => (t._id === timbre._id ? { ...t, modoGeo: valor } : t)),
    });
    try {
      await timbresAPI.update(timbre._id, { modoGeo: valor });
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cambio.');
      fetchData();
    }
  };

  const agregarTimbre = () => {
    if (!esDueno) return Alert.alert('Solo el dueño puede agregar timbres.');
    Alert.alert('Nuevo timbre', '¿Agregar un timbre "Puerta"?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Agregar',
        onPress: async () => {
          try { await direccionesAPI.crearTimbre(direccionId, { nombre: 'Puerta' }); fetchData(); }
          catch { Alert.alert('Error', 'No se pudo crear el timbre.'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // Si la carga falló, mostrar un estado de error en vez de crashear.
  if (!data || !data.direccion) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top']}>
        <MaterialCommunityIcons name="home-alert" size={48} color={COLORS.gray300} />
        <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.md }}>No se pudo cargar la dirección.</Text>
        <TouchableOpacity style={{ marginTop: SPACING.lg }} onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { direccion, timbres = [], familiares = [] } = data;
  const timbrePrincipal = timbres[0];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header con foto */}
        <ImageBackground
          source={direccion.foto ? { uri: direccion.foto } : undefined}
          style={styles.hero}
        >
          {!direccion.foto && <LinearGradient colors={['#3C3C42', '#19191C']} style={StyleSheet.absoluteFillObject} />}
          <SafeAreaView edges={['top']} style={styles.heroTop}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TouchableOpacity style={styles.heroBtnGold} onPress={() => esDueno ? navigation.navigate('AddAddress', { direccionId }) : null}>
                <MaterialCommunityIcons name="cog-outline" size={19} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtnGold} onPress={cambiarFoto}>
                <MaterialCommunityIcons name="image-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          {direccion.activa && (
            <View style={styles.activaBadge}>
              <View style={styles.activaDot} />
              <Text style={styles.activaText}>Unidad activa</Text>
            </View>
          )}
        </ImageBackground>

        <View style={styles.body}>
          <Text style={styles.title}>{direccion.nombre}</Text>
          <Text style={styles.subtitle}>{direccion.direccion || direccion.tipo}</Text>

          {/* Acciones circulares */}
          <View style={styles.circles}>
            <CircleAction icon="bell" label="Timbre" active
              onPress={() => timbrePrincipal
                ? navigation.navigate('QRViewer', { timbreId: timbrePrincipal._id, direccionNombre: direccion.nombre })
                : agregarTimbre()} />
            <CircleAction icon="map-marker-outline" label="Ubicación"
              onPress={() => Alert.alert(direccion.nombre, direccion.direccion || 'Sin dirección cargada')} />
            <CircleAction icon="camera-outline" label="Foto" onPress={cambiarFoto} />
            <CircleAction icon="flask-outline" label="Probar"
              onPress={() => timbrePrincipal && navigation.navigate('VisitorTest', { qrId: timbrePrincipal.qrId })} />
          </View>

          {/* Timbres */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Timbres</Text>
            <TouchableOpacity style={styles.plus} onPress={agregarTimbre}>
              <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {timbres.map((t) => (
            <View key={t._id} style={styles.timbreCard}>
              <TouchableOpacity style={styles.row}
                onPress={() => navigation.navigate('QRViewer', { timbreId: t._id, direccionNombre: direccion.nombre })}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons name="bell" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowSub}>{t.tipo}</Text>
                  <Text style={styles.rowTitle}>{t.nombre}</Text>
                </View>
                <MaterialCommunityIcons name="qrcode" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
              {esDueno && (
                <View style={styles.geoRow}>
                  <MaterialCommunityIcons name="map-marker-radius" size={18} color={t.modoGeo ? COLORS.primary : COLORS.gray400} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.geoTitle}>Exigir ubicación</Text>
                    <Text style={styles.geoSub}>El visitante debe compartir su ubicación para tocar.</Text>
                  </View>
                  <Switch
                    value={!!t.modoGeo}
                    onValueChange={(v) => toggleGeo(t, v)}
                    trackColor={{ true: COLORS.primary, false: COLORS.gray300 }}
                    thumbColor={COLORS.white}
                  />
                </View>
              )}
            </View>
          ))}

          {/* Familiares */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Familiares</Text>
            <TouchableOpacity style={styles.plus} onPress={() => navigation.navigate('InviteFamily', { direccionId })}>
              <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {familiares.map((f) => (
            <View key={f.membershipId} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{f.usuario?.nombre?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowSub}>{f.rol === 'dueño' ? 'Dueño' : f.rol === 'colaborador' ? 'Colaborador' : 'Familiar'}</Text>
                <Text style={styles.rowTitle}>{f.nombreCompleto}</Text>
              </View>
              {f.rol === 'dueño' && <MaterialCommunityIcons name="shield-check" size={18} color={COLORS.primary} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { height: 230, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.base },
  heroBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
  },
  heroBtnGold: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, ...SHADOWS.gold,
  },
  activaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6, margin: SPACING.base,
  },
  activaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  activaText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '600' },
  body: { padding: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  circles: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: SPACING.xl, paddingHorizontal: SPACING.sm },
  circleWrap: { alignItems: 'center', gap: 6 },
  circle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  circleActive: { backgroundColor: COLORS.primary, ...SHADOWS.gold },
  circleLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  rowTitle: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  timbreCard: { marginBottom: SPACING.sm },
  geoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 0,
    borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -SPACING.sm - 1,
  },
  geoTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text },
  geoSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brand, fontWeight: '800', fontSize: FONT_SIZES.md },
});

export default UnitDetailScreen;
