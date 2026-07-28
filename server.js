require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { VectorStore } = require('./src/rag/vectorStore');
const { getEmbedding } = require('./src/rag/embeddings');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar y cargar el motor RAG
const vectorStore = new VectorStore();

// Seguridad: Añadir cabeceras HTTP de protección (XSS, Clickjacking, etc)
app.use(helmet({
    contentSecurityPolicy: false // Desactivado para no romper scripts externos sin configuración estricta
}));

// Seguridad: Prevenir ataques de fuerza bruta y abusos de API
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 100, // 100 peticiones por IP
    message: { error: 'Se ha excedido el límite de consultas. Por favor, intenta de nuevo más tarde.' }
});
app.use('/api/', apiLimiter);

// Seguridad: Configurar CORS (Acepta orígenes permitidos por env, o todos si no está configurado)
const corsOptions = process.env.ALLOWED_ORIGIN ? { origin: process.env.ALLOWED_ORIGIN } : {};
app.use(cors(corsOptions));

// Seguridad: Limitar tamaño de body para prevenir ataques de saturación de memoria
app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

// Endpoint de estado de la aplicación (Sin exponer claves secretas)
app.get('/api/config', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Mecani Chatbot API Proxy with RAG',
        provider: 'Google AI Studio (Gemini)',
        documentsLoaded: vectorStore.documents.length
    });
});

// Proxy seguro para la API de Gemini (Google AI Studio)
app.post('/api/chat', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY || process.env.API_KEY_LLM;

        if (!apiKey || apiKey.includes('tu-api-key')) {
            return res.status(400).json({
                error: 'La API_KEY de Gemini no está configurada en el archivo .env del servidor.'
            });
        }

        const messages = req.body.messages || [];
        
        // --- MOTOR RAG: Búsqueda de Contexto ---
        let contextText = '';
        if (messages.length > 0 && vectorStore.documents.length > 0) {
            try {
                const lastUserMessage = messages[messages.length - 1].content;
                const queryEmbedding = await getEmbedding(lastUserMessage, apiKey);
                
                if (queryEmbedding) {
                    const topResults = vectorStore.similaritySearch(queryEmbedding, 3);
                    if (topResults.length > 0) {
                        contextText = "\n\n--- INFORMACIÓN OFICIAL PARA RESPONDER ---\n" +
                            topResults.map(r => r.text).join("\n\n");
                    }
                }
            } catch (err) {
                console.error('Error durante la búsqueda vectorial:', err);
                // Si falla el RAG, continuamos sin contexto adicional
            }
        }
        
        // Leer el system prompt desde el archivo de configuración asíncronamente (evita bloquear el event loop)
        let baseSystemPrompt = "Eres Mecani."; // Fallback
        try {
            baseSystemPrompt = await fs.promises.readFile(path.join(__dirname, 'prompt.txt'), 'utf-8');
        } catch(e) {
            console.warn("No se pudo leer prompt.txt, usando fallback.");
        }

        // Crear el mensaje de sistema definitivo combinando personalidad y contexto
        const finalSystemMessage = baseSystemPrompt + (contextText ? ("\n\n--- CONTEXTO OFICIAL ---\n" + contextText) : "");
        
        // Agregar o reemplazar el mensaje de sistema en la lista de mensajes
        const systemMessageIndex = messages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) {
            messages[systemMessageIndex].content = finalSystemMessage;
        } else {
            messages.unshift({ role: 'system', content: finalSystemMessage });
        }

        // Modelos a probar en orden (del mejor al más ligero para evitar cuotas)
        const fallbackModels = ['gemini-3.1-flash-lite', 'gemma-4-26b-a4b-it', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        let lastError = null;

        const systemMsg = messages.find(m => m.role === 'system')?.content || '';
        const userContents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        for (const model of fallbackModels) {
            try {
                console.log(`Intentando responder usando el modelo nativo: ${model}`);
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
                        contents: userContents
                    })
                });

                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    return res.json({ content: candidateText });
                } else {
                    const errorData = await geminiRes.json();
                    console.log(`[Error Payload] de ${model}:`, JSON.stringify(errorData));
                    if (geminiRes.status === 429) {
                        console.warn(`[Quota Exceeded] El modelo ${model} agotó la cuota. Pasando al siguiente modelo...`);
                        lastError = new Error('Quota Exceeded');
                        continue;
                    }
                    console.warn(`[API Error] Fallo con ${model}:`, errorData.error?.message);
                    lastError = new Error(errorData.error?.message || `Error con ${model}`);
                    continue;
                }
            } catch (err) {
                console.warn(`Error de red/ejecución con el modelo ${model}:`, err.message);
                lastError = err;
            }
        }

        // Si todos los modelos fallan
        throw new Error(`Todos los modelos de respaldo fallaron por cuota o indisponibilidad. Último error: ${lastError.message}`);

    } catch (error) {
        console.error('Error en el proxy de /api/chat:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
