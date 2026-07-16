# Deploy de S-Doorbell

Todo va a **Vercel**, en **dos proyectos** que salen del mismo repo. Se distinguen
por el *Root Directory*:

| Proyecto | Root Directory | URL | Qué es |
|---|---|---|---|
| `s-doorbell-app-e1ty` | `backend` | https://s-doorbell-app-e1ty.vercel.app | La **API**: Express como función serverless. Sirve además la web del visitante en `/visit` (la que abre el QR). |
| `s-doorbell-app` | `mobile` | https://s-doorbell-app.vercel.app | La **App**: el PWA que instalás en el celular. |

Sí, los nombres confunden: `s-doorbell-app` es la app y `s-doorbell-app-e1ty` es
la API (Vercel le agregó el sufijo solo). El que manda es el **Root Directory**.

La base de datos es Supabase y ya está andando: no se toca.

> **Por qué serverless y no un server tradicional**: el backend es *stateless* —
> las fotos van a Supabase Storage (`services/storageService.js`), no al disco. No
> necesita disco ni proceso vivo. En los planes free con servidor persistente
> (Render, Fly) la instancia se duerme y el primer request tarda ~50 s en
> despertar: para un timbre eso no sirve. Un cold start serverless es de ~1-2 s.

> **El orden importa.** Hay una dependencia circular: la API necesita la URL del
> PWA (para el CORS) y el PWA necesita la URL de la API (para compilar). Por eso
> la API se configura en dos tandas, con la App en el medio.

---

## 1. API (proyecto Vercel #1)

1. Vercel → **Add New → Project** → importar `s-doorbell-app`.
2. **Root Directory: `backend`**.
3. Environment Variables:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SUPABASE_URL` | el de `backend/.env` |
   | `SUPABASE_SERVICE_KEY` | el de `backend/.env` |
   | `JWT_SECRET` | el de `backend/.env` (si lo cambiás, se deslogean todos) |

   Las tres URLs (`BASE_URL`, `VISITOR_BASE_URL`, `APP_BASE_URL`) van después:
   todavía no las conocés.

4. Deploy → te da algo como `https://s-doorbell-api.vercel.app`.
5. Verificar que vive: abrir `https://s-doorbell-api.vercel.app/health`.
6. Volver a Environment Variables y agregar, ahora que sabés la URL:

   | Variable | Valor |
   |---|---|
   | `BASE_URL` | `https://s-doorbell-api.vercel.app` |
   | `VISITOR_BASE_URL` | `https://s-doorbell-api.vercel.app/visit` |

---

## 2. App / PWA (proyecto Vercel #2)

1. Vercel → **Add New → Project** → importar **el mismo repo** otra vez.
2. **Root Directory: `mobile`** ← clave. El resto lo toma de `mobile/vercel.json`.
3. Environment Variables:

   | Variable | Valor |
   |---|---|
   | `EXPO_PUBLIC_API_BASE_URL` | `https://s-doorbell-api.vercel.app` |

   Sin `/api` al final: `api.js` lo agrega solo.

4. Deploy → te da `https://s-doorbell-app.vercel.app`.

---

## 3. Cerrar el círculo

Volver al proyecto **API** y agregar:

| Variable | Valor |
|---|---|
| `APP_BASE_URL` | `https://s-doorbell-app.vercel.app` |

Redeploy de la API. **Sin esto el CORS bloquea la app**: vas a ver "Network Error"
en cada login, sin ninguna pista de por qué.

---

## 4. Instalar en el iPhone

1. Abrir la URL de la App **en Safari** (Chrome en iOS no puede instalar PWAs).
2. Compartir → **Agregar a pantalla de inicio**.
3. Abrirla desde el ícono, no desde Safari.

Tiene que arrancar sin barra de direcciones. Si aparece la barra, el manifest no
cargó.

---

## Cosas que te van a morder

- **Deployment Protection**: los deployments con hash en la URL
  (`...-knl77qwu0-...`) nacen protegidos por el SSO de Vercel y redirigen todo a
  un login: la API se vuelve inalcanzable para la app. Usar siempre la URL de
  producción, y tener la protección apagada (Settings → Deployment Protection).
- **El logger rompía la función serverless**: winston crea la carpeta al
  instanciar un transporte de archivo y en Vercel el filesystem es de solo
  lectura salvo `/tmp` (`ENOENT mkdir '/var/task/backend/logs'`). Ya está
  arreglado en `config/logger.js`: si detecta `VERCEL`, loguea a stdout. Si algún
  día agregás otro transporte de archivo, se rompe de nuevo.
- **Push con la app cerrada todavía no anda.** Falta Web Push (VAPID + service
  worker). Mientras la app está abierta, el `RingWatcher` detecta los timbrazos
  por polling. Es el pendiente grande.
- **La videollamada todavía no anda en web.** `CallScreen.js` busca
  `react-native-webrtc` (módulo nativo) y muestra "solo en dev build". En el
  navegador hay que usar las APIs nativas de WebRTC: falta escribir esa variante.
- **La cámara y el service worker exigen HTTPS.** Nada de esto se puede probar
  sobre `http://192.168.x.x`.
- **Metro cachea la config**: `expo export -p web` sin `--clear` reusa el bundle
  viejo y deja la IP de la LAN hardcodeada, aunque la env var esté bien. Por eso
  `build:web` lleva `--clear`. Si el PWA deployado le pega a `192.168.0.184`, es
  esto.
- Si tocás la web del visitante, acordate de que hay **dos copias**
  (`visitor-web/` y `backend/visitor-web/`) y `server.js` sirve la de `backend/`.
- **El dashboard de Supabase no es accesible** con la cuenta actual (el proyecto
  `vdnmloiffquaylohzdzb` es de otra). La service key funciona, así que la app anda,
  pero no se pueden correr migraciones nuevas hasta recuperar esa cuenta.
