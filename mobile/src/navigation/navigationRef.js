// src/navigation/navigationRef.js
// Ref global de navegación para poder abrir pantallas desde fuera del árbol de
// componentes (p. ej. al recibir una videollamada en RingWatcher o un push).
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
