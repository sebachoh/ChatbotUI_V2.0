/**
 * Módulo para generar embeddings usando Google AI Studio.
 * Utiliza el modelo text-embedding-004.
 */

async function getEmbedding(text, apiKey) {
    if (!text || text.trim() === '') return null;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'models/gemini-embedding-2',
                content: {
                    parts: [{ text: text }]
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Error al obtener embedding');
        }
        
        return data.embedding.values; // Array de números (vector)
    } catch (error) {
        console.error('Error generando embedding:', error);
        throw error;
    }
}

module.exports = {
    getEmbedding
};
