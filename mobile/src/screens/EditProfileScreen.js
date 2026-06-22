// src/screens/EditProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, useColorScheme, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { usuarioAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const Field = ({ label, value, onChangeText, placeholder, keyboardType, isDark, multiline }) => {
  const textColor = isDark ? COLORS.white : COLORS.gray900;
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: isDark ? COLORS.gray400 : COLORS.gray500 }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F5F7', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? COLORS.gray600 : COLORS.gray300}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        selectionColor={COLORS.primary}
      />
    </View>
  );
};

const EditProfileScreen = ({ navigation }) => {
  const { usuario, updateUser } = useAuth();
  const isDark = useColorScheme() === 'dark';

  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    apellido: usuario?.apellido || '',
    telefono: usuario?.telefono || '',
    direccion: usuario?.direccion || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(usuario?.foto_fachada || null);

  const update = (field) => (val) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      Alert.alert('Error', 'Nombre y apellido son requeridos.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await usuarioAPI.update(usuario._id, form);
      await updateUser(data.usuario);
      Alert.alert('✅ Guardado', 'Perfil actualizado correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Error guardando cambios.');
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Necesitamos acceso a tu galería para subir la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFotoPreview(asset.uri);
      await uploadPhoto(asset);
    }
  };

  const uploadPhoto = async (asset) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('foto_fachada', { uri: asset.uri, name: filename, type });

      const { data } = await usuarioAPI.uploadFoto(usuario._id, formData);
      await updateUser({ foto_fachada: data.foto_fachada });
      Alert.alert('✅ Foto subida', 'Foto de fachada actualizada.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta nuevamente.');
      setFotoPreview(usuario?.foto_fachada || null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const bg = isDark ? '#000' : '#F0F0F5';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#fff';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: isDark ? '#0A0A0A' : COLORS.primary }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtn}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={styles.saveBtn}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            {/* Photo */}
            <View style={[styles.photoCard, { backgroundColor: cardBg }]}>
              <TouchableOpacity onPress={pickPhoto} style={styles.photoContainer} activeOpacity={0.8}>
                {fotoPreview ? (
                  <Image source={{ uri: fotoPreview }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoIcon}>🏠</Text>
                    <Text style={styles.photoHint}>Foto de fachada</Text>
                  </View>
                )}
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoOverlayText}>
                    {uploadingPhoto ? '⏳ Subiendo...' : '📷 Cambiar foto'}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.photoCaption}>
                Esta foto aparecerá en la página del visitante
              </Text>
            </View>

            {/* Form */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Field label="NOMBRE" value={form.nombre} onChangeText={update('nombre')} placeholder="Tu nombre" isDark={isDark} />
              <Field label="APELLIDO" value={form.apellido} onChangeText={update('apellido')} placeholder="Tu apellido" isDark={isDark} />
              <Field label="TELÉFONO" value={form.telefono} onChangeText={update('telefono')} placeholder="+54 9 11 1234-5678" keyboardType="phone-pad" isDark={isDark} />
              <Field label="DIRECCIÓN" value={form.direccion} onChangeText={update('direccion')} placeholder="Calle 123, Ciudad" isDark={isDark} multiline />
            </View>

            <TouchableOpacity
              style={[styles.saveButtonFull, { opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  cancelBtn: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZES.base },
  saveBtn: { color: COLORS.white, fontSize: FONT_SIZES.base, fontWeight: '700' },
  content: { padding: SPACING.base, gap: SPACING.md },
  photoCard: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm },
  photoContainer: { height: 200, position: 'relative' },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,122,255,0.08)' },
  photoIcon: { fontSize: 50 },
  photoHint: { color: COLORS.gray400, marginTop: SPACING.sm, fontSize: FONT_SIZES.sm },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  photoOverlayText: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  photoCaption: { color: COLORS.gray400, fontSize: FONT_SIZES.xs, textAlign: 'center', padding: SPACING.sm },
  card: { borderRadius: RADIUS.xl, padding: SPACING.base, gap: SPACING.md, ...SHADOWS.sm },
  fieldGroup: {},
  fieldLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.xs },
  fieldInput: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.base,
  },
  multilineInput: { height: 80, textAlignVertical: 'top' },
  saveButtonFull: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    height: 56, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.blue,
  },
  saveButtonText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
});

export default EditProfileScreen;
