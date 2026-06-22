// src/screens/InviteFamilyScreen.js — invitar familiares (mockup 3)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Share, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { direccionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const InviteFamilyScreen = ({ route, navigation }) => {
  const { direccionId } = route.params;
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('familiar');
  const [loading, setLoading] = useState(false);

  const enviarInvitacion = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return Alert.alert('Email inválido', 'Ingresá un email válido.');
    }
    setLoading(true);
    try {
      const { data } = await direccionesAPI.invitar(direccionId, { email: email.trim(), rol });
      const link = data.inviteUrl;
      Alert.alert('✅ Invitación creada', '¿Compartir el enlace ahora?', [
        { text: 'Más tarde', style: 'cancel', onPress: () => navigation.goBack() },
        {
          text: 'Compartir',
          onPress: async () => {
            await Share.share({ message: `Te invito a atender el timbre en S-Doorbell:\n${link}` });
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo crear la invitación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.illustration}>
          <Ionicons name="people-circle" size={120} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Invitá familiares</Text>
        <Text style={styles.desc}>
          Puedes invitar a tus familiares o colaboradores para que también puedan atender el timbre.
        </Text>

        {!showForm ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Invitar familiares</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.outlineBtnText}>Continuar sin invitar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email del invitado</Text>
            <TextInput
              style={styles.input}
              placeholder="ejemplo@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Rol</Text>
            <View style={styles.roles}>
              {['familiar', 'colaborador'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, rol === r && styles.roleChipActive]}
                  onPress={() => setRol(r)}
                >
                  <Text style={[styles.roleText, rol === r && styles.roleTextActive]}>
                    {r === 'familiar' ? 'Familiar' : 'Colaborador'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={enviarInvitacion} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Enviar invitación</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, alignItems: 'flex-end' },
  scroll: { padding: SPACING.xl, alignItems: 'center', flexGrow: 1 },
  illustration: { marginTop: SPACING.lg, marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  desc: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING['2xl'], paddingHorizontal: SPACING.md },
  actions: { width: '100%', gap: SPACING.md },
  primaryBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', ...SHADOWS.gold },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  outlineBtn: { height: 54, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.base, fontWeight: '600' },
  form: { width: '100%', gap: SPACING.sm },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base,
    fontSize: FONT_SIZES.base, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  roles: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  roleChip: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  roleChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  roleText: { color: COLORS.textSecondary, fontWeight: '600' },
  roleTextActive: { color: COLORS.primaryDark },
});

export default InviteFamilyScreen;
