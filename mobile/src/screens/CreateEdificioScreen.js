// src/screens/CreateEdificioScreen.js — crear un edificio/complejo
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { edificiosAPI, direccionesAPI } from '../utils/api';
import { buildImageFormData } from '../utils/imageUpload';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

// Categorías de cliente (para agrupar el cpanel). 'Casa' = un solo timbre con
// N usuarios; el resto son multi-unidad con timbre de entrada tipo directorio.
const CATEGORIAS = [
  { key: 'Casa', label: 'Casa · un timbre', icon: 'home', desc: 'Un timbre con varios usuarios' },
  { key: 'Edificio', label: 'Edificio', icon: 'office-building', desc: 'Varias unidades + entrada' },
  { key: 'Complejo', label: 'Complejo', icon: 'city-variant-outline', desc: 'Varias unidades + entrada' },
  { key: 'Barrio', label: 'Barrio cerrado', icon: 'home-group', desc: 'Varios lotes + entrada' },
];

const CreateEdificioScreen = ({ navigation }) => {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Casa');
  const [direccion, setDireccion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [foto, setFoto] = useState(null); // asset de la foto de fachada
  const [saving, setSaving] = useState(false);

  const esCasa = categoria === 'Casa';

  const elegirFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [16, 9] });
    if (!result.canceled) setFoto(result.assets[0]);
  };

  const guardar = async () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ingresá un nombre para el cliente.');
    setSaving(true);
    try {
      const { data } = await edificiosAPI.create({
        nombre: nombre.trim(), categoria, direccion: direccion.trim(), codigoPostal: codigoPostal.trim(),
      });
      const edificioId = data.edificio._id;
      // Subir la foto de fachada (el edificio es una dirección → reusa el endpoint).
      if (foto) {
        try {
          const form = await buildImageFormData('foto', foto);
          await direccionesAPI.uploadFoto(edificioId, form);
        } catch { /* si falla la foto, no bloqueamos la creación */ }
      }
      // Casa = un timbre → al panel. Edificio/complejo/barrio → a cargar las unidades.
      if (esCasa) {
        navigation.replace('EdificioDetail', { edificioId });
      } else {
        navigation.replace('BulkUnidades', { edificioId, edificioNombre: nombre.trim() });
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo crear el cliente.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Nuevo cliente</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo de cliente</Text>
        <View style={styles.catGrid}>
          {CATEGORIAS.map((c) => (
            <TouchableOpacity key={c.key} style={[styles.catCard, categoria === c.key && styles.catCardActive]} onPress={() => setCategoria(c.key)} activeOpacity={0.85}>
              <MaterialCommunityIcons name={c.icon} size={24} color={categoria === c.key ? COLORS.primaryDark : COLORS.textSecondary} />
              <Text style={[styles.catLabel, categoria === c.key && { color: COLORS.primaryDark }]}>{c.label}</Text>
              <Text style={styles.catDesc}>{c.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hint}>
          <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primaryDark} />
          <Text style={styles.hintText}>
            {esCasa
              ? 'Se crea un timbre con su QR. Después le cargás los usuarios (2, 5, 25… los que pida el cliente).'
              : 'Se crea un timbre de entrada tipo directorio. Después agregás las unidades y a cada una sus usuarios.'}
          </Text>
        </View>

        <Text style={styles.label}>{esCasa ? 'Nombre del cliente' : 'Nombre del edificio'}</Text>
        <TextInput style={styles.input} placeholder={esCasa ? 'Ej: Familia Pérez' : 'Ej: Torre Belgrano'} placeholderTextColor={COLORS.textMuted}
          value={nombre} onChangeText={setNombre} />

        <Text style={styles.label}>Dirección</Text>
        <TextInput style={styles.input} placeholder="Ej: Av. Belgrano 1234, CABA" placeholderTextColor={COLORS.textMuted}
          value={direccion} onChangeText={setDireccion} />

        <Text style={styles.label}>Código postal (opcional)</Text>
        <TextInput style={styles.input} placeholder="Ej: 1425" placeholderTextColor={COLORS.textMuted}
          value={codigoPostal} onChangeText={setCodigoPostal} keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>Foto de la fachada (opcional)</Text>
        <TouchableOpacity style={styles.fotoBox} onPress={elegirFoto} activeOpacity={0.85}>
          {foto ? (
            <Image source={{ uri: foto.uri }} style={styles.fotoPreview} resizeMode="cover" />
          ) : (
            <>
              <MaterialCommunityIcons name="camera-plus-outline" size={26} color={COLORS.textMuted} />
              <Text style={styles.fotoText}>Agregar foto de la fachada</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={guardar} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : (
            <Text style={styles.primaryBtnText}>{esCasa ? 'Crear cliente' : 'Crear y cargar unidades'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  scroll: { padding: SPACING.lg, gap: SPACING.xs },
  hint: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md, padding: SPACING.base, marginBottom: SPACING.sm },
  hintText: { flex: 1, color: COLORS.primaryDark, fontSize: FONT_SIZES.sm, lineHeight: 19 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base,
    fontSize: FONT_SIZES.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  catCard: { width: '48%', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.base, gap: 4 },
  catCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  catLabel: { fontSize: FONT_SIZES.base, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  catDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  fotoBox: { height: 150, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.background, overflow: 'hidden' },
  fotoPreview: { width: '100%', height: '100%' },
  fotoText: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONT_SIZES.sm },
  chipTextActive: { color: COLORS.primaryDark },
  primaryBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl, ...SHADOWS.blue },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

export default CreateEdificioScreen;
