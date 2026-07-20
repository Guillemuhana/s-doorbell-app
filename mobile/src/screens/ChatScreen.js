// src/screens/ChatScreen.js
// Chat de texto del RESIDENTE (lado que atiende). El visitante (web del QR)
// inicia una sesión con modo 'chat'; acá la aceptamos y los mensajes viajan como
// señales tipo 'chat' sobre la misma infraestructura de las videollamadas.
// A diferencia de CallScreen, no usa WebRTC → corre en Expo Go y en el PWA web.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { callsAPI } from '../utils/api';

const POLL_MS = 1500;

export default function ChatScreen({ route, navigation }) {
  const { callId, visitorName, direccionNombre } = route.params || {};
  const nombre = visitorName || 'Visitante';

  const [status, setStatus] = useState('ringing'); // ringing|open|ended
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');

  const pollRef = useRef(null);
  const cursorRef = useRef(0);
  const endedRef = useRef(false);
  const mounted = useRef(true);
  const listRef = useRef(null);
  const idRef = useRef(0);

  const addMsg = useCallback((text, who) => {
    idRef.current += 1;
    setMensajes((prev) => [...prev, { id: `${Date.now()}-${idRef.current}`, text, who }]);
    setTimeout(() => { try { listRef.current?.scrollToEnd({ animated: true }); } catch {} }, 50);
  }, []);

  useEffect(() => () => { mounted.current = false; cleanup(); }, []); // eslint-disable-line

  const cleanup = () => {
    endedRef.current = true;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const close = () => {
    cleanup();
    if (navigation.canGoBack()) navigation.goBack();
  };

  // ─── Aceptar el chat ────────────────────────────────────────────────────────
  const aceptar = async () => {
    try {
      await callsAPI.accept(callId);
      setStatus('open');
      addMsg(`${nombre} inició una conversación desde tu puerta.`, 'system');
      startPolling();
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudo abrir el chat.';
      addMsg(msg, 'system');
      setStatus('ended');
      setTimeout(close, 1200);
    }
  };

  // ─── Rechazar / cortar ──────────────────────────────────────────────────────
  const rechazar = async () => {
    try { await callsAPI.reject(callId); } catch {}
    close();
  };

  const cortar = async () => {
    try { await callsAPI.hangup(callId); } catch {}
    close();
  };

  // ─── Polling de mensajes del visitante ──────────────────────────────────────
  const startPolling = () => {
    const poll = async () => {
      if (endedRef.current) return;
      try {
        const { data } = await callsAPI.poll(callId, cursorRef.current);
        if (!data.success) return;
        if (['ended', 'rejected', 'timeout'].includes(data.estado)) {
          addMsg('El visitante cerró la conversación.', 'system');
          finalizar();
          return;
        }
        cursorRef.current = data.cursor || cursorRef.current;
        (data.signals || []).forEach((sig) => {
          if (sig.tipo === 'chat') {
            const t = typeof sig.payload === 'string' ? sig.payload : sig.payload?.text;
            if (t) addMsg(t, 'them');
          }
        });
      } catch { /* sin red: reintenta */ }
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
  };

  const finalizar = () => {
    cleanup();
    if (mounted.current) setStatus('ended');
  };

  // ─── Enviar mensaje ─────────────────────────────────────────────────────────
  const enviar = async () => {
    const t = texto.trim();
    if (!t || status !== 'open') return;
    setTexto('');
    addMsg(t, 'me');
    try {
      await callsAPI.signal(callId, 'chat', { text: t });
    } catch {
      addMsg('No se pudo enviar. Revisá tu conexión.', 'system');
    }
  };

  // ─── UI: entrante ───────────────────────────────────────────────────────────
  if (status === 'ringing') {
    return (
      <SafeAreaView style={styles.incoming}>
        <StatusBar barStyle="light-content" />
        <View style={styles.incomingTop}>
          <Text style={styles.incomingLabel}>💬 Mensaje entrante</Text>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="message-text" size={56} color={COLORS.white} />
          </View>
          <Text style={styles.incomingName}>{nombre}</Text>
          {!!direccionNombre && <Text style={styles.incomingAddr}>{direccionNombre}</Text>}
          <Text style={styles.incomingHint}>quiere chatear desde tu puerta</Text>
        </View>
        <View style={styles.incomingActions}>
          <View style={styles.actionCol}>
            <TouchableOpacity style={[styles.roundBtn, styles.rejectBtn]} onPress={rechazar}>
              <MaterialCommunityIcons name="close" size={30} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Ignorar</Text>
          </View>
          <View style={styles.actionCol}>
            <TouchableOpacity style={[styles.roundBtn, styles.acceptBtn]} onPress={aceptar}>
              <MaterialCommunityIcons name="chat" size={30} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Responder</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── UI: chat en curso ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={cortar} style={styles.headerBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{nombre}</Text>
          <Text style={styles.headerSub}>{direccionNombre || 'Tu puerta'}</Text>
        </View>
        <TouchableOpacity onPress={cortar} style={styles.endBtn}>
          <MaterialCommunityIcons name="close" size={18} color={COLORS.white} />
          <Text style={styles.endBtnText}>Cortar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              item.who === 'me' && styles.bubbleMe,
              item.who === 'them' && styles.bubbleThem,
              item.who === 'system' && styles.bubbleSystem,
            ]}>
              <Text style={[
                styles.bubbleText,
                item.who === 'me' && styles.bubbleTextMe,
                item.who === 'system' && styles.bubbleTextSystem,
              ]}>{item.text}</Text>
            </View>
          )}
        />

        {status === 'open' ? (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Escribí un mensaje…"
              placeholderTextColor={COLORS.textMuted}
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={enviar}
              returnKeyType="send"
              maxLength={1000}
            />
            <TouchableOpacity style={[styles.sendBtn, !texto.trim() && styles.sendBtnDisabled]} onPress={enviar} disabled={!texto.trim()}>
              <MaterialCommunityIcons name="send" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.closedBar} onPress={close}>
            <Text style={styles.closedText}>Conversación finalizada · Tocá para salir</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  actionCol: { alignItems: 'center', gap: 8 },
  roundBtn: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.error },
  actionLabel: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  // Chat
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerBtn: { padding: 2 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.error, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  endBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  messages: { padding: 14, gap: 8 },
  bubble: { maxWidth: '80%', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 5 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 5 },
  bubbleSystem: { alignSelf: 'center', backgroundColor: 'rgba(27,39,53,0.06)' },
  bubbleText: { fontSize: 15, lineHeight: 20, color: COLORS.text },
  bubbleTextMe: { color: COLORS.white },
  bubbleTextSystem: { color: COLORS.textMuted, fontSize: 12.5, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, height: 46, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 23,
    paddingHorizontal: 16, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  closedBar: { padding: 18, alignItems: 'center', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  closedText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
});
