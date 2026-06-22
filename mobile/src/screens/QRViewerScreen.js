// src/screens/QRViewerScreen.js — "Timbre Smart" (tema claro)
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Share,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { timbresAPI } from '../utils/api';
import Logo from '../components/Logo';
import { COLORS, SPACING, FONT_SIZES, RADIUS, SHADOWS } from '../constants/theme';

const QRViewerScreen = ({ route, navigation }) => {
  const { timbreId, direccionNombre } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [qr, setQr] = useState({ qrId: null, visitorUrl: null });
  const qrRef = useRef(null);

  const fetchQR = async () => {
    try {
      const { data } = await timbresAPI.getQR(timbreId);
      setQr({ qrId: data.qrId, visitorUrl: data.visitorUrl });
    } catch {
      Alert.alert('Error', 'No se pudo cargar el QR.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQR(); }, [timbreId]);

  const handleShare = async () => {
    if (!qr.visitorUrl) return;
    try {
      await Share.share({
        message: `🔔 S-Doorbell\n\nEscaneá este QR para tocar mi timbre:\n${qr.visitorUrl}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el QR.');
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timbre Smart</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerUnderline} />

        {/* Tarjeta QR */}
        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            {loading ? (
              <ActivityIndicator color={COLORS.brand} size="large" />
            ) : qr.visitorUrl ? (
              <QRCode
                value={qr.visitorUrl}
                size={210}
                getRef={(c) => (qrRef.current = c)}
                backgroundColor="white"
                color={COLORS.gray900}
              />
            ) : (
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray300} />
            )}
          </View>

          <Text style={styles.instruction}>Escanea el código QR para usar el timbre</Text>
          <Logo size="md" style={{ marginTop: SPACING.lg }} />
        </View>

        {direccionNombre && <Text style={styles.unitName}>📍 {direccionNombre}</Text>}

        {/* Botón descargar/compartir */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={20} color={COLORS.white} />
          <Text style={styles.shareBtnText}>Descargar QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.regenBtn} onPress={handleRegenerate} disabled={regenerating}>
          {regenerating
            ? <ActivityIndicator color={COLORS.error} size="small" />
            : <Text style={styles.regenText}>♻️ Regenerar QR</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.brandSoft },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.base, position: 'relative' },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text },
  closeBtn: {
    position: 'absolute', right: SPACING.lg, top: SPACING.sm,
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray800,
    alignItems: 'center', justifyContent: 'center',
  },
  headerUnderline: { alignSelf: 'center', width: 70, height: 3, borderRadius: 2, backgroundColor: COLORS.brand, marginBottom: SPACING.xl },
  scroll: { padding: SPACING.lg, paddingTop: 0 },
  qrCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS['2xl'], padding: SPACING.xl, alignItems: 'center', ...SHADOWS.md },
  qrBox: {
    width: 250, height: 250, borderRadius: RADIUS.lg, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm,
  },
  instruction: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, marginTop: SPACING.lg, textAlign: 'center' },
  unitName: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.base, fontSize: FONT_SIZES.sm },
  shareBtn: {
    flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.brand,
    height: 54, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.xl, ...SHADOWS.blue,
  },
  shareBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  regenBtn: { alignItems: 'center', paddingVertical: SPACING.base, marginTop: SPACING.sm },
  regenText: { color: COLORS.error, fontWeight: '600' },
});

export default QRViewerScreen;
