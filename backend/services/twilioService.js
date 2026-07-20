// services/twilioService.js
// Llamada telefónica REAL al tocar el timbre. A diferencia del push (que en el
// PWA de iPhone no puede sonar fuerte con el teléfono bloqueado), una llamada
// entrante suena "sí o sí" como cualquier llamada del sistema.
//
// Usa la REST API de Twilio directamente (fetch + Basic auth) para no sumar el
// SDK. Requiere en el entorno (Vercel → proyecto API):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Si falta cualquiera, el servicio queda inactivo (no rompe el timbrazo).
const logger = require('../config/logger');

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const FROM = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_FROM || '';

const twilioConfigurado = !!(SID && TOKEN && FROM);

// Normaliza a formato E.164 (+549…). Devuelve null si no parece válido.
// El teléfono se guarda en el perfil; conviene cargarlo como +54911XXXXXXXX.
const normalizarTelefono = (tel) => {
  if (!tel) return null;
  let t = String(tel).trim().replace(/[\s().-]/g, '');
  if (t.startsWith('00')) t = `+${t.slice(2)}`;
  if (!t.startsWith('+')) return null; // sin código de país no podemos llamar con seguridad
  return /^\+\d{8,15}$/.test(t) ? t : null;
};

// Escapa texto para meterlo dentro del XML (TwiML).
const escXml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Llama a un número y reproduce un mensaje hablado (voz de Twilio, en español).
 * Devuelve { success } o { success:false, error }.
 */
const llamarTimbre = async ({ to, visitorName, address }) => {
  if (!twilioConfigurado) return { success: false, error: 'Twilio no configurado' };
  const dest = normalizarTelefono(to);
  if (!dest) return { success: false, error: 'Teléfono inválido' };

  const quien = visitorName ? escXml(visitorName) : 'Alguien';
  const donde = address ? escXml(address) : 'tu casa';
  // Repetimos el aviso para dar tiempo a atender.
  const twiml =
    '<Response>' +
    `<Say language="es-MX" voice="alice">Están tocando el timbre en ${donde}. ${quien} está en la puerta.</Say>` +
    '<Pause length="1"/>' +
    `<Say language="es-MX" voice="alice">Repito: ${quien} está tocando tu timbre.</Say>` +
    '</Response>';

  try {
    const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const body = new URLSearchParams({ To: dest, From: FROM, Twiml: twiml });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.warn(`Twilio call failed (${res.status}): ${detail.slice(0, 300)}`);
      return { success: false, error: `Twilio ${res.status}` };
    }
    return { success: true };
  } catch (error) {
    logger.error('Twilio call error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { llamarTimbre, twilioConfigurado, normalizarTelefono };
