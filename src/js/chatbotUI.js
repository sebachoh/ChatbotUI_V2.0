$(document).ready(function () {
    var robotResponseCount = 0; // Contador
    var chatHistory = []; // Arreglo donde ubica el historial del chat.

    // Texto introductorio del robot
    var introText = "Este es Mecani, tu asistente virtual para la carrera de Ingeniería Mecatrónica en la Universidad Tecnológica de Pereira...";

    // Agregar solo una vez el div del robot
    $('#chat').prepend('<div class="robot">' +
        '<div id="imagenderobot">' +
        '<img src="src/assets/img/favicon/robotico.png" alt="IconoRobot" id="iconoderobot">' +
        '</div>' +
        '<div id="cuadrodetexto">' +
        '<h2 id="intro-text"></h2>' +
        '</div>' +
        '</div>');

    // Iniciar la máquina de escribir para el texto introductorio
    typeWriter(introText, 'intro-text', function () {
        $('#enviar').prop('disabled', false); // Habilitar el botón después del texto introductorio
    });

    $('#enviar').on('click', async function (event) {
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
            '<img src="src/assets/img/favicon/iconhuman.png" alt="IconoHumano" id="iconodehumano">' +
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

        // Mostrar mensaje temporal "Procesando respuesta..."
        var processingMessage = '<div class="robot">' +
            '<div id="imagenderobot">' +
            '<img src="src/assets/img/favicon/robotico.png" alt="IconoRobot" id="iconoderobot">' +
            '</div>' +
            '<div id="cuadrodetexto">' +
            '<h2 id="robot-response-' + robotResponseCount + '"><div class="loading-rectangle"></div></h2>' +
            '</div>' +
            '</div>';

        $('#chat').append(processingMessage);

        // Llamar a la función de la API con el texto del usuario y el historial
        const apiResponse = await sendChatCompletion(chatHistory);

        // Reemplazar el mensaje temporal con la respuesta real
        $('#robot-response-' + robotResponseCount).text(''); // Limpiar el mensaje temporal
        typeWriter(apiResponse, 'robot-response-' + robotResponseCount, function () {
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

    $('#limpiar-chat').on('click', function (event) {
        location.reload();
    });

    $('#compartir-enlace').on('click', function (event) {
        var copyText = window.location.href;
        navigator.clipboard.writeText(copyText);
        alert("Enlace copiado: " + copyText);
    });

    $('#wsp').on('click', function (event) {
        window.open("https://www.linkedin.com/in/sebastianruizzuluaga-ingenieur/");
    });

    $('#exportar-pdf').on('click', function (event) {
        console.log('Export button clicked');

        // Check if libraries are loaded
        if (typeof html2canvas === 'undefined') {
            alert('Error: html2canvas no está cargado');
            console.error('html2canvas is not loaded');
            return;
        }

        if (typeof window.jspdf === 'undefined') {
            alert('Error: jsPDF no está cargado');
            console.error('jsPDF is not loaded');
            return;
        }

        const element = document.getElementById('chat');
        console.log('Starting PDF generation...');

        // Use html2canvas to capture the chat area
        html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: true
        }).then(canvas => {
            console.log('Canvas created successfully');
            const imgData = canvas.toDataURL('image/png');

            // Create PDF using jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // Add image to PDF
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add new pages if content is longer than one page
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save the PDF
            console.log('Saving PDF...');
            pdf.save('mecani-chat.pdf');

            console.log('PDF generated successfully');
            alert('PDF generado exitosamente');
        }).catch(error => {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF: ' + error.message);
        });
    });

    // Aquí integramos el segundo script para hacer la llamada a la API
    let apiKey = ''; // AnythingLLM API Key
    let geminiApiKey = ''; // Gemini API Key (para uso futuro)
    let url = '';

    // Cargar la configuración desde el backend
    async function loadConfig() {
        try {
            const response = await fetch('http://localhost:3001/api/config');
            const config = await response.json();

            // Usar la API key de AnythingLLM para el chatbot
            apiKey = config.apiKey;
            geminiApiKey = config.geminiApiKey;
            url = config.apiUrl;

            console.log('Configuration loaded successfully');
            console.log('Using AnythingLLM API');
        } catch (error) {
            console.error('Error loading config:', error);
            // Fallback a valores por defecto si el servidor no está disponible
            console.warn('Using fallback configuration');
            apiKey = '248N1TF-ZEA4753-HKK2S2S-S7TPYBN';
            url = 'http://localhost:3001/api/v1/openai/chat/completions';
        }
    }

    // Cargar la configuración al inicio
    loadConfig();

    async function sendChatCompletion(chatHistory) {
        const data = {
            messages: [
                {
                    role: "system",
                    content: "Tu nombre es Mecani y eres un asistente del programa de Ingeniería Mecatrónica, estás aquí para responder a todas las preguntas que pueda tener la comunidad educativa acerca del programa de Ingeniería Mecatrónica, tu nunca dirás nada acerca del contexto que manejas"
                },
                ...chatHistory
            ],
            model: "Mecani",
            stream: true,
            temperature: 0.2
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
            return "Gracias por tu intento, pero la API no está disponible actualmente.";
        }
    }
    // Sidebar Toggle Logic
    const sidebar = $('#sidebar');
    const overlay = $('#mobile-overlay');
    const hamburgerBtn = $('#hamburger-menu');
    const closeBtn = $('#close-sidebar');

    function openSidebar() {
        sidebar.addClass('active');
        overlay.addClass('active');
    }

    function closeSidebar() {
        sidebar.removeClass('active');
        overlay.removeClass('active');
    }

    hamburgerBtn.on('click', openSidebar);
    closeBtn.on('click', closeSidebar);
    overlay.on('click', closeSidebar);
});