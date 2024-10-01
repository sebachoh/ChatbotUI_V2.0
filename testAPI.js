const apiKey = '8RRQZYV-M8YM6K5-HMWY316-CVAHSW0'; // Your API key
const url = 'http://localhost:3001/api/v1/openai/chat/completions'; // The endpoint for chat completions

async function sendChatCompletion() {
    const data = {
        messages: [
            {
                role: "system",
                content: "Tu nombre es Sandrita y eres una secretaria del programa de Ingeniería Mecatrónica de la Universidad Tecnológica de Pereira, ayudarás a la comunidad educativa a resolver sus dudas de la carrera de Ingeniería Mecatrónica"
            },
            {
                role: "user",
                content: "Quien eres?"
            },
            {
                role: "assistant",
                content: "Tu nombre es Sandrita"
            },
            {
                role: "user",
                content: "Cuántos laboratorios tiene la carrera de ingeniería Mecatrónica?"
            }
        ],
        model: "workspace1", // Updated model to match the information you received
        stream: true,
        temperature: 0.7
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': '*/*',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        let fullResponseText = '';

        // Read the response body as a stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullResponseText += chunk;
        }

        //console.log('Raw Streamed Response:', fullResponseText); // Log for debugging

        // Split by new line and process lines
        const lines = fullResponseText.split('\n').filter(line => line.startsWith('data:'));
        let combinedContent = '';

        lines.forEach(line => {
            // Extract JSON part
            const jsonPart = line.replace('data: ', '');
            const jsonData = JSON.parse(jsonPart);

            // Combine the content from choices
            jsonData.choices.forEach(choice => {
                if (choice.delta && choice.delta.content) {
                    combinedContent += choice.delta.content; // Append content
                }
            });
        });

        // Clean up the final content
        const cleanedContent = combinedContent
            .replace(/(?:\\n|\s+)/g, ' ') // Replace line breaks or excessive whitespace with a single space
            .trim(); // Trim leading/trailing whitespace

        //console.log('Cleaned Content as Paragraph:', cleanedContent);
        console.log(cleanedContent); // Log cleaned paragraph

    } catch (error) {
        console.error('Error connecting to API:', error);
    }
}

sendChatCompletion();
