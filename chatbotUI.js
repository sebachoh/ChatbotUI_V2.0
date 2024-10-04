$(document).ready(function() {
    var robotResponseCount = 0; // Contador respuestas.
    var chatHistory = []; // Historial de chat para mantener el contexto

    // Texto introductorio del robot
    var introText = "Este es Mecani, tu asistente virtual para la carrera de Ingeniería Mecatrónica en la Universidad Tecnológica de Pereira...";
    
    // Agregar solo una vez el div del robot
    $('#chat').prepend('<div class="robot">' +
                        '<div id="imagenderobot">' +
                        '<img src="img/favicon/robotico.png" alt="IconoRobot" id="iconoderobot">' +
                        '</div>' +
                        '<div id="cuadrodetexto">' +
                        '<h2 id="intro-text"></h2>' +
                        '</div>' +
                        '</div>');

    // Iniciar la máquina de escribir para el texto introductorio
    typeWriter(introText, 'intro-text', function() {
        $('#enviar').prop('disabled', false); // Habilitar el botón después del texto introductorio
    });

    $('#enviar').on('click', async function(event) {
        event.preventDefault(); // Previene el envío del formulario
        var inputText = $('#campo-de-texto input[type="text"]').val(); // Obtiene el texto del input

        if (inputText.trim() === '') {
            $('#enviar').prop('disabled', false);
            return; // Detiene la ejecución si el campo está vacío
        } else {
            $('#enviar').prop('disabled', true); // Deshabilitar el botón mientras se procesa el mensaje
        }

        var maxChars = 50; // Cantidad de caracteres antes del salto de línea
        var formattedText = '';

        if (inputText.length > maxChars) {
            for (var i = 0; i < inputText.length; i += maxChars) {
                formattedText += inputText.substring(i, i + maxChars) + '<br>';
            }
        } else {
            formattedText = inputText;
        }

        var humanMessage = '<div class="humano">' +
                           '<div id="cuadrodetexto">' +
                           '<h2>' + formattedText + '</h2>' +
                           '</div>' +
                           '<div id="imagendehumano">' +
                           '<img src="img/favicon/iconhuman.png" alt="IconoHumano" id="iconodehumano">' +
                           '</div>' +
                           '</div>';

        $('#chat').append(humanMessage);
        $('#campo-de-texto input[type="text"]').val(''); // Limpiar input

        robotResponseCount++;

        // Agregar el mensaje del usuario al historial
        chatHistory.push({
            role: "user",
            content: inputText
        });

        // Llamar a la función de la API con el texto del usuario y el historial
        const apiResponse = await sendChatCompletion(chatHistory);

        var robotMessage = '<div class="robot">' +
                            '<div id="imagenderobot">' +
                            '<img src="img/favicon/robotico.png" alt="IconoRobot" id="iconoderobot">' +
                            '</div>' +
                            '<div id="cuadrodetexto">' +
                            '<h2 id="robot-response-' + robotResponseCount + '"></h2>' +
                            '</div>' +
                            '</div>';

        $('#chat').append(robotMessage);

        // Iniciar la máquina de escribir para la respuesta del robot
        typeWriter(apiResponse, 'robot-response-' + robotResponseCount, function() {
            $('#enviar').prop('disabled', false); // Rehabilitar el botón de enviar cuando termine de escribir
        });

        // Agregar la respuesta del asistente al historial
        chatHistory.push({
            role: "assistant",
            content: apiResponse
        });
    });

    function typeWriter(textToType, elementId, callback) {
        var index = 0;
        var speed = 10; // Velocidad de tipeo (milisegundos por letra)
    
        function type() {
            if (index < textToType.length) {
                $('#' + elementId).append(textToType.charAt(index));
                index++;
                setTimeout(type, speed); // Llama a la función de nuevo
            } else {
                if (typeof callback === "function") {
                    callback(); // Llama al callback cuando termina de escribir
                }
            }
        }
        type(); // Inicia la máquina de escribir
    }

    $('#limpiar-chat').on('click', function(event) {
        location.reload();
    });

    $('#compartir-enlace').on('click', function(event) {
        var copyText = window.location.href;
        navigator.clipboard.writeText(copyText);
        alert("Enlace copiado: " + copyText);
    });

    $('#wsp').on('click', function(event) {
        window.open("https://wa.me/573216067542");
    });

    // Aquí integramos el segundo script para hacer la llamada a la API
    const apiKey = '8RRQZYV-M8YM6K5-HMWY316-CVAHSW0';
    const url = 'https://393f-186-81-124-54.ngrok-free.app/api/v1/openai/chat/completions';

    async function sendChatCompletion(chatHistory) {
        const data = {
            messages: [
                {
                    role: "system",
                    content: "Tu nombre es Mecani y eres un asistente/secretario del programa de Ingeniería Mecatrónica, estás aquí para responder a todas las preguntas que pueda tener la comunidad educativa acerca del programa de Ingeniería Mecatrónica"
                },
                ...chatHistory // Incluir el historial de mensajes en la solicitud
            ],
            model: "workspace1",
            stream: true,
            temperature: 0.5
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
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullResponseText += chunk;
            }

            const lines = fullResponseText.split('\n').filter(line => line.startsWith('data:'));
            let combinedContent = '';

            lines.forEach(line => {
                const jsonPart = line.replace('data: ', '');
                const jsonData = JSON.parse(jsonPart);

                jsonData.choices.forEach(choice => {
                    if (choice.delta && choice.delta.content) {
                        combinedContent += choice.delta.content;
                    }
                });
            });

            const cleanedContent = combinedContent.replace(/(?:\\n|\s+)/g, ' ').trim();
            console.log(cleanedContent); // Log para ver en terminal

            return cleanedContent;

        } catch (error) {
            console.error('Error connecting to API:', error);
            return "Hubo un error al conectar con la API.";
        }
    }
});
