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

        var formattedText = formatMarkdown(inputText);

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
        $('#robot-response-' + robotResponseCount).html(''); // Limpiar el mensaje temporal
        typeWriter(apiResponse, 'robot-response-' + robotResponseCount, function () {
            $('#enviar').prop('disabled', false); // Rehabilitar el botón de enviar cuando termine de escribir
        });

        // Agregar la respuesta del asistente al historial
        chatHistory.push({
            role: "assistant",
            content: apiResponse
        });
    });

    // Función para procesar la sintaxis Markdown a HTML
    function formatMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Negrita (**texto** o __texto__)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // Cursiva (*texto* o _texto_)
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // Código en línea (`codigo`)
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Saltos de línea
            .replace(/\n/g, '<br>');
    }

    function typeWriter(textToType, elementId, callback) {
        var index = 0;
        var speed = 10; // Velocidad de tipeo (milisegundos por letra)

        function type() {
            if (index < textToType.length) {
                index++;
                var currentSubstring = textToType.substring(0, index);
                $('#' + elementId).html(formatMarkdown(currentSubstring));
                setTimeout(type, speed); // Llama a la función de nuevo
            } else {
                $('#' + elementId).html(formatMarkdown(textToType));
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

    // Petición al servidor backend (Proxy seguro)
    async function sendChatCompletion(chatHistory) {
        const data = {
            messages: [
                ...chatHistory
            ]
        };

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error HTTP ${response.status}`);
            }

            const json = await response.json();
            return json.content || "No se recibió respuesta del asistente.";

        } catch (error) {
            console.error('Error al conectar con la API de chat:', error);
            return "Gracias por tu intento, pero la API no está disponible actualmente: " + error.message;
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