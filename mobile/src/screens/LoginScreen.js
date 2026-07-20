// src/screens/LoginScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { getPendingInvite } from '../utils/pendingInvite';
import { invitacionesAPI } from '../utils/api';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { login } = useAuth();
  const passwordRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [invitacion, setInvitacion] = useState(null); // si se llegó por link de invitación

  // ¿Vino por un link de invitación? Mostramos un cartel para dar contexto.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const token = await getPendingInvite();
      if (!token || !vivo) return;
      try {
        const { data } = await invitacionesAPI.get(token);
        if (vivo) setInvitacion(data.invitacion || data);
      } catch { /* invitación inválida/expirada */ }
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
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email requerido';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) newErrors.email = 'Email inválido';
    if (!password) newErrors.password = 'Contraseña requerida';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) { shake(); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      shake();
      const msg = error.response?.data?.error || 'Error al iniciar sesión. Verifica tu conexión.';
      Alert.alert('Error', msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <Logo size="lg" />
          </View>

          {invitacion && (
            <View style={styles.inviteBanner}>
              <MaterialCommunityIcons name="home-heart" size={22} color={COLORS.primaryDark} />
              <Text style={styles.inviteText}>
                Te invitaron a atender un timbre. Iniciá sesión o{' '}
                <Text style={styles.inviteLink} onPress={() => navigation?.navigate('Register')}>creá tu cuenta</Text>{' '}
                para unirte.
              </Text>
            </View>
          )}

          {/* Form */}
          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.gray500}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors(p => ({ ...p, email: null })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  selectionColor={COLORS.primary}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTRASEÑA</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.gray500}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors(p => ({ ...p, password: null })); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  selectionColor={COLORS.primary}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginBtnText}>Entrar →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchBtn} onPress={() => navigation?.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.switchText}>¿No tenés cuenta? <Text style={styles.switchStrong}>Crear cuenta</Text></Text>
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
  header: { alignItems: 'center', marginBottom: SPACING['2xl'] },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  formTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xl,
  },
  inputGroup: { marginBottom: SPACING.base },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 54,
  },
  inputError: { borderColor: COLORS.error },
  inputIcon: { fontSize: 16, marginRight: SPACING.sm },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    height: '100%',
  },
  eyeBtn: { padding: SPACING.xs },
  eyeIcon: { fontSize: 18 },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  loginBtn: {
    marginTop: SPACING.lg, borderRadius: RADIUS.md, height: 56,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, ...SHADOWS.gold,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700', letterSpacing: 0.5 },
  switchBtn: { marginTop: SPACING.lg, alignItems: 'center' },
  switchText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.base },
  switchStrong: { color: COLORS.primaryDark, fontWeight: '700' },
  inviteBanner: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'center',
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md,
    padding: SPACING.base, marginBottom: SPACING.base,
  },
  inviteText: { flex: 1, color: COLORS.primaryDark, fontSize: FONT_SIZES.sm, lineHeight: 19 },
  inviteLink: { fontWeight: '800', textDecorationLine: 'underline' },
  footer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xl,
  },
});

export default LoginScreen;
