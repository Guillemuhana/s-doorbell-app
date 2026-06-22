# 🔔 S-Doorbell — Timbre Digital Inteligente

Sistema completo de timbre digital con QR. Production-ready.

---

## 📁 Estructura del Proyecto

```
s-doorbell/
├── backend/                   # Node.js + Express + MongoDB
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   ├── firebase.js        # Firebase Admin SDK
│   │   └── logger.js          # Winston logger
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── usuarioController.js
│   │   ├── visitorController.js
│   │   ├── eventoController.js
│   │   └── notificacionController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware
│   │   ├── upload.js          # Multer file upload
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── Usuario.js
│   │   └── Evento.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── usuarios.js
│   │   ├── eventos.js
│   │   ├── notificaciones.js
│   │   └── visitor.js
│   ├── services/
│   │   ├── pushNotificationService.js
│   │   └── qrService.js
│   ├── uploads/               # Uploaded images
│   ├── logs/                  # Winston logs
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── mobile/                    # React Native + Expo
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── navigation/
│   │   │   └── AppNavigator.js
│   │   ├── screens/
│   │   │   ├── LoginScreen.js
│   │   │   ├── HomeScreen.js
│   │   │   ├── CPanelScreen.js
│   │   │   ├── EditProfileScreen.js
│   │   │   ├── NotificationsScreen.js
│   │   │   ├── QRViewerScreen.js
│   │   │   ├── VisitorTestScreen.js
│   │   │   └── LoadingScreen.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   └── notifications.js
│   │   └── constants/
│   │       └── theme.js
│   ├── App.js
│   ├── app.json
│   └── package.json
│
└── visitor-web/               # HTML estático para visitantes
    └── index.html
```

---

## ⚙️ Variables de Entorno (.env)

```env
NODE_ENV=production
PORT=5000
BASE_URL=https://api.tudominio.com

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sdoorbell

JWT_SECRET=tu_secreto_de_minimo_32_caracteres_aqui
JWT_EXPIRES_IN=7d

VISITOR_BASE_URL=https://tudominio.com/visit

FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY_ID=key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🚀 Instalación Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus valores reales
npm install
mkdir -p uploads logs
npm run dev        # Desarrollo
npm start          # Producción
```

---

## 📱 Instalación Mobile

```bash
cd mobile
npm install
# Edita app.json con tu EAS project ID
npx expo start

# Para Android
npx expo start --android

# Para iOS
npx expo start --ios

# Build producción
npx eas build --platform android
npx eas build --platform ios
```

---

## 🔥 Configuración Firebase

### 1. Crear proyecto en Firebase Console
- https://console.firebase.google.com
- Nuevo proyecto → habilitar Cloud Messaging

### 2. Descargar service account
- Project Settings → Service Accounts → Generate new private key
- Guarda el JSON y extrae los campos para .env

### 3. Para Android: google-services.json
- Project Settings → Your apps → Android → Download google-services.json
- Colocarlo en: `mobile/google-services.json`

### 4. Para iOS: GoogleService-Info.plist
- Project Settings → Your apps → iOS → Download GoogleService-Info.plist
- Colocarlo en: `mobile/ios/`

---

## 🌐 API REST — Endpoints

### Auth
```
POST   /api/auth/login           # Login
POST   /api/auth/register        # Registro
GET    /api/auth/me              # Usuario actual (auth)
POST   /api/auth/refresh         # Refresh token (auth)
```

### Usuarios (auth requerida)
```
GET    /api/usuarios/:id          # Obtener usuario
PUT    /api/usuarios/:id          # Actualizar perfil
POST   /api/usuarios/:id/foto-fachada   # Subir foto (multipart/form-data)
POST   /api/usuarios/:id/push-token     # Guardar push token
GET    /api/usuarios/:id/qr             # Obtener QR
POST   /api/usuarios/:id/regenerar-qr   # Regenerar QR
```

### Eventos (auth requerida)
```
GET    /api/eventos/historial/:userId   # Historial paginado
GET    /api/eventos/stats/:userId       # Estadísticas
DELETE /api/eventos/:id                 # Eliminar evento
```

### Notificaciones (auth requerida)
```
POST   /api/notificaciones/guardar-token  # Guardar push token
POST   /api/notificaciones/test           # Enviar notif de prueba
```

### Visitor (público — rate limited)
```
GET    /api/visitor/:qrId         # Info pública de la casa
POST   /api/visitor/:qrId/ring    # TOCAR TIMBRE
```

### Health
```
GET    /health                    # Estado del servidor
```

---

## 📋 Ejemplos de Requests

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "dueno@casa.com",
  "password": "mipassword123"
}
```

### Registro
```http
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "García",
  "email": "juan@email.com",
  "password": "secure123",
  "telefono": "+54 9 11 1234-5678",
  "direccion": "Av. Corrientes 1234, CABA"
}
```

### Tocar timbre (visitante)
```http
POST /api/visitor/550e8400-e29b-41d4-a716-446655440000/ring
Content-Type: application/json

{
  "visitorName": "María González"
}
```

### Subir foto fachada
```http
POST /api/usuarios/64f1a2b3c4d5e6f7a8b9c0d1/foto-fachada
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

foto_fachada: [archivo.jpg]
```

---

## 🚢 Deploy Backend (Railway / Render / VPS)

### Railway
```bash
# Instala Railway CLI
npm install -g @railway/cli
railway login
railway init
railway link
railway up
# Agrega variables de entorno en el dashboard
```

### Render
1. Nuevo Web Service → conecta repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Agrega variables de entorno

### VPS con PM2
```bash
npm install -g pm2
pm2 start server.js --name s-doorbell
pm2 startup
pm2 save
```

---

## 🌐 Deploy Web Visitor (Nginx)

```nginx
server {
    listen 80;
    server_name tudominio.com;

    location /visit/ {
        root /var/www/s-doorbell/visitor-web;
        try_files $uri /visitor-web/index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://localhost:5000;
    }
}
```

---

## 📊 Modelos MongoDB

### Usuario
```json
{
  "_id": "ObjectId",
  "nombre": "Juan",
  "apellido": "García",
  "email": "juan@email.com",
  "password": "$2b$12$hashed",
  "telefono": "+54 9 11 1234",
  "direccion": "Av. Corrientes 1234",
  "foto_fachada": "https://api.dominio.com/uploads/uuid.jpg",
  "qrId": "550e8400-e29b-41d4-a716-446655440000",
  "qrImage": "data:image/png;base64,...",
  "pushToken": "ExponentPushToken[xxxxxx]",
  "pushTokenUpdatedAt": "2025-01-01T00:00:00Z",
  "isActive": true,
  "lastLogin": "2025-01-01T00:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### Evento
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "tipo": "timbrazo | vista_qr | login | logout",
  "visitorIP": "190.0.0.1",
  "visitorName": "María González",
  "userAgent": "Mozilla/5.0...",
  "notificationSent": true,
  "notificationError": null,
  "metadata": {},
  "createdAt": "2025-01-01T12:00:00Z"
}
```

---

## 🔒 Seguridad Implementada

- ✅ JWT Auth con expiración
- ✅ Password hashing con bcrypt (12 rounds)
- ✅ Rate limiting global + específico para timbrazos
- ✅ Helmet.js headers de seguridad
- ✅ Validación de propiedad de recursos (owners only)
- ✅ CORS configurado
- ✅ Sanitización de inputs
- ✅ File upload con filtro de tipos y tamaño máximo
- ✅ Error handler centralizado sin stack traces en producción
- ✅ MongoDB injection protection con Mongoose

---

## ✅ Checklist Pre-Deploy

- [ ] Variables de entorno configuradas
- [ ] Firebase proyecto creado y service account descargado
- [ ] MongoDB Atlas cluster creado
- [ ] Dominio configurado con HTTPS
- [ ] Nginx configurado (si VPS)
- [ ] EAS project ID configurado en app.json
- [ ] google-services.json en mobile/
- [ ] GoogleService-Info.plist en mobile/ios/
- [ ] Logs directory creado (`mkdir -p logs`)
- [ ] Uploads directory creado (`mkdir -p uploads`)
- [ ] PM2 configurado (si VPS)

---

## 💡 Flujo Completo del Sistema

```
1. Dueño instala la app S-Doorbell
2. Se registra → backend genera qrId único + QR image
3. Dueño imprime el QR y lo pega en la puerta
4. App pide permisos de notificaciones → guarda pushToken en backend

5. Visitante llega y escanea el QR con su cámara
6. Se abre: https://tudominio.com/visit/[qrId]
7. El visitante ve: foto fachada + nombre del dueño
8. Opcionalmente escribe su nombre
9. Toca el botón "TOCAR TIMBRE"

10. Backend recibe POST /api/visitor/[qrId]/ring
11. Busca al usuario por qrId
12. Envía push notification via Firebase FCM al dueño
13. Guarda el evento en MongoDB

14. El dueño recibe la notificación en su celular:
    "🔔 ¡Timbre! María está en tu puerta • 14:30 hs"
15. El dueño puede ver el historial completo en la app
```

---

*S-Doorbell v1.0.0 — Producción ready*
