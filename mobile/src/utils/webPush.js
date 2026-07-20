// src/utils/webPush.js
// Suscripción a Web Push desde el PWA. Pide permiso de notificaciones, se
// suscribe con la llave VAPID del servidor y manda la suscripción al backend.
//
// iOS: SÓLO funciona si el PWA está agregado a la pantalla de inicio (standalone)
// y en iOS 16.4+. En una pestaña normal de Safari no se puede suscribir.
import { Platform } from 'react-native';
import { pushAPI } from './api';

const esWeb = Platform.OS === 'web';

// Convierte la llave VAPID (base64url) al formato que pide PushManager.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function soportaWebPush() {
  return (
    esWeb &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ¿El PWA está corriendo instalado (standalone)? En iOS es requisito para push.
export function esPWAInstalado() {
  if (!esWeb || typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Intenta suscribir al usuario a Web Push. Devuelve un estado para poder
 * mostrarle algo útil en la UI.
 *   'ok' | 'no-soportado' | 'no-instalado' | 'permiso-denegado' | 'error'
 */
/**
 * Estado actual de las notificaciones, SIN pedir permiso ni suscribir (para
 * mostrarlo en la UI). Devuelve:
 *   'ok' | 'no-soportado' | 'no-instalado' | 'permiso-pendiente'
 *   | 'permiso-denegado' | 'sin-suscripcion'
 */
export async function estadoWebPush() {
  if (!soportaWebPush()) return 'no-soportado';
  if (!esPWAInstalado() && /iphone|ipad|ipod/i.test(navigator.userAgent)) return 'no-instalado';
  if (Notification.permission === 'denied') return 'permiso-denegado';
  if (Notification.permission !== 'granted') return 'permiso-pendiente';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'ok' : 'sin-suscripcion';
  } catch {
    return 'sin-suscripcion';
  }
}

/**
 * Re-suscribe en silencio si YA hay permiso concedido (sin molestar con
 * diálogos). Sirve para refrescar la suscripción cada vez que se abre la app:
 * en iOS la suscripción puede vencer y, si no se renueva, dejan de llegar los
 * timbres. No hace nada si falta permiso o no está instalado.
 */
export async function refrescarWebPush() {
  if (!soportaWebPush()) return;
  if (!esPWAInstalado() && /iphone|ipad|ipod/i.test(navigator.userAgent)) return;
  if (Notification.permission !== 'granted') return;
  try {
    await suscribirWebPush();
  } catch { /* noop */ }
}

export async function suscribirWebPush() {
  if (!soportaWebPush()) return 'no-soportado';
  // En iOS, sin estar instalado, ni siquiera se puede pedir permiso útilmente.
  if (!esPWAInstalado() && /iphone|ipad|ipod/i.test(navigator.userAgent)) return 'no-instalado';

  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return 'permiso-denegado';

    const reg = await navigator.serviceWorker.ready;

    // Reusar suscripción existente o crear una nueva.
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { data } = await pushAPI.getVapidKey();
      if (!data || !data.publicKey) return 'error';
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await pushAPI.subscribe(sub.toJSON ? sub.toJSON() : sub);
    return 'ok';
  } catch (e) {
    return 'error';
  }
}
