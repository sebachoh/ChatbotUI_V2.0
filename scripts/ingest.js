require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getEmbedding } = require('../src/rag/embeddings');
const { VectorStore } = require('../src/rag/vectorStore');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHUNK_SIZE = 500; // Caracteres por fragmento aproximado

// Función simple para dividir texto en fragmentos (chunks)
function chunkText(text, size) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = i + size;
        // Buscar el último espacio antes del límite para no cortar palabras
        if (end < text.length) {
            const lastSpace = text.lastIndexOf(' ', end);
            if (lastSpace > i) {
                end = lastSpace;
            }
        }
        chunks.push(text.substring(i, end).trim());
        i = end + 1; // Avanzar
    }
    return chunks;
}

async function run() {
    console.log('--- Iniciando Ingesta de Datos para RAG ---');
    
    const apiKey = process.env.API_KEY || process.env.API_KEY_LLM;
    if (!apiKey) {
        console.error('Error: API_KEY no encontrada en .env');
        process.exit(1);
    }

    const vectorStore = new VectorStore();
    // Reiniciar la base de datos de ser necesario (opcional)
    vectorStore.documents = [];

    // Leer archivos en data/
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    
    if (files.length === 0) {
        console.log('No se encontraron archivos .txt o .md en la carpeta data/');
        return;
    }

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        console.log(`Procesando archivo: ${file}`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = chunkText(content, CHUNK_SIZE);
        
        console.log(`- Dividido en ${chunks.length} fragmentos. Generando embeddings...`);
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (chunk.length < 10) continue; // Ignorar muy cortos
            
            try {
                const vector = await getEmbedding(chunk, apiKey);
                vectorStore.addDocument(chunk, vector, { source: file, chunkIndex: i });
                process.stdout.write('.'); // Progreso
            } catch (error) {
                console.error(`\nError procesando chunk ${i} del archivo ${file}:`, error);
            }
            
            // Pequeña pausa para no saturar la API
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('\n- Embeddings generados exitosamente.');
    }

    vectorStore.save();
    console.log('--- Ingesta Completada Exitosamente ---');
}

run();
