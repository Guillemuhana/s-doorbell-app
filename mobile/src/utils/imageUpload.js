// src/utils/imageUpload.js
// Arma un FormData con una imagen elegida (expo-image-picker) que funcione en
// ambos lados:
//  • Nativo (iOS/Android): React Native acepta el objeto { uri, name, type }.
//  • Web (PWA): el navegador NO entiende ese objeto — hay que mandar un Blob/File
//    real. Si se le pasa { uri, ... } lo serializa como "[object Object]" y el
//    backend recibe basura → la foto "no se guarda". Por eso en web bajamos el
//    uri (blob:/data:/http) a un Blob y lo adjuntamos como archivo.
import { Platform } from 'react-native';

const guessType = (name, fallback = 'image/jpeg') => {
  const m = /\.(\w+)$/.exec(name || '');
  if (!m) return fallback;
  const ext = m[1].toLowerCase();
  if (ext === 'jpg') return 'image/jpeg';
  return `image/${ext}`;
};

// Devuelve un FormData listo para subir la imagen bajo el campo `fieldName`.
export async function buildImageFormData(fieldName, asset) {
  const form = new FormData();
  const uri = asset?.uri;
  const name = (asset?.fileName) || (uri ? uri.split('/').pop().split('?')[0] : 'foto.jpg') || 'foto.jpg';
  const type = asset?.mimeType || guessType(name);

  if (Platform.OS === 'web') {
    // Convertir el uri a Blob real (fetch anda con blob:, data: y http(s):).
    const res = await fetch(uri);
    const blob = await res.blob();
    // Nombre con extensión coherente para que multer/el backend lo acepte.
    const safeName = /\.\w+$/.test(name) ? name : `${name}.jpg`;
    form.append(fieldName, blob, safeName);
  } else {
    form.append(fieldName, { uri, name, type });
  }
  return form;
}
