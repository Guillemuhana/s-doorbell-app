// src/screens/LoginScreen.js
import React, { useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const DoorbellIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.iconRing} />
    <View style={styles.iconInner}>
      <Text style={styles.iconText}>🔔</Text>
    </View>
  </View>
);

const LoginScreen = () => {
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
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#0A0A0A', '#0D1117']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

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
            <DoorbellIcon />
            <Text style={styles.brandName}>S-Doorbell</Text>
            <Text style={styles.tagline}>Tu timbre inteligente</Text>
          </View>

          {/* Form */}
          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Text style={styles.inputIcon}>✉️</Text>
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
                <Text style={styles.inputIcon}>🔒</Text>
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
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
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
              <LinearGradient
                colors={loading ? [COLORS.gray700, COLORS.gray600] : ['#007AFF', '#0056CC']}
                style={styles.loginBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.loginBtnText}>Entrar →</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>S-Doorbell © 2025</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  glowTop: {
    position: 'absolute', top: -100, left: '50%',
    width: 300, height: 300, marginLeft: -150,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  glowBottom: {
    position: 'absolute', bottom: -100, right: -50,
    width: 250, height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 122, 255, 0.07)',
  },
  header: { alignItems: 'center', marginBottom: SPACING['3xl'] },
  iconContainer: { marginBottom: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  iconRing: {
    position: 'absolute',
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 122, 255, 0.35)',
  },
  iconInner: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 32 },
  brandName: {
    fontSize: FONT_SIZES['3xl'],
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    marginTop: SPACING.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  formTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xl,
  },
  inputGroup: { marginBottom: SPACING.base },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray400,
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    height: 54,
  },
  inputError: { borderColor: COLORS.error },
  inputIcon: { fontSize: 16, marginRight: SPACING.sm },
  input: {
    flex: 1,
    color: COLORS.white,
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
  loginBtn: { marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.blue },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGradient: { height: 56, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700', letterSpacing: 0.5 },
  footer: {
    textAlign: 'center',
    color: COLORS.gray600,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xl,
  },
});

export default LoginScreen;
