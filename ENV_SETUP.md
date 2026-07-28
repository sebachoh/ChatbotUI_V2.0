# Cómo usar variables de entorno (.env)

## Configuración

1. **Copia el archivo de ejemplo** en la raíz del proyecto:

   ```bash
   cp .env.example .env
   ```

2. **Edita `.env`** con tus valores reales:

   ```env
   # Gemini API Key (Google AI Studio)
   API_KEY=tu-api-key-gemini-aqui

   # Token de acceso al chat (obligatorio en producción)
   CHAT_API_TOKEN=genera-un-token-seguro-aqui

   # Orígenes permitidos para CORS
   ALLOWED_ORIGINS=https://mecani.onrender.com

   # Entorno
   NODE_ENV=production
   ```

   Para generar un token seguro:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Instala las dependencias**:

   ```bash
   npm install
   ```

4. **Inicia el servidor**:

   ```bash
   npm start
   ```

   Deberías ver: `Server running on http://localhost:3001`

5. **Abre tu navegador** en `http://localhost:3001`

## Cómo funciona

- `server.js` lee las variables del `.env` con `dotenv`.
- La API key de Gemini **nunca** se expone al frontend.
- El frontend obtiene un token de sesión desde `/api/session-token` (solo si el origen está permitido).
- Las peticiones a `/api/chat` incluyen el header `X-Chat-Token` cuando `CHAT_API_TOKEN` está configurado.
- `/api/config` devuelve solo metadatos públicos (estado, proveedor, documentos cargados).

## Seguridad

- El `.env` está en `.gitignore` — nunca se sube a Git.
- La API key de Gemini permanece solo en el servidor.
- Rate limiting: 100 req/10 min en `/api/*`, 30 req/10 min en `/api/chat`.
- CORS restrictivo con lista blanca de orígenes.
- Validación de mensajes (roles, longitud, cantidad).
- Helmet con Content Security Policy activa.
- Scripts de CDN con Subresource Integrity (SRI).
- Errores internos no se filtran al cliente.

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `API_KEY` | Sí | Clave de Google AI Studio (Gemini) |
| `CHAT_API_TOKEN` | Producción | Token para proteger `/api/chat` |
| `ALLOWED_ORIGINS` | No | Orígenes CORS permitidos (coma-separados) |
| `NODE_ENV` | No | `production` en despliegue |
| `PORT` | No | Puerto del servidor (default: 3001) |

## Scripts útiles

```bash
npm start          # Inicia el servidor
npm run dev        # Alias de start
node scripts/ingest.js   # Regenera la base vectorial RAG
```
