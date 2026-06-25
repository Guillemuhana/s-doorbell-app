// src/screens/CallScreen.js
// Videollamada del RESIDENTE (lado que atiende). El visitante (web) crea la
// oferta WebRTC; acá la recibimos por polling, respondemos con la answer e
// intercambiamos ICE. El video viaja P2P directo.
//
// ⚠️ Requiere react-native-webrtc → NO funciona en Expo Go. Usar un dev build
//    (npx expo run:android / run:ios o eas build --profile development).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '../constants/theme';
import { callsAPI } from '../utils/api';

// react-native-webrtc es código NATIVO: no existe en Expo Go. Se carga de forma
// dinámica (require por variable → Metro no lo exige en el bundle) para que la
// app abra igual en Expo Go; la videollamada solo funciona en un dev build.
let WebRTC = null;
try {
  const mod = 'react-native-webrtc';
  WebRTC = require(mod);
} catch { /* Expo Go / módulo no instalado → pantalla muestra aviso */ }
const WEBRTC_OK = !!(WebRTC && WebRTC.RTCPeerConnection && WebRTC.mediaDevices);

const POLL_MS = 1200;

export default function CallScreen({ route, navigation }) {
  const { callId, visitorName, direccionNombre } = route.params || {};

  // En Expo Go (sin módulo nativo) mostramos un aviso en vez de la llamada.
  if (!WEBRTC_OK) {
    return (
      <SafeAreaView style={styles.incoming}>
        <StatusBar barStyle="light-content" />
        <View style={styles.incomingTop}>
          <MaterialCommunityIcons name="video-off" size={64} color={COLORS.gray500} />
          <Text style={styles.incomingName}>Videollamada</Text>
          <Text style={styles.incomingHint}>
            Disponible solo en la app instalada (dev build).{'\n'}No funciona en Expo Go.
          </Text>
        </View>
        <View style={styles.incomingActions}>
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.roundBtn, styles.rejectBtn]}
              onPress={() => navigation.canGoBack() && navigation.goBack()}
            >
              <MaterialCommunityIcons name="close" size={30} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Cerrar</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCView, mediaDevices } = WebRTC;

  const [status, setStatus] = useState('ringing'); // ringing|connecting|connected|ended
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [seconds, setSeconds] = useState(0);

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const pollRef = useRef(null);
  const durRef = useRef(null);
  const cursorRef = useRef(0);
  const pendingIce = useRef([]);
  const remoteSet = useRef(false);
  const mounted = useRef(true);
  const endedRef = useRef(false);

  useEffect(() => () => { mounted.current = false; cleanup(); }, []); // eslint-disable-line

  // ─── Aceptar la llamada ───────────────────────────────────────────────────
  const accept = async () => {
    setStatus('connecting');
    try {
      const { data } = await callsAPI.accept(callId);
      const iceServers = data.iceServers || [];

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' },
      });
      if (!mounted.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      localRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.addEventListener('track', (e) => {
        if (e.streams && e.streams[0]) setRemoteStream(e.streams[0]);
      });
      pc.addEventListener('icecandidate', (e) => {
        if (e.candidate) callsAPI.signal(callId, 'ice', e.candidate.toJSON()).catch(() => {});
      });
      pc.addEventListener('connectionstatechange', () => {
        const st = pc.connectionState;
        if (st === 'connected') { setStatus('connected'); startDuration(); }
        if (['failed', 'closed', 'disconnected'].includes(st)) end('La llamada finalizó');
      });

      startPolling();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo conectar la llamada';
      end(msg);
    }
  };

  // ─── Rechazar ─────────────────────────────────────────────────────────────
  const reject = async () => {
    try { await callsAPI.reject(callId); } catch {}
    close();
  };

  // ─── Polling de señales del visitante ─────────────────────────────────────
  const startPolling = () => {
    const poll = async () => {
      if (endedRef.current) return;
      try {
        const { data } = await callsAPI.poll(callId, cursorRef.current);
        if (!data.success) return;

        if (['ended', 'rejected', 'timeout'].includes(data.estado)) {
          end('La llamada finalizó');
          return;
        }
        cursorRef.current = data.cursor || cursorRef.current;
        for (const sig of data.signals || []) {
          await handleSignal(sig);
        }
      } catch { /* sin red: reintenta */ }
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
  };

  const handleSignal = async (sig) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      if (sig.tipo === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        remoteSet.current = true;
        // Drenar ICE que llegó antes que la offer.
        for (const c of pendingIce.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingIce.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await callsAPI.signal(callId, 'answer', { type: answer.type, sdp: answer.sdp });
      } else if (sig.tipo === 'ice') {
        if (remoteSet.current) {
          await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
        } else {
          pendingIce.current.push(sig.payload);
        }
      }
    } catch { /* candidato fuera de orden: ignorar */ }
  };

  // ─── Controles ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const s = localRef.current;
    if (!s) return;
    const track = s.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const switchCamera = () => {
    const s = localRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (track && typeof track._switchCamera === 'function') track._switchCamera();
  };

  const hangup = async () => {
    try { await callsAPI.hangup(callId); } catch {}
    close();
  };

  // ─── Ciclo de vida ────────────────────────────────────────────────────────
  const startDuration = () => {
    if (durRef.current) return;
    durRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const cleanup = () => {
    endedRef.current = true;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (durRef.current) { clearInterval(durRef.current); durRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    if (localRef.current) { localRef.current.getTracks().forEach((t) => t.stop()); localRef.current = null; }
  };

  // Finaliza por error / otro lado colgó: muestra mensaje breve y cierra.
  const end = (msg) => {
    if (endedRef.current) return;
    cleanup();
    if (mounted.current) { setStatus('ended'); setTimeout(close, 800); }
  };

  const close = () => {
    cleanup();
    if (navigation.canGoBack()) navigation.goBack();
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const nombre = visitorName || 'Visitante';

  // ─── UI: llamada entrante (antes de aceptar) ──────────────────────────────
  if (status === 'ringing') {
    return (
      <SafeAreaView style={styles.incoming}>
        <StatusBar barStyle="light-content" />
        <View style={styles.incomingTop}>
          <Text style={styles.incomingLabel}>📹 Videollamada entrante</Text>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={64} color={COLORS.white} />
          </View>
          <Text style={styles.incomingName}>{nombre}</Text>
          {!!direccionNombre && <Text style={styles.incomingAddr}>{direccionNombre}</Text>}
          <Text style={styles.incomingHint}>está en tu puerta</Text>
        </View>
        <View style={styles.incomingActions}>
          <View style={styles.actionCol}>
            <TouchableOpacity style={[styles.roundBtn, styles.rejectBtn]} onPress={reject}>
              <MaterialCommunityIcons name="phone-hangup" size={30} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Rechazar</Text>
          </View>
          <View style={styles.actionCol}>
            <TouchableOpacity style={[styles.roundBtn, styles.acceptBtn]} onPress={accept}>
              <MaterialCommunityIcons name="video" size={30} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Atender</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── UI: llamada en curso ─────────────────────────────────────────────────
  return (
    <View style={styles.call}>
      <StatusBar barStyle="light-content" />
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remote} objectFit="cover" />
      ) : (
        <View style={[styles.remote, styles.remotePlaceholder]}>
          <MaterialCommunityIcons name="video-account" size={64} color={COLORS.gray500} />
          <Text style={styles.connectingText}>
            {status === 'connected' ? 'Conectando video…' : 'Conectando…'}
          </Text>
        </View>
      )}

      {!!localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.local} objectFit="cover" mirror zOrder={1} />
      )}

      <SafeAreaView style={styles.topbar} pointerEvents="none">
        <Text style={styles.callName}>{nombre}</Text>
        <Text style={styles.callStatus}>
          {status === 'connected' ? fmt(seconds) : 'Conectando…'}
        </Text>
      </SafeAreaView>

      <SafeAreaView style={styles.controls}>
        <View style={styles.actionCol}>
          <TouchableOpacity style={[styles.ctrlBtn, !micOn && styles.ctrlBtnOff]} onPress={toggleMic}>
            <MaterialCommunityIcons name={micOn ? 'microphone' : 'microphone-off'} size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.ctrlLabel}>{micOn ? 'Silenciar' : 'Activar'}</Text>
        </View>
        <View style={styles.actionCol}>
          <TouchableOpacity style={[styles.roundBtn, styles.rejectBtn]} onPress={hangup}>
            <MaterialCommunityIcons name="phone-hangup" size={30} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.ctrlLabel}>Finalizar</Text>
        </View>
        <View style={styles.actionCol}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={switchCamera}>
            <MaterialCommunityIcons name="camera-flip" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.ctrlLabel}>Cámara</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Entrante
  incoming: { flex: 1, backgroundColor: COLORS.gray900, justifyContent: 'space-between', paddingVertical: 40 },
  incomingTop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  incomingLabel: { color: COLORS.primaryLight, fontSize: 15, fontWeight: '700', marginBottom: 16 },
  avatar: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  incomingName: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  incomingAddr: { color: COLORS.gray400, fontSize: 15 },
  incomingHint: { color: COLORS.gray500, fontSize: 14, marginTop: 4 },
  incomingActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 },

  // Compartidos
  actionCol: { alignItems: 'center', gap: 8 },
  roundBtn: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.error },
  actionLabel: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  // En curso
  call: { flex: 1, backgroundColor: COLORS.black },
  remote: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.gray900 },
  remotePlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  connectingText: { color: COLORS.gray400, fontSize: 15 },
  local: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 24, right: 16,
    width: 110, height: 150, borderRadius: 14, backgroundColor: COLORS.gray800,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  topbar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 16 },
  callName: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  callStatus: { color: COLORS.gray300, fontSize: 13, marginTop: 4 },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
    paddingHorizontal: 30, paddingBottom: 24,
  },
  ctrlBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlBtnOff: { backgroundColor: 'rgba(255,255,255,0.4)' },
  ctrlLabel: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
});
