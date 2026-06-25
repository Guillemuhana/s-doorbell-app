// db/mappers.js
// Traduce filas de Supabase (snake_case, id) a la forma que espera la app (camelCase, _id).

const mapUsuario = (r) => r && ({
  _id: r.id,
  nombre: r.nombre,
  apellido: r.apellido,
  email: r.email,
  telefono: r.telefono,
  foto_fachada: r.foto_fachada,
  pushToken: r.push_token,
  isActive: r.is_active,
  forzarCambioPassword: r.forzar_cambio_password,
  lastLogin: r.last_login,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapDireccion = (r, extra = {}) => r && ({
  _id: r.id,
  owner: r.owner_id,
  nombre: r.nombre,
  tipo: r.tipo,
  direccion: r.direccion,
  foto: r.foto,
  lat: r.lat,
  lng: r.lng,
  activa: r.activa,
  createdAt: r.created_at,
  ...extra,
});

const mapTimbre = (r) => r && ({
  _id: r.id,
  direccion: r.direccion_id,
  nombre: r.nombre,
  tipo: r.tipo,
  qrId: r.qr_id,
  qrImage: r.qr_image,
  activo: r.activo,
  modoGeo: r.modo_geo,
  createdAt: r.created_at,
});

const mapEvento = (r) => {
  if (!r) return r;
  const dir = r.direccion || (r.direccion_id ? { id: r.direccion_id } : null);
  const tim = r.timbre || (r.timbre_id ? { id: r.timbre_id } : null);
  return {
    _id: r.id,
    userId: r.user_id,
    tipo: r.tipo,
    visitorName: r.visitor_name,
    visitorIP: r.visitor_ip,
    notificationSent: r.notification_sent,
    notificationError: r.notification_error,
    visitorLat: r.visitor_lat,
    visitorLng: r.visitor_lng,
    visitorAccuracy: r.visitor_accuracy,
    distanciaMetros: r.distancia_metros,
    ubicacionVerificada: r.ubicacion_verificada,
    direccionId: dir ? { _id: dir.id, nombre: dir.nombre } : null,
    timbreId: tim ? { _id: tim.id, nombre: tim.nombre } : null,
    createdAt: r.created_at,
  };
};

const mapInvitacion = (r) => r && ({
  _id: r.id,
  direccion: r.direccion_id,
  email: r.email,
  rol: r.rol,
  token: r.token,
  estado: r.estado,
  expiresAt: r.expires_at,
  createdAt: r.created_at,
});

const mapCallSession = (r) => r && ({
  _id: r.id,
  direccionId: r.direccion_id,
  timbreId: r.timbre_id,
  eventoId: r.evento_id,
  visitorName: r.visitor_name,
  estado: r.estado,
  answeredBy: r.answered_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  endedAt: r.ended_at,
});

module.exports = { mapUsuario, mapDireccion, mapTimbre, mapEvento, mapInvitacion, mapCallSession };
