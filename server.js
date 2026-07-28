require('dotenv').config();
const crypto = require('crypto');
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
const CHAT_API_TOKEN = process.env.CHAT_API_TOKEN;

if (process.env.NODE_ENV === 'production') {
    if (!CHAT_API_TOKEN || CHAT_API_TOKEN.includes('genera-un-token')) {
        console.error('[Seguridad] CHAT_API_TOKEN es obligatorio en producción.');
        process.exit(1);
    }
}

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);
const ALLOWED_LANGUAGES = new Set(['Español', 'English', 'Français']);

// Render y otros reverse proxies: usar IP real del cliente en rate limiting
app.set('trust proxy', 1);

const vectorStore = new VectorStore();

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');

const defaultAllowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://mecani.onrender.com']
    : [
        'https://mecani.onrender.com',
        'http://localhost:3001',
        'http://127.0.0.1:3001'
    ];

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(normalizeOrigin)
    : defaultAllowedOrigins;

function isCorsAllowedOrigin(origin) {
    return !origin || allowedOrigins.includes(normalizeOrigin(origin));
}

function isStrictAllowedOrigin(origin) {
    return Boolean(origin) && allowedOrigins.includes(normalizeOrigin(origin));
}

function isAllowedReferer(referer) {
    if (!referer) return false;
    try {
        const origin = new URL(referer).origin;
        return allowedOrigins.includes(normalizeOrigin(origin));
    } catch {
        return false;
    }
}

function hasTrustedBrowserOrigin(req) {
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    if (isStrictAllowedOrigin(origin) || isAllowedReferer(referer)) {
        return true;
    }

    // Para peticiones GET del mismo origen donde el navegador omite Origin y Referer
    const host = req.get('Host');
    if (host) {
        const httpsHost = normalizeOrigin(`https://${host}`);
        const httpHost = normalizeOrigin(`http://${host}`);
        return allowedOrigins.includes(httpsHost) || allowedOrigins.includes(httpHost);
    }

    return false;
}

function tokensMatch(provided, expected) {
    if (!provided || !expected) return false;

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function validateMessages(messages) {
    if (!Array.isArray(messages)) {
        return 'El campo messages debe ser un arreglo.';
    }
    if (messages.length === 0) {
        return 'Se requiere al menos un mensaje.';
    }
    if (messages.length > MAX_MESSAGES) {
        return `Máximo ${MAX_MESSAGES} mensajes por conversación.`;
    }

    for (const msg of messages) {
        if (!msg || typeof msg !== 'object') {
            return 'Formato de mensaje inválido.';
        }
        if (!ALLOWED_ROLES.has(msg.role)) {
            return 'Rol de mensaje no permitido.';
        }
        if (typeof msg.content !== 'string') {
            return 'El contenido del mensaje debe ser texto.';
        }
        if (msg.content.trim() === '') {
            return 'Los mensajes no pueden estar vacíos.';
        }
        if (msg.content.length > MAX_MESSAGE_LENGTH) {
            return `Cada mensaje admite máximo ${MAX_MESSAGE_LENGTH} caracteres.`;
        }
    }

    return null;
}

function requireChatToken(req, res, next) {
    if (!CHAT_API_TOKEN) {
        return next();
    }

    const token = req.get('X-Chat-Token');
    if (!tokensMatch(token, CHAT_API_TOKEN)) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    return next();
}

app.use(helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    }
}));

const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Se ha excedido el límite de consultas. Por favor, intenta de nuevo más tarde.' }
});

const chatLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Se ha excedido el límite de mensajes. Por favor, intenta de nuevo más tarde.' }
});

const sessionTokenLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes de sesión. Intenta de nuevo más tarde.' }
});

app.use('/api/', apiLimiter);

const corsOptions = {
    origin(origin, callback) {
        if (isCorsAllowedOrigin(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Origen bloqueado: ${origin}`);
        return callback(null, false);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-Chat-Token'],
    maxAge: 86400
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

app.get('/api/config', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Mecani Chatbot API Proxy with RAG',
        provider: 'Google AI Studio (Gemini)',
        documentsLoaded: vectorStore.documents.length,
        authRequired: Boolean(CHAT_API_TOKEN)
    });
});

app.get('/api/session-token', sessionTokenLimiter, (req, res) => {
    if (!CHAT_API_TOKEN) {
        return res.json({ token: null });
    }

    if (!hasTrustedBrowserOrigin(req)) {
        return res.status(403).json({ error: 'Origen no permitido.' });
    }

    return res.json({ token: CHAT_API_TOKEN });
});

app.post('/api/chat', chatLimiter, requireChatToken, async (req, res) => {
    try {
        const apiKey = process.env.API_KEY || process.env.API_KEY_LLM;

        if (!apiKey || apiKey.includes('tu-api-key')) {
            return res.status(503).json({
                error: 'El servicio no está configurado correctamente.'
            });
        }

        const rawMessages = req.body.messages || [];
        const validationError = validateMessages(rawMessages);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const language = req.body.language;
        if (language !== undefined && language !== null && !ALLOWED_LANGUAGES.has(language)) {
            return res.status(400).json({ error: 'Idioma no soportado.' });
        }

        // El system prompt lo controla exclusivamente el servidor
        const messages = rawMessages.filter((m) => m.role !== 'system');

        let contextText = '';
        if (messages.length > 0 && vectorStore.documents.length > 0) {
            try {
                const lastUserMessage = messages[messages.length - 1].content;
                const queryEmbedding = await getEmbedding(lastUserMessage, apiKey);

                if (queryEmbedding) {
                    const topResults = vectorStore.similaritySearch(queryEmbedding, 3);
                    if (topResults.length > 0) {
                        contextText = '\n\n--- INFORMACIÓN OFICIAL PARA RESPONDER ---\n' +
                            topResults.map((r) => r.text).join('\n\n');
                    }
                }
            } catch (err) {
                console.error('Error durante la búsqueda vectorial:', err);
            }
        }

        let baseSystemPrompt = 'Eres Mecani.';
        try {
            baseSystemPrompt = await fs.promises.readFile(path.join(__dirname, 'prompt.txt'), 'utf-8');
        } catch (e) {
            console.warn('No se pudo leer prompt.txt, usando fallback.');
        }

        let finalSystemMessage = baseSystemPrompt + (contextText ? ('\n\n--- CONTEXTO OFICIAL ---\n' + contextText) : '');

        if (language) {
            finalSystemMessage += `\n\n--- INSTRUCCIÓN OBLIGATORIA ---\nDebes responder SIEMPRE a las preguntas del usuario en este idioma: ${language}. Si el usuario te habla en un idioma diferente, tradúcelo y respóndele en ${language}.`;
        }

        messages.unshift({ role: 'system', content: finalSystemMessage });

        const fallbackModels = ['gemini-3.1-flash-lite', 'gemma-4-26b-a4b-it', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        let lastError = null;

        const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
        const userContents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
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
                }

                const errorData = await geminiRes.json();
                console.log(`[Error Payload] de ${model}:`, JSON.stringify(errorData));
                if (geminiRes.status === 429) {
                    console.warn(`[Quota Exceeded] El modelo ${model} agotó la cuota. Pasando al siguiente modelo...`);
                    lastError = new Error('Quota Exceeded');
                    continue;
                }
                console.warn(`[API Error] Fallo con ${model}:`, errorData.error?.message);
                lastError = new Error(errorData.error?.message || `Error con ${model}`);
            } catch (err) {
                console.warn(`Error de red/ejecución con el modelo ${model}:`, err.message);
                lastError = err;
            }
        }

        throw new Error(`Todos los modelos de respaldo fallaron. Último error: ${lastError?.message || 'desconocido'}`);
    } catch (error) {
        console.error('Error en el proxy de /api/chat:', error);
        res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo más tarde.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
