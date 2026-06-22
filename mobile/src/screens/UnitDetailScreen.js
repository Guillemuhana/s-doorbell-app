// src/screens/UnitDetailScreen.js — detalle de una dirección (mockup 2)
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { direccionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const CircleAction = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.circleWrap} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.circle, active && styles.circleActive]}>
      <Ionicons name={icon} size={22} color={active ? COLORS.white : COLORS.gray700} />
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
    const form = new FormData();
    form.append('foto', { uri: asset.uri, name: 'foto.jpg', type: 'image/jpeg' });
    try {
      await direccionesAPI.uploadFoto(direccionId, form);
      fetchData();
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto.');
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
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TouchableOpacity style={styles.heroBtnGold} onPress={() => esDueno ? navigation.navigate('AddAddress', { direccionId }) : null}>
                <Ionicons name="settings-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtnGold} onPress={cambiarFoto}>
                <Ionicons name="image-outline" size={18} color={COLORS.white} />
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
            <CircleAction icon="notifications" label="Timbre" active
              onPress={() => timbrePrincipal
                ? navigation.navigate('QRViewer', { timbreId: timbrePrincipal._id, direccionNombre: direccion.nombre })
                : agregarTimbre()} />
            <CircleAction icon="location-outline" label="Ubicación"
              onPress={() => Alert.alert(direccion.nombre, direccion.direccion || 'Sin dirección cargada')} />
            <CircleAction icon="camera-outline" label="Foto" onPress={cambiarFoto} />
            <CircleAction icon="flask-outline" label="Probar"
              onPress={() => timbrePrincipal && navigation.navigate('VisitorTest', { qrId: timbrePrincipal.qrId })} />
          </View>

          {/* Timbres */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Timbres</Text>
            <TouchableOpacity style={styles.plus} onPress={agregarTimbre}>
              <Ionicons name="add" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {timbres.map((t) => (
            <TouchableOpacity key={t._id} style={styles.row}
              onPress={() => navigation.navigate('QRViewer', { timbreId: t._id, direccionNombre: direccion.nombre })}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowSub}>{t.tipo}</Text>
                <Text style={styles.rowTitle}>{t.nombre}</Text>
              </View>
              <Ionicons name="qr-code-outline" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          ))}

          {/* Familiares */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Familiares</Text>
            <TouchableOpacity style={styles.plus} onPress={() => navigation.navigate('InviteFamily', { direccionId })}>
              <Ionicons name="add" size={20} color={COLORS.white} />
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
              {f.rol === 'dueño' && <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />}
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
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  circleActive: { backgroundColor: COLORS.primary, ...SHADOWS.gold },
  circleLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  rowTitle: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brand, fontWeight: '800', fontSize: FONT_SIZES.md },
});

export default UnitDetailScreen;
