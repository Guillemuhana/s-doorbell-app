// src/screens/InviteFamilyScreen.js — invitar familiares (mockup 3)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Share, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { direccionesAPI, referidosAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const rolLabel = (r) => (r === 'dueño' ? 'Usuario principal' : r === 'colaborador' ? 'Colaborador' : 'Familiar');

// Lista de miembros de la casa (usuario principal + familiares).
const MembersCard = ({ direccionId }) => {
  const { usuario } = useAuth();
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const { data } = await direccionesAPI.getFamiliares(direccionId);
      setMiembros(data.familiares || []);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [direccionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const soyDueno = miembros.some((m) => m.rol === 'dueño' && m.usuario?._id === usuario?._id);
  // El usuario principal (dueño) siempre primero.
  const ordenados = [...miembros].sort((a, b) => (a.rol === 'dueño' ? -1 : b.rol === 'dueño' ? 1 : 0));

  const quitar = (m) => {
    Alert.alert('Quitar de la casa', `¿Sacar a ${m.nombreCompleto}? Va a dejar de recibir los timbrazos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive', onPress: async () => {
          try { await direccionesAPI.eliminarFamiliar(direccionId, m.membershipId); cargar(); }
          catch (err) { Alert.alert('Error', err?.response?.data?.error || 'No se pudo quitar.'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.membersCard}>
      <View style={styles.membersHead}>
        <Text style={styles.membersTitle}>En esta casa</Text>
        <View style={styles.membersCount}>
          <MaterialCommunityIcons name="account-group" size={13} color={COLORS.primaryDark} />
          <Text style={styles.membersCountText}>{miembros.length}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: SPACING.base }} />
      ) : ordenados.map((m) => (
        <View key={m.membershipId} style={styles.memberRow}>
          <View style={[styles.memberAvatar, m.rol === 'dueño' && { backgroundColor: COLORS.primary }]}>
            <Text style={[styles.memberAvatarText, m.rol === 'dueño' && { color: COLORS.white }]}>
              {m.usuario?.nombre?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.nombreCompleto}</Text>
            <Text style={styles.memberRol}>{rolLabel(m.rol)}</Text>
          </View>
          {m.rol === 'dueño' ? (
            <MaterialCommunityIcons name="shield-crown" size={18} color={COLORS.primary} />
          ) : soyDueno ? (
            <TouchableOpacity onPress={() => quitar(m)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="account-remove-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const mensajeInvite = (link) => `Te invito a atender el timbre en S-Doorbell 🔔\n${link}`;
const mensajeReferido = (desc, link) => `¡Te regalo ${desc}% de descuento en S-Doorbell! 🎁 Es por única vez, activalo acá:\n${link}`;

// Bloque "Regalá 30% a un amigo" — link único por usuario, 1 solo canje total.
const ReferralCard = () => {
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const fetchRef = useCallback(async () => {
    try {
      const { data } = await referidosAPI.miCodigo();
      setRef(data);
    } catch (err) {
      // Si la tabla/columna aún no existe (migración pendiente), no rompemos la pantalla.
      console.warn('Referidos no disponible:', err?.response?.data?.error || err?.message);
      setRef(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRef(); }, [fetchRef]);

  if (loading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />;
  }
  if (!ref) return null;

  const desc = ref.descuento || 30;
  const canje = ref.canje;

  const compartir = async () => {
    try { await Share.share({ message: mensajeReferido(desc, ref.url) }); }
    catch { Alert.alert('Enlace', ref.url); }
  };
  const compartirWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(mensajeReferido(desc, ref.url))}`;
    Linking.openURL(url).catch(compartir);
  };
  const copiar = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(ref.url);
        setCopiado(true); setTimeout(() => setCopiado(false), 2000);
        return;
      }
      await Share.share({ message: mensajeReferido(desc, ref.url) });
    } catch { Alert.alert('Enlace', ref.url); }
  };
  const marcarAplicado = async () => {
    setAplicando(true);
    try { const { data } = await referidosAPI.marcarAplicado(); setRef({ ...ref, canje: data.canje }); }
    catch (err) { Alert.alert('Error', err?.response?.data?.error || 'No se pudo actualizar.'); }
    finally { setAplicando(false); }
  };

  return (
    <View style={styles.refCard}>
      <View style={styles.refHero}>
        <Text style={styles.refBadge}>{desc}% OFF</Text>
        <Text style={styles.refHeroSub}>Regalá a un amigo · 1 sola vez</Text>
      </View>

      {!canje ? (
        <View style={styles.refBody}>
          <Text style={styles.refLead}>
            Tenés un descuento del {desc}% para regalar a un amigo. Cuando lo canjee, te avisamos.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} selectable>{ref.code}</Text>
          </View>
          <TouchableOpacity style={styles.refPrimary} onPress={compartirWhatsApp} activeOpacity={0.85}>
            <MaterialCommunityIcons name="whatsapp" size={19} color={COLORS.white} />
            <Text style={styles.refPrimaryText}>Regalar por WhatsApp</Text>
          </TouchableOpacity>
          <View style={styles.refRow}>
            <TouchableOpacity style={styles.refGhost} onPress={copiar} activeOpacity={0.8}>
              <MaterialCommunityIcons name={copiado ? 'check' : 'content-copy'} size={17} color={COLORS.primaryDark} />
              <Text style={styles.refGhostText}>{copiado ? '¡Copiado!' : 'Copiar link'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refGhost} onPress={compartir} activeOpacity={0.8}>
              <MaterialCommunityIcons name="share-variant" size={17} color={COLORS.primaryDark} />
              <Text style={styles.refGhostText}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.refBody}>
          <View style={styles.canjeRow}>
            <MaterialCommunityIcons
              name={canje.estado === 'aplicado' ? 'check-decagram' : 'gift-open'}
              size={22} color={canje.estado === 'aplicado' ? COLORS.success : COLORS.gold || COLORS.warning} />
            <Text style={styles.canjeTitle}>
              {canje.estado === 'aplicado' ? 'Descuento aplicado' : '¡Tu amigo canjeó el descuento!'}
            </Text>
          </View>
          <Text style={styles.refLead}>
            {canje.amigoNombre || 'Un amigo'}{canje.amigoEmail ? ` · ${canje.amigoEmail}` : ''}
            {'\n'}Descuento del {canje.descuento || desc}% {canje.estado === 'aplicado' ? 'ya aplicado.' : 'listo para aplicar.'}
          </Text>
          {canje.estado !== 'aplicado' && (
            <TouchableOpacity style={styles.refPrimary} onPress={marcarAplicado} disabled={aplicando} activeOpacity={0.85}>
              {aplicando ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <MaterialCommunityIcons name="check" size={19} color={COLORS.white} />
                  <Text style={styles.refPrimaryText}>Marcar como aplicado</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

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
        {/* Miembros actuales de la casa (usuario principal + familiares) */}
        <MembersCard direccionId={direccionId} />

        <Text style={styles.title}>{link ? '¡Invitación lista!' : 'Sumar a la casa'}</Text>
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

        {/* Regalo del 30% a un amigo (referido, 1 sola vez) */}
        <View style={styles.refDivider}>
          <View style={styles.refLine} />
          <Text style={styles.refDividerText}>REGALO PARA UN AMIGO</Text>
          <View style={styles.refLine} />
        </View>
        <ReferralCard />
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

  // ─── Miembros de la casa ─────────────────────────────────────────────────
  membersCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.base, marginBottom: SPACING.lg, ...SHADOWS.sm },
  membersHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  membersTitle: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.text },
  membersCount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  membersCountText: { fontSize: FONT_SIZES.xs, fontWeight: '800', color: COLORS.primaryDark },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.brandSoft, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: COLORS.brand, fontWeight: '800', fontSize: FONT_SIZES.md },
  memberName: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  memberRol: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },

  // ─── Referido (regalo 30%) ───────────────────────────────────────────────
  refDivider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%', marginTop: SPACING['2xl'], marginBottom: SPACING.lg },
  refLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  refDividerText: { fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 0.8, color: COLORS.textMuted },
  refCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm },
  refHero: { backgroundColor: '#E0A82E', paddingVertical: SPACING.lg, alignItems: 'center' },
  refBadge: { color: COLORS.white, fontSize: FONT_SIZES['2xl'], fontWeight: '900', letterSpacing: -0.5 },
  refHeroSub: { color: 'rgba(255,255,255,0.95)', fontSize: FONT_SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  refBody: { padding: SPACING.base, gap: SPACING.sm },
  refLead: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'center' },
  codeBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  codeText: { fontSize: FONT_SIZES.lg, fontWeight: '900', letterSpacing: 2, color: COLORS.primaryDark },
  refPrimary: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.primary, height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.blue },
  refPrimaryText: { color: COLORS.white, fontSize: FONT_SIZES.base, fontWeight: '700' },
  refRow: { flexDirection: 'row', gap: SPACING.sm },
  refGhost: { flex: 1, flexDirection: 'row', gap: 6, height: 46, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  refGhostText: { color: COLORS.primaryDark, fontSize: FONT_SIZES.sm, fontWeight: '700' },
  canjeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center' },
  canjeTitle: { fontSize: FONT_SIZES.base, fontWeight: '800', color: COLORS.text },
});

export default InviteFamilyScreen;
