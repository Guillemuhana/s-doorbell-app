// src/screens/QRViewerScreen.js — placa de metal con QR
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Share,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { timbresAPI } from '../utils/api';
import Logo, { LogoMark } from '../components/Logo';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

// Tornillo metálico
const Screw = ({ style }) => (
  <View style={[styles.screw, style]}>
    <View style={styles.screwSlot} />
  </View>
);

// Marca de escuadra en esquina
const Bracket = ({ style }) => <View style={[styles.bracket, style]} />;

const QRViewerScreen = ({ route, navigation }) => {
  const { timbreId, direccionNombre } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [qr, setQr] = useState({ qrId: null, visitorUrl: null, qrImage: null });
  const [descargando, setDescargando] = useState(false);
  const qrRef = useRef(null);
  const plateRef = useRef(null); // la placa completa (para exportar como imagen)

  const fetchQR = async () => {
    try {
      const { data } = await timbresAPI.getQR(timbreId);
      setQr({ qrId: data.qrId, visitorUrl: data.visitorUrl, qrImage: data.qrImage });
    } catch {
      Alert.alert('Error', 'No se pudo cargar el QR.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQR(); }, [timbreId]);

  // Exporta la PLACA completa (metal + QR + logo + texto) como imagen para imprimir.
  const handleShare = async () => {
    try {
      setDescargando(true);
      // pequeña espera para asegurar que el QR ya está pintado
      await new Promise((r) => setTimeout(r, 150));
      const uri = await captureRef(plateRef, { format: 'png', quality: 1, pixelRatio: 3, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Guardar / imprimir placa QR', UTI: 'public.png' });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      Alert.alert('Error', 'No se pudo exportar la placa.');
    } finally {
      setDescargando(false);
    }
  };

  const handleRegenerate = () => {
    Alert.alert('Regenerar QR', 'El QR anterior dejará de funcionar. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Regenerar', style: 'destructive',
        onPress: async () => {
          setRegenerating(true);
          try {
            const { data } = await timbresAPI.regenerarQR(timbreId);
            setQr({ qrId: data.qrId, visitorUrl: data.visitorUrl });
          } catch {
            Alert.alert('Error', 'No se pudo regenerar el QR.');
          } finally { setRegenerating(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timbre Smart</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── PLACA DE METAL (capturable como imagen) ── */}
        <View ref={plateRef} collapsable={false} style={styles.plateWrap}>
        <LinearGradient
          colors={['#EDEEF1', '#FAFBFC', '#DEE0E4']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.plate}
        >
          {/* Tornillos en las 4 esquinas */}
          <Screw style={styles.screwTL} />
          <Screw style={styles.screwTR} />
          <Screw style={styles.screwBL} />
          <Screw style={styles.screwBR} />

          {/* Marcas de escuadra */}
          <Bracket style={styles.brTL} />
          <Bracket style={styles.brTR} />
          <Bracket style={styles.brBL} />
          <Bracket style={styles.brBR} />

          {/* Acento celeste arriba */}
          <View style={styles.accent} />

          {/* QR con logo al centro */}
          <View style={styles.qrBox}>
            {loading ? (
              <ActivityIndicator color={COLORS.brand} size="large" />
            ) : qr.visitorUrl ? (
              <>
                <QRCode
                  value={qr.visitorUrl}
                  size={206}
                  ecl="H"
                  getRef={(c) => (qrRef.current = c)}
                  backgroundColor="white"
                  color={COLORS.gray900}
                />
                <View style={styles.qrLogoBg}>
                  <LogoMark size={24} />
                </View>
              </>
            ) : (
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.gray300} />
            )}
          </View>

          <Text style={styles.instruction}>Escanea el código QR para usar el timbre</Text>
          <Logo size="md" style={{ marginTop: SPACING.md }} />
        </LinearGradient>
        </View>

        {direccionNombre && <Text style={styles.unitName}>📍 {direccionNombre}</Text>}

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85} disabled={descargando || loading}>
          {descargando ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="download-outline" size={20} color={COLORS.white} />
              <Text style={styles.shareBtnText}>Descargar QR</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.regenBtn} onPress={handleRegenerate} disabled={regenerating}>
          {regenerating ? (
            <ActivityIndicator color={COLORS.error} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="refresh" size={18} color={COLORS.error} />
              <Text style={styles.regenText}>Regenerar QR</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const SCREW = 14;
const BR = 20; // tamaño bracket

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.brandSoft },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base, position: 'relative' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  closeBtn: {
    position: 'absolute', right: SPACING.lg, top: SPACING.sm,
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray800,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: SPACING.lg },
  plateWrap: { borderRadius: RADIUS['2xl'] },

  // Placa metálica
  plate: {
    borderRadius: RADIUS['2xl'],
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D2D4D8',
    ...SHADOWS.lg,
  },
  accent: { width: 64, height: 4, borderRadius: 2, backgroundColor: COLORS.brand, marginBottom: SPACING.xl },

  // Tornillos
  screw: {
    position: 'absolute', width: SCREW, height: SCREW, borderRadius: SCREW / 2,
    backgroundColor: '#C7CACF', borderWidth: 1, borderColor: '#A9ACB2',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  screwSlot: { width: SCREW * 0.6, height: 1.5, backgroundColor: '#8A8D93', borderRadius: 1 },
  screwTL: { top: 12, left: 12 },
  screwTR: { top: 12, right: 12 },
  screwBL: { bottom: 12, left: 12 },
  screwBR: { bottom: 12, right: 12 },

  // Marcas de escuadra (L) en esquinas
  bracket: { position: 'absolute', width: BR, height: BR, borderColor: COLORS.gray700 },
  brTL: { top: 30, left: 30, borderTopWidth: 2, borderLeftWidth: 2 },
  brTR: { top: 30, right: 30, borderTopWidth: 2, borderRightWidth: 2 },
  brBL: { bottom: 30, left: 30, borderBottomWidth: 2, borderLeftWidth: 2 },
  brBR: { bottom: 30, right: 30, borderBottomWidth: 2, borderRightWidth: 2 },

  // QR
  qrBox: {
    width: 246, height: 246, borderRadius: RADIUS.lg, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  qrLogoBg: {
    position: 'absolute', width: 44, height: 44, borderRadius: 10,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  instruction: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginTop: SPACING.lg, textAlign: 'center' },

  unitName: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.base, fontSize: FONT_SIZES.sm },
  shareBtn: {
    flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.brand,
    height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.xl, ...SHADOWS.blue,
  },
  shareBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  regenBtn: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base, marginTop: SPACING.sm },
  regenText: { color: COLORS.error, fontWeight: '600' },
});

export default QRViewerScreen;
