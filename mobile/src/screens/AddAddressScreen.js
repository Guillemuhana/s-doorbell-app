// src/screens/AddAddressScreen.js — crear o editar una dirección
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { direccionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const TIPOS = ['Casa', 'Departamento', 'Oficina', 'Local', 'Otro'];

const AddAddressScreen = ({ route, navigation }) => {
  const direccionId = route.params?.direccionId;
  const isEdit = !!direccionId;

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Casa');
  const [direccion, setDireccion] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await direccionesAPI.get(direccionId);
        setNombre(data.direccion.nombre);
        setTipo(data.direccion.tipo);
        setDireccion(data.direccion.direccion || '');
      } catch { Alert.alert('Error', 'No se pudo cargar la dirección.'); }
      finally { setLoading(false); }
    })();
  }, [direccionId]);

  const guardar = async () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Ingresá un nombre para la dirección.');
    setSaving(true);
    try {
      if (isEdit) {
        await direccionesAPI.update(direccionId, { nombre: nombre.trim(), tipo, direccion: direccion.trim() });
      } else {
        await direccionesAPI.create({ nombre: nombre.trim(), tipo, direccion: direccion.trim() });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo guardar.');
    } finally { setSaving(false); }
  };

  const eliminar = () => {
    Alert.alert('Eliminar dirección', 'Esto borra la dirección, sus timbres y familiares. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await direccionesAPI.delete(direccionId); navigation.navigate('Home'); }
          catch { Alert.alert('Error', 'No se pudo eliminar.'); }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>{isEdit ? 'Editar dirección' : 'Nueva dirección'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} placeholder="Ej: Balcarce 50" placeholderTextColor={COLORS.textMuted}
          value={nombre} onChangeText={setNombre} />

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {TIPOS.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, tipo === t && styles.chipActive]} onPress={() => setTipo(t)}>
              <Text style={[styles.chipText, tipo === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Dirección (opcional)</Text>
        <TextInput style={styles.input} placeholder="Ej: Balcarce 50, CABA" placeholderTextColor={COLORS.textMuted}
          value={direccion} onChangeText={setDireccion} />

        <TouchableOpacity style={styles.primaryBtn} onPress={guardar} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>{isEdit ? 'Guardar cambios' : 'Crear dirección'}</Text>}
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity style={styles.deleteBtn} onPress={eliminar}>
            <Text style={styles.deleteText}>Eliminar dirección</Text>
          </TouchableOpacity>
        )}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONT_SIZES.sm },
  chipTextActive: { color: COLORS.primaryDark },
  primaryBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl, ...SHADOWS.gold },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', paddingVertical: SPACING.base, marginTop: SPACING.sm },
  deleteText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZES.base },
});

export default AddAddressScreen;
