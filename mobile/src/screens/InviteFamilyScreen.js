// src/screens/InviteFamilyScreen.js — invitar familiares (mockup 3)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Share, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { direccionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const mensajeInvite = (link) => `Te invito a atender el timbre en S-Doorbell 🔔\n${link}`;

const InviteFamilyScreen = ({ route, navigation }) => {
  const { direccionId } = route.params;
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('familiar');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState(null);   // enlace ya creado
  const [copiado, setCopiado] = useState(false);

  // Genera un enlace genérico para compartir, SIN pedir el email del familiar.
  // Cualquiera que lo abra puede unirse (crear cuenta / iniciar sesión y aceptar).
  const generarLink = async () => {
    setLoading(true);
    try {
      const { data } = await direccionesAPI.invitar(direccionId, { rol: 'familiar' });
      setLink(data.inviteUrl);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo generar el enlace.');
    } finally {
      setLoading(false);
    }
  };

  const enviarInvitacion = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return Alert.alert('Email inválido', 'Ingresá un email válido.');
    }
    setLoading(true);
    try {
      const { data } = await direccionesAPI.invitar(direccionId, { email: email.trim(), rol });
      // No compartimos dentro de un Alert: en el PWA de iOS eso pierde el gesto
      // del usuario y el compartir falla. Mostramos el enlace con botones que
      // se accionan con un toque directo.
      setLink(data.inviteUrl);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo crear la invitación.');
    } finally {
      setLoading(false);
    }
  };

  // Copiar: en web usa el portapapeles del navegador; si no, comparte.
  const copiarEnlace = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
        return;
      }
      await Share.share({ message: mensajeInvite(link) });
    } catch {
      Alert.alert('Enlace', link);
    }
  };

  // Compartir con un toque directo (mantiene el gesto → navigator.share anda en iOS).
  const compartirEnlace = async () => {
    try {
      await Share.share({ message: mensajeInvite(link) });
    } catch {
      copiarEnlace();
    }
  };

  const compartirWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(mensajeInvite(link))}`;
    Linking.openURL(url).catch(() => copiarEnlace());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={26} color={COLORS.gray500} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.illustration}>
          <MaterialCommunityIcons name="account-group" size={110} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>{link ? '¡Invitación lista!' : 'Invitá familiares'}</Text>
        <Text style={styles.desc}>
          {link
            ? 'Compartí este enlace con la persona. Al abrirlo va a poder unirse y recibir los timbrazos de esta dirección.'
            : 'Puedes invitar a tus familiares o colaboradores para que también puedan atender el timbre.'}
        </Text>

        {link ? (
          <View style={styles.form}>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={2} selectable>{link}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={copiarEnlace} activeOpacity={0.85}>
              <MaterialCommunityIcons name={copiado ? 'check' : 'content-copy'} size={20} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>{copiado ? '¡Copiado!' : 'Copiar enlace'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waBtn} onPress={compartirWhatsApp} activeOpacity={0.85}>
              <MaterialCommunityIcons name="whatsapp" size={20} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Enviar por WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn} onPress={compartirEnlace} activeOpacity={0.8}>
              <Text style={styles.outlineBtnText}>Compartir…</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.linkBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        ) : !showForm ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={generarLink} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <MaterialCommunityIcons name="link-variant" size={20} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Generar enlace para compartir</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
              <Text style={styles.outlineBtnText}>Invitar por email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.linkBtnText}>Continuar sin invitar</Text>
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
  primaryBtn: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.primary, height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', ...SHADOWS.gold },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  waBtn: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: '#25D366', height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { height: 54, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.base, fontWeight: '600' },
  linkBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkBtnText: { color: COLORS.textMuted, fontSize: FONT_SIZES.base, fontWeight: '600' },
  linkBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  linkText: { color: COLORS.primaryDark, fontSize: FONT_SIZES.sm, fontWeight: '600' },
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
