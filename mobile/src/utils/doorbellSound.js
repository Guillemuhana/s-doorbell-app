// src/utils/doorbellSound.js
// Sonido de timbre para el PWA (web). Se sintetiza un "din-don" con Web Audio,
// así no depende de ningún archivo de audio.
//
// iOS/Safari NO deja reproducir audio "por las suyas": el AudioContext arranca
// suspendido y sólo se puede reanudar DENTRO de un gesto del usuario (un toque).
// Como el timbre suena por un timer (no por un toque), hay que desbloquear el
// audio en el primer toque que haga el usuario en la app. Por eso
// `armarDesbloqueoDeAudio()` engancha un listener de un solo uso.
import { Platform } from 'react-native';

const esWeb = Platform.OS === 'web';

let ctx = null;
let desbloqueado = false;

function getCtx() {
  if (!esWeb) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Un golpe de campana: una nota con ataque rápido y caída suave.
function campana(context, freq, inicio, duracion, volumen) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Envolvente: sube de golpe y decae exponencial, como un timbre real.
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(volumen, inicio + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}

// "Din-don" clásico (dos notas descendentes), repetido dos veces.
export function reproducirTimbre() {
  const context = getCtx();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
  const t = context.currentTime;
  const V = 0.35;
  // din-don
  campana(context, 660, t + 0.00, 0.55, V);   // din (mi)
  campana(context, 523, t + 0.45, 0.75, V);   // don (do)
  // repite
  campana(context, 660, t + 1.30, 0.55, V);
  campana(context, 523, t + 1.75, 0.75, V);
}

// Desbloqueo de audio: en el primer toque del usuario reanudamos el contexto y
// reproducimos un buffer silencioso, que es lo que iOS exige para habilitar el
// audio programático posterior.
export function armarDesbloqueoDeAudio() {
  if (!esWeb || desbloqueado) return;

  const desbloquear = () => {
    const context = getCtx();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    // buffer mudo de 1 frame
    try {
      const buf = context.createBuffer(1, 1, 22050);
      const src = context.createBufferSource();
      src.buffer = buf;
      src.connect(context.destination);
      src.start(0);
    } catch { /* no pasa nada */ }
    desbloqueado = true;
    quitar();
  };

  const quitar = () => {
    window.removeEventListener('touchstart', desbloquear);
    window.removeEventListener('touchend', desbloquear);
    window.removeEventListener('mousedown', desbloquear);
    window.removeEventListener('keydown', desbloquear);
  };

  window.addEventListener('touchstart', desbloquear, { once: false });
  window.addEventListener('touchend', desbloquear, { once: false });
  window.addEventListener('mousedown', desbloquear, { once: false });
  window.addEventListener('keydown', desbloquear, { once: false });
}
