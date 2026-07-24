// src/utils/webAlert.js
// PARCHE CRÍTICO PARA EL PWA (web).
// En react-native-web, `Alert.alert()` es una función VACÍA (no-op): no muestra
// nada y NUNCA ejecuta los onPress de los botones. Eso rompe en el navegador:
//   • los diálogos de confirmación (borrar timbrazo, borrar unidad, etc.) no hacen nada
//   • los alerts de error no se ven → la pantalla parece "tildada"
// Acá reemplazamos Alert.alert por una versión basada en window.confirm/alert que
// SÍ respeta los botones. Como todos los imports comparten el mismo objeto Alert,
// con parchearlo una vez quedan arreglados todos los usos de la app.
import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons, options) => {
    const texto = [title, message].filter(Boolean).join('\n\n');

    // Sin botones o un solo botón → alerta informativa.
    if (!buttons || buttons.length === 0) {
      window.alert(texto);
      return;
    }
    if (buttons.length === 1) {
      window.alert(texto);
      const b = buttons[0];
      if (b && typeof b.onPress === 'function') b.onPress();
      return;
    }

    // Dos o más botones → confirmación. Distinguimos el "cancelar" del de acción.
    const cancelBtn = buttons.find((b) => b && b.style === 'cancel');
    const accionBtn = buttons.find((b) => b && b.style !== 'cancel') || buttons[buttons.length - 1];

    const acepto = window.confirm(texto);
    if (acepto) {
      if (accionBtn && typeof accionBtn.onPress === 'function') accionBtn.onPress();
    } else if (cancelBtn && typeof cancelBtn.onPress === 'function') {
      cancelBtn.onPress();
    }
  };
}
