// src/components/RingWatcher.js
// Mientras la app está abierta:
//  • consulta timbrazos recientes y dispara una notificación local (banner + sonido);
//  • consulta videollamadas entrantes y abre la pantalla de llamada.
// También abre la llamada si el usuario toca una notificación push INCOMING_CALL.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { eventosAPI, callsAPI } from '../utils/api';
import { scheduleLocalNotification, addNotificationResponseListener } from '../utils/notifications';
import { reproducirTimbre, armarDesbloqueoDeAudio } from '../utils/doorbellSound';
import { suscribirWebPush, soportaWebPush, refrescarWebPush } from '../utils/webPush';
import { navigate } from '../navigation/navigationRef';

const POLL_MS = 7000;
const CALL_POLL_MS = 4000;

export default function RingWatcher() {
  const { isAuthenticated } = useAuth();
  const sinceRef = useRef(new Date().toISOString());
  const openedCallRef = useRef(null); // callId ya abierto, para no reabrir

  // modo 'chat' abre la pantalla de mensajes; cualquier otro, la videollamada.
  const abrirLlamada = (callId, visitorName, direccionNombre, modo) => {
    if (!callId || openedCallRef.current === callId) return;
    openedCallRef.current = callId;
    const pantalla = modo === 'chat' ? 'Chat' : 'Call';
    navigate(pantalla, { callId, visitorName, direccionNombre });
  };

  // En web, habilita el audio en el primer toque del usuario (requisito de iOS).
  useEffect(() => {
    if (isAuthenticated) armarDesbloqueoDeAudio();
  }, [isAuthenticated]);

  // En web (PWA), suscribir a Web Push para recibir el timbre con la app
  // cerrada. iOS exige que el pedido de permiso salga de un gesto del usuario,
  // así que lo disparamos en el primer toque.
  useEffect(() => {
    if (!isAuthenticated || !soportaWebPush()) return;
    let hecho = false;
    const intentar = () => {
      if (hecho) return;
      hecho = true;
      quitar();
      suscribirWebPush().catch(() => {});
    };
    const quitar = () => {
      window.removeEventListener('touchend', intentar);
      window.removeEventListener('mousedown', intentar);
      window.removeEventListener('keydown', intentar);
    };
    window.addEventListener('touchend', intentar);
    window.addEventListener('mousedown', intentar);
    window.addEventListener('keydown', intentar);
    return quitar;
  }, [isAuthenticated]);

  // Refrescar la suscripción Web Push cada vez que la app vuelve al primer plano.
  // En iOS la suscripción puede vencer; si no se renueva, dejan de llegar los
  // timbres (síntoma: "a veces suena, a veces no"). Solo actúa si ya hay permiso.
  useEffect(() => {
    if (!isAuthenticated || !soportaWebPush() || typeof document === 'undefined') return;
    const alVolver = () => { if (document.visibilityState === 'visible') refrescarWebPush(); };
    refrescarWebPush();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [isAuthenticated]);

  // ─── Timbrazos + videollamadas entrantes (polling) ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    let ringTimer = null;
    let callTimer = null;
    let stopped = false;

    const pollRings = async () => {
      try {
        const { data } = await eventosAPI.getRecientes(sinceRef.current);
        const nuevos = (data.eventos || []).filter(
          (e) => new Date(e.createdAt) > new Date(sinceRef.current)
        );
        if (nuevos.length && !stopped) {
          sinceRef.current = nuevos.map((e) => e.createdAt).sort().pop();
          // En el PWA (web) expo-notifications no suena: reproducimos el timbre
          // con Web Audio. En nativo, el sonido va con la notificación local.
          if (Platform.OS === 'web') reproducirTimbre();
          for (const e of nuevos.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
            const visitante = e.visitorName || 'Alguien';
            const lugar = e.direccionId?.nombre ? ` · ${e.direccionId.nombre}` : '';
            await scheduleLocalNotification({
              title: '🔔 ¡Timbre!',
              body: `${visitante} está en tu puerta${lugar}`,
              data: { type: 'DOORBELL_RING', eventId: e._id },
            });
          }
        }
      } catch { /* silencioso */ }
    };

    const pollCalls = async () => {
      try {
        const { data } = await callsAPI.incoming();
        const call = (data.calls || [])[0];
        if (call && !stopped) {
          abrirLlamada(call._id, call.visitorName, call.direccion?.nombre, call.modo);
        }
      } catch { /* silencioso (p.ej. backend sin endpoint de calls) */ }
    };

    pollRings();
    pollCalls();
    ringTimer = setInterval(pollRings, POLL_MS);
    callTimer = setInterval(pollCalls, CALL_POLL_MS);
    return () => {
      stopped = true;
      if (ringTimer) clearInterval(ringTimer);
      if (callTimer) clearInterval(callTimer);
    };
  }, [isAuthenticated]);

  // ─── Tap en notificación push de videollamada ──────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = addNotificationResponseListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data.type === 'INCOMING_CALL' && data.callId) {
        abrirLlamada(data.callId, data.visitorName, data.address, data.modo);
      }
    });
    return () => { try { sub?.remove(); } catch {} };
  }, [isAuthenticated]);

  return null;
}
