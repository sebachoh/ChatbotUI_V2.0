const apiKey = '8RRQZYV-M8YM6K5-HMWY316-CVAHSW0'; // Your API key

async function testAuthGet() {
    const url = 'http://localhost:3001/api/v1/openai/models'; // Auth endpoint

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // Log the full response data
        console.log('Auth GET response:', responseData);

        // Assuming responseData is an object with a 'data' array
        if (responseData.data && Array.isArray(responseData.data)) {
            responseData.data.forEach(model => {
                console.log(`Model Name: ${model.name}`);
                console.log(`Model ID: ${model.model}`);
                console.log(`LLM Provider: ${model.llm.provider}`);
                console.log(`LLM Model: ${model.llm.model}`);
                // Add any other properties you want to log
                console.log('--------------------------');
            });
        } else {
            console.log('No models found in response data.');
        }

    } catch (error) {
        console.error('Error connecting to API:', error);
    }
}

testAuthGet();