const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'vector_db.json');

// Calcula la Similitud del Coseno entre dos vectores (a y b)
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class VectorStore {
    constructor() {
        this.documents = []; // Array de { id, text, embedding, metadata }
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DB_PATH)) {
                const data = fs.readFileSync(DB_PATH, 'utf-8');
                this.documents = JSON.parse(data);
                console.log(`[VectorStore] Cargados ${this.documents.length} fragmentos de conocimiento.`);
            } else {
                console.log('[VectorStore] No se encontró vector_db.json, el motor RAG iniciará vacío.');
                this.documents = [];
            }
        } catch (error) {
            console.error('[VectorStore] Error cargando la base de datos vectorial:', error);
            this.documents = [];
        }
    }

    save() {
        try {
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DB_PATH, JSON.stringify(this.documents, null, 2));
            console.log(`[VectorStore] Guardados ${this.documents.length} fragmentos en la base de datos.`);
        } catch (error) {
            console.error('[VectorStore] Error guardando la base de datos vectorial:', error);
        }
    }

    addDocument(text, embedding, metadata = {}) {
        this.documents.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            text,
            embedding,
            metadata
        });
    }

    // Busca los k documentos más relevantes dada la vectorización de la pregunta
    similaritySearch(queryEmbedding, k = 3) {
        if (this.documents.length === 0) return [];

        // Calcular similitud de todos los documentos con la query
        const results = this.documents.map(doc => {
            const score = cosineSimilarity(queryEmbedding, doc.embedding);
            return {
                text: doc.text,
                metadata: doc.metadata,
                score: score
            };
        });

        // Ordenar de mayor a menor similitud (score)
        results.sort((a, b) => b.score - a.score);

        // Devolver los top K
        return results.slice(0, k);
    }
}

module.exports = {
    VectorStore,
    cosineSimilarity
};
