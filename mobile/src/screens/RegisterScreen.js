// src/screens/RegisterScreen.js
// Crear cuenta. Sirve para dueños nuevos y, sobre todo, para familiares que
// llegaron por un link de invitación (/invitacion/:token) y todavía no tienen
// cuenta: se registran acá y después la app procesa la invitación pendiente.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { getPendingInvite } from '../utils/pendingInvite';
import { invitacionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [invitacion, setInvitacion] = useState(null); // info si vino por link
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ¿Vino por un link de invitación? Mostramos un cartel con quién invita.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const token = await getPendingInvite();
      if (!token || !vivo) return;
      try {
        const { data } = await invitacionesAPI.get(token);
        if (vivo) setInvitacion(data.invitacion || data);
      } catch { /* invitación inválida/expirada: se maneja luego */ }
    })();
    return () => { vivo = false; };
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = 'Nombre requerido';
    if (!apellido.trim()) e.apellido = 'Apellido requerido';
    if (!email.trim()) e.email = 'Email requerido';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Email inválido';
    if (!password) e.password = 'Contraseña requerida';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) { shake(); return; }
    setLoading(true);
    try {
      await register({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password,
        // Si se está uniendo a una dirección por invitación, no le creamos una
        // "Mi casa" vacía: se unirá a la del dueño que lo invitó.
        skipDireccion: !!invitacion,
      });
      // Al autenticarse, AppNavigator detecta la invitación pendiente y abre la
      // pantalla para aceptarla. No hay que navegar a mano.
    } catch (error) {
      shake();
      const msg = error.response?.data?.error || 'No se pudo crear la cuenta. Verificá tu conexión.';
      Alert.alert('Error', msg);
      setLoading(false);
    }
  };

  const dir = invitacion?.direccion || invitacion?.direccionId || null;
  const nombreDireccion = dir?.nombre || 'una dirección';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Logo size="lg" />
          </View>

          {invitacion && (
            <View style={styles.inviteBanner}>
              <MaterialCommunityIcons name="home-heart" size={22} color={COLORS.primaryDark} />
              <Text style={styles.inviteText}>
                Te invitaron a atender el timbre de <Text style={styles.inviteStrong}>{nombreDireccion}</Text>.
                Creá tu cuenta para unirte.
              </Text>
            </View>
          )}

          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.formTitle}>Crear cuenta</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.half]}>
                <Text style={styles.inputLabel}>NOMBRE</Text>
                <View style={[styles.inputWrapper, errors.nombre && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Juan"
                    placeholderTextColor={COLORS.gray500}
                    value={nombre}
                    onChangeText={(t) => { setNombre(t); setErrors((p) => ({ ...p, nombre: null })); }}
                    selectionColor={COLORS.primary}
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, styles.half]}>
                <Text style={styles.inputLabel}>APELLIDO</Text>
                <View style={[styles.inputWrapper, errors.apellido && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Pérez"
                    placeholderTextColor={COLORS.gray500}
                    value={apellido}
                    onChangeText={(t) => { setApellido(t); setErrors((p) => ({ ...p, apellido: null })); }}
                    selectionColor={COLORS.primary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.gray500}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: null })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={COLORS.primary}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTRASEÑA</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.gray500}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: null })); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  selectionColor={COLORS.primary}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeBtn}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Crear cuenta →</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.switchText}>¿Ya tenés cuenta? <Text style={styles.switchStrong}>Iniciá sesión</Text></Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>S-Doorbell © 2025</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  inviteBanner: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'center',
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md,
    padding: SPACING.base, marginBottom: SPACING.base,
  },
  inviteText: { flex: 1, color: COLORS.primaryDark, fontSize: FONT_SIZES.sm, lineHeight: 19 },
  inviteStrong: { fontWeight: '800' },
  formCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, ...SHADOWS.md },
  formTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', gap: SPACING.md },
  half: { flex: 1 },
  inputGroup: { marginBottom: SPACING.base },
  inputLabel: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: SPACING.xs },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 54,
  },
  inputError: { borderColor: COLORS.error },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, color: COLORS.text, fontSize: FONT_SIZES.base, height: '100%' },
  eyeBtn: { padding: SPACING.xs },
  errorText: { color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: SPACING.xs, marginLeft: SPACING.xs },
  primaryBtn: {
    marginTop: SPACING.md, borderRadius: RADIUS.md, height: 56,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, ...SHADOWS.gold,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700', letterSpacing: 0.5 },
  switchBtn: { marginTop: SPACING.lg, alignItems: 'center' },
  switchText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.base },
  switchStrong: { color: COLORS.primaryDark, fontWeight: '700' },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: SPACING.xl },
});

export default RegisterScreen;
