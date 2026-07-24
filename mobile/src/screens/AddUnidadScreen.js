// src/screens/AddUnidadScreen.js — agregar una unidad (depto/lote) a un edificio
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { edificiosAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const AddUnidadScreen = ({ route, navigation }) => {
  const { edificioId } = route.params || {};
  const [unidad, setUnidad] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!nombre.trim() && !unidad.trim()) {
      return Alert.alert('Faltan datos', 'Ingresá al menos la etiqueta de la unidad (ej: 4°B) o un nombre.');
    }
    setSaving(true);
    try {
      const { data } = await edificiosAPI.addUnidad(edificioId, {
        nombre: (nombre.trim() || unidad.trim()),
        unidad: unidad.trim(),
        email: email.trim() || undefined,
      });
      if (data.inviteUrl) {
        Alert.alert(
          'Unidad creada',
          'Se generó una invitación para el residente. ¿Querés compartir el enlace ahora?',
          [
            { text: 'Más tarde', style: 'cancel', onPress: () => navigation.goBack() },
            {
              text: 'Compartir enlace',
              onPress: async () => {
                try { await Share.share({ message: `Sumate al timbre de tu unidad: ${data.inviteUrl}` }); } catch {}
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo crear la unidad.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Nueva unidad</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Etiqueta de la unidad</Text>
        <TextInput style={styles.input} placeholder="Ej: 4°B, Lote 12, PB" placeholderTextColor={COLORS.textMuted}
          value={unidad} onChangeText={setUnidad} autoCapitalize="characters" />

        <Text style={styles.label}>Nombre / familia (opcional)</Text>
        <TextInput style={styles.input} placeholder="Ej: Familia Pérez" placeholderTextColor={COLORS.textMuted}
          value={nombre} onChangeText={setNombre} />

        <Text style={styles.label}>Invitar residente por email (opcional)</Text>
        <TextInput style={styles.input} placeholder="residente@email.com" placeholderTextColor={COLORS.textMuted}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Text style={styles.helper}>
          Si no ponés email, igual se crea la unidad con su QR y podés invitar al residente después.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={guardar} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Crear unidad</Text>}
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
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base,
    fontSize: FONT_SIZES.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  helper: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: SPACING.xs, lineHeight: 17 },
  primaryBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl, ...SHADOWS.blue },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

export default AddUnidadScreen;
