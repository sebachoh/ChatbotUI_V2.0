require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Endpoint para obtener la configuración de API
app.get('/api/config', (req, res) => {
    res.json({
        // AnythingLLM API Key (para el chatbot)
        apiKey: process.env.API_KEY_LLM,
        apiUrl: process.env.API_URL || 'http://localhost:3001/api/v1/openai/chat/completions',

        // Gemini API Key (disponible si se necesita en el futuro)
        geminiApiKey: process.env.API_KEY
    });
});

// Proxy para la API de AnythingLLM (opcional, más seguro)
app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch(process.env.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY_LLM}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
