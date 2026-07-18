// src/utils/pendingInvite.js
// Maneja el token de una invitación que llega por URL (/invitacion/:token) en el
// PWA. Se guarda apenas carga la app y se procesa después del login (el familiar
// puede tener que iniciar sesión o registrarse primero).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'sdoorbell_pending_invite';

// Cache sincrónico: capturarInviteDeURL lo setea al instante (lectura de la URL
// es sync), así el procesamiento tras el login no depende de que AsyncStorage
// termine de escribir — evita la carrera del usuario ya logueado que recarga
// sobre /invitacion/<token>.
let tokenEnMemoria = null;

// Lee /invitacion/<token> de la URL, lo guarda y limpia la barra de direcciones.
// Es sync en lo esencial (URL + cache); persiste en AsyncStorage en segundo plano.
export function capturarInviteDeURL() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const m = window.location.pathname.match(/^\/invitacion\/([^/?#]+)/i);
  if (!m) return;
  const token = m[1];
  tokenEnMemoria = token;
  try {
    AsyncStorage.setItem(KEY, token);
    // Limpiar la URL para que no reprocese al recargar.
    window.history.replaceState({}, '', '/');
  } catch { /* noop */ }
}

export async function getPendingInvite() {
  if (tokenEnMemoria) return tokenEnMemoria;
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}

export async function clearPendingInvite() {
  tokenEnMemoria = null;
  try { await AsyncStorage.removeItem(KEY); } catch { /* noop */ }
}
