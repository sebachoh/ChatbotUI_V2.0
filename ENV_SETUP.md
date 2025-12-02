# Cómo usar variables de entorno (.env)

## Configuración

1. **Asegúrate de que tu archivo `.env` existe** en la raíz del proyecto con:
   ```
   # AnythingLLM API Key (usado para el chatbot)
   API_KEY_LLM=tu-api-key-anythingllm-aqui
   
   # Gemini API Key (disponible para uso futuro)
   API_KEY=tu-api-key-gemini-aqui
   
   # URL de la API
   API_URL=http://localhost:3001/api/v1/openai/chat/completions
   ```

2. **Instala las dependencias** (ya hecho):
   ```bash
   npm install
   ```

3. **Inicia el servidor backend**:
   ```bash
   node server.js
   ```
   
   Deberías ver: `Server running on http://localhost:3001`

4. **En otra terminal, inicia el servidor frontend**:
   ```bash
   python3 -m http.server 8000
   ```

5. **Abre tu navegador** en `http://localhost:8000`

## Cómo funciona

- El archivo `server.js` lee las variables del `.env` usando `dotenv`
- El endpoint `/api/config` devuelve la API key al frontend
- `chatbotUI.js` hace una petición a este endpoint al cargar la página
- Si el servidor no está disponible, usa valores por defecto (fallback)

## Seguridad

✅ El `.env` está en `.gitignore` - nunca se subirá a Git
✅ La API key solo se expone a través del servidor local
✅ El frontend la obtiene de forma segura desde el backend

## Scripts útiles

Puedes agregar estos scripts a tu `package.json`:
```json
"scripts": {
  "start": "node server.js",
  "dev": "node server.js"
}
```

Luego puedes usar: `npm start`
