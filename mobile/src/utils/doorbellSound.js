// src/utils/doorbellSound.js
// Sonido de timbre para el PWA (web). Reproduce el archivo real
// /timbretimbrecasa.mp3 (está en mobile/public, Expo lo copia a la raíz web).
// Si por lo que sea el archivo no puede sonar, cae a un "din-don" sintetizado.
//
// iOS/Safari NO deja reproducir audio "por las suyas": hay que desbloquearlo
// DENTRO de un gesto del usuario (un toque). Como el timbre suena por un timer
// (no por un toque), se desbloquea en el primer toque que el usuario haga en la
// app. Por eso `armarDesbloqueoDeAudio()` engancha un listener de un solo uso.
import { Platform } from 'react-native';

const esWeb = Platform.OS === 'web';
const ARCHIVO = '/timbretimbrecasa.mp3';

let audio = null;         // HTMLAudioElement con el mp3
let desbloqueado = false;
let ctx = null;           // Web Audio (solo para el respaldo sintetizado)

function getAudio() {
  if (!esWeb) return null;
  if (!audio && typeof Audio !== 'undefined') {
    audio = new Audio(ARCHIVO);
    audio.preload = 'auto';
  }
  return audio;
}

// ─── Respaldo: "din-don" sintetizado si el mp3 no puede sonar ────────────────
function getCtx() {
  if (!esWeb) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}
function campana(context, freq, inicio, duracion, volumen) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(volumen, inicio + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}
function reproducirSintetizado() {
  const context = getCtx();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
  const t = context.currentTime;
  const V = 0.35;
  campana(context, 660, t + 0.00, 0.55, V);
  campana(context, 523, t + 0.45, 0.75, V);
  campana(context, 660, t + 1.30, 0.55, V);
  campana(context, 523, t + 1.75, 0.75, V);
}

// Vibra (si el dispositivo/navegador lo soporta). Sirve como aviso aunque iOS
// bloquee el audio: en Android/PWA la vibración no necesita desbloqueo previo.
function vibrar() {
  try {
    if (esWeb && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([300, 150, 300, 150, 300]);
    }
  } catch { /* noop */ }
}

// ─── Reproducir el timbre ────────────────────────────────────────────────────
// `insistente` (por defecto true) repica dos veces para que sea más difícil de
// pasar por alto con la app abierta.
export function reproducirTimbre(insistente = true) {
  if (!esWeb) return;
  vibrar();
  const a = getAudio();
  if (!a) { reproducirSintetizado(); return; }
  try {
    a.currentTime = 0;
    a.volume = 1;
    const p = a.play();
    // Si el navegador rechaza la reproducción (no desbloqueado, error de red…),
    // caemos al sonido sintetizado para no quedarnos mudos.
    if (p && typeof p.catch === 'function') p.catch(() => reproducirSintetizado());
    // Segundo repique para insistir (no se solapa: espera a que termine el 1º).
    if (insistente) {
      const repetir = () => {
        a.removeEventListener('ended', repetir);
        setTimeout(() => { try { a.currentTime = 0; a.play().catch(() => {}); } catch {} }, 350);
      };
      a.addEventListener('ended', repetir);
    }
  } catch {
    reproducirSintetizado();
  }
}

// ─── Desbloqueo de audio en el primer gesto (requisito de iOS) ───────────────
export function armarDesbloqueoDeAudio() {
  if (!esWeb || desbloqueado) return;

  const desbloquear = () => {
    // Primar el <audio>: reproducir en silencio y pausar, dentro del gesto.
    const a = getAudio();
    if (a) {
      const volPrevio = a.volume;
      try {
        a.volume = 0;
        const p = a.play();
        const finalizar = () => { a.pause(); a.currentTime = 0; a.volume = volPrevio; };
        if (p && typeof p.then === 'function') p.then(finalizar).catch(() => { a.volume = volPrevio; });
        else finalizar();
      } catch { a.volume = volPrevio; }
    }
    // Y reanudar el AudioContext del respaldo, por las dudas.
    const context = getCtx();
    if (context && context.state === 'suspended') context.resume().catch(() => {});

    desbloqueado = true;
    quitar();
  };

  const quitar = () => {
    window.removeEventListener('touchstart', desbloquear);
    window.removeEventListener('touchend', desbloquear);
    window.removeEventListener('mousedown', desbloquear);
    window.removeEventListener('keydown', desbloquear);
  };

  window.addEventListener('touchstart', desbloquear);
  window.addEventListener('touchend', desbloquear);
  window.addEventListener('mousedown', desbloquear);
  window.addEventListener('keydown', desbloquear);
}
