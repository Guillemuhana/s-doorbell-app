# Deploy de S-Doorbell

Tres piezas, dos servicios:

| Pieza | Dónde | Qué es |
|---|---|---|
| **API** (`backend/`) | Render | Express + Supabase |
| **Web del visitante** (`visitor-web/`) | Render, dentro de la API | La página que abre el QR (`/visit`) |
| **App del residente** (`mobile/`) | Vercel | El PWA que instalás en el celular |

> **El orden importa.** Hay una dependencia circular: la API necesita saber la URL
> del PWA (para el CORS) y el PWA necesita saber la URL de la API. Por eso Render
> se configura en dos pasos, con Vercel en el medio.

---

## 0. Subir el código a GitHub

El repo `sdoobeel` tiene el prototipo viejo en Next.js (enero 2026) y **no se toca**.
Este proyecto va a un repo nuevo.

1. Crear un repo **vacío** en github.com (sin README, sin .gitignore), ej. `s-doorbell-app`.
2. Conectarlo y subir:

```bash
git remote rename origin legacy-nextjs   # conserva el link al repo viejo
git remote add origin https://github.com/TU-USUARIO/s-doorbell-app.git
git push -u origin main
```

---

## 1. API en Render

1. Render → **New → Blueprint** → elegir el repo. Detecta `backend/render.yaml`.
2. Cargar las variables marcadas `sync: false` (las que no se versionan):

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | el de `backend/.env` |
   | `SUPABASE_SERVICE_KEY` | el de `backend/.env` |
   | `JWT_SECRET` | el de `backend/.env` (si lo cambiás, se deslogean todos) |
   | `BASE_URL` | *(vacío por ahora — no sabés la URL todavía)* |
   | `VISITOR_BASE_URL` | *(vacío por ahora)* |
   | `APP_BASE_URL` | *(vacío por ahora)* |

3. Deploy. Al terminar, Render te da una URL: `https://sdoorbell-api.onrender.com`.
4. Verificar que vive: abrir `https://sdoorbell-api.onrender.com/health`.
5. Volver a las env vars y completar, ahora que sabés la URL:
   - `BASE_URL` = `https://sdoorbell-api.onrender.com`
   - `VISITOR_BASE_URL` = `https://sdoorbell-api.onrender.com/visit`

---

## 2. PWA en Vercel

1. Vercel → **Add New → Project** → importar el mismo repo.
2. **Root Directory: `mobile`** ← clave. Sin esto no encuentra nada.
   El resto lo toma de `mobile/vercel.json`.
3. Environment Variables:

   | Variable | Valor |
   |---|---|
   | `EXPO_PUBLIC_API_BASE_URL` | `https://sdoorbell-api.onrender.com` |

   Sin `/api` al final: `api.js` lo agrega solo.

4. Deploy → te da `https://s-doorbell-app.vercel.app`.

---

## 3. Cerrar el círculo

Volver a Render y setear:

- `APP_BASE_URL` = `https://s-doorbell-app.vercel.app`

Render redeploya solo. **Sin esto el CORS bloquea la app** y vas a ver "Network
Error" en cada login, sin ninguna pista de por qué.

---

## 4. Instalar en el iPhone

1. Abrir la URL de Vercel **en Safari** (Chrome en iOS no puede instalar PWAs).
2. Compartir → **Agregar a pantalla de inicio**.
3. Abrirla desde el ícono, no desde Safari.

Tiene que arrancar sin barra de direcciones. Si aparece la barra, el manifest no
cargó.

---

## Cosas que te van a morder

- **Render free se duerme** a los 15 min de inactividad; el primer request tarda
  ~50 s en despertar. Para un timbre es inaceptable → plan pago o un ping que lo
  mantenga vivo.
- **El disco de Render es efímero**: las fotos de casas en `backend/uploads/`
  desaparecen en cada deploy. Hay que moverlas a Supabase Storage.
- **Push con la app cerrada todavía no anda.** Falta Web Push (VAPID + service
  worker). Mientras la app está abierta, el `RingWatcher` detecta los timbrazos
  por polling.
- **La cámara y el service worker exigen HTTPS.** Todo esto es imposible de probar
  sobre `http://192.168.x.x`.
- Si tocás la web del visitante, acordate de que hay **dos copias**
  (`visitor-web/` y `backend/visitor-web/`) y `server.js` sirve la de `backend/`.
