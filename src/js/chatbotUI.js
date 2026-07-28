$(document).ready(function () {
    var robotResponseCount = 0; // Contador
    var chatHistory = []; // Arreglo donde ubica el historial del chat.
    var chatApiToken = null;
    const MAX_INPUT_LENGTH = 4000;

    const translations = {
        es: {
            introText: "Este es Mecani, tu asistente virtual para la carrera de Ingeniería Mecatrónica en la Universidad Tecnológica de Pereira. ¿En qué te puedo orientar hoy?",
            status_online: "En línea - RAG Activo",
            sidebar_actions: "Acciones",
            action_clear: "Limpiar chat",
            action_share: "Compartir enlace",
            action_support: "Soporte",
            action_export: "Exportar chat",
            input_placeholder: "Pregúntale a Mecani sobre Mecatrónica UTP...",
            lang_name: "Español"
        },
        en: {
            introText: "This is Mecani, your virtual assistant for Mechatronics Engineering at the Technological University of Pereira. How can I help you today?",
            status_online: "Online - RAG Active",
            sidebar_actions: "Actions",
            action_clear: "Clear chat",
            action_share: "Share link",
            action_support: "Support",
            action_export: "Export chat",
            input_placeholder: "Ask Mecani about UTP Mechatronics...",
            lang_name: "English"
        },
        fr: {
            introText: "Voici Mecani, votre assistant virtuel pour l'ingénierie mécatronique à l'Université Technologique de Pereira. Comment puis-je vous aider aujourd'hui ?",
            status_online: "En ligne - RAG Actif",
            sidebar_actions: "Actions",
            action_clear: "Effacer le chat",
            action_share: "Partager le lien",
            action_support: "Support",
            action_export: "Exporter le chat",
            input_placeholder: "Demandez à Mecani à propos de la Mécatronique UTP...",
            lang_name: "Français"
        }
    };

    let currentLang = 'es';

    function updateLanguage() {
        const langData = translations[currentLang];
        $('[data-i18n]').each(function() {
            const key = $(this).attr('data-i18n');
            if (langData[key]) {
                $(this).text(langData[key]);
            }
        });
        $('[data-i18n-placeholder]').each(function() {
            const key = $(this).attr('data-i18n-placeholder');
            if (langData[key]) {
                $(this).attr('placeholder', langData[key]);
            }
        });
    }

    $('#language-selector').on('change', function() {
        currentLang = $(this).val();
        updateLanguage();
        // Solo reescribir si no hay historial de chat
        if (chatHistory.length === 0) {
            introText = translations[currentLang].introText;
            $('#intro-text').empty();
            typeWriter(introText, 'intro-text', function () {
                $('#enviar').prop('disabled', $('#campo-de-texto input[type="text"]').val().trim() === '');
            });
        }
    });

    // Texto introductorio del robot inicial
    var introText = translations[currentLang].introText;

    // Función para mostrar notificaciones Toast elegantes
    function showToast(message) {
        var toast = $('<div class="toast"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span>' + message + '</span></div>');
        $('#toast-container').append(toast);
        setTimeout(function () {
            toast.addClass('toast-exit');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3000);
    }

    let isProcessing = false;

    // Auto-scroll al final del chat sin encolar animaciones
    function scrollToBottom() {
        var chatBox = $('#chat');
        // Usar .stop(true, true) para limpiar la cola de animaciones y evitar que el scroll 'tiemble' o falle
        chatBox.stop(true, true).animate({ scrollTop: chatBox[0].scrollHeight }, 100);
    }

    // Habilitar/Deshabilitar botón de enviar dinámicamente según el texto del input
    $('#campo-de-texto input[type="text"]').attr('maxlength', MAX_INPUT_LENGTH);
    $('#campo-de-texto input[type="text"]').on('input', function () {
        var text = $(this).val().trim();
        $('#enviar').prop('disabled', text === '');
    });

    async function initChatSession() {
        try {
            const response = await fetch('/api/session-token');
            if (!response.ok) return;
            const data = await response.json();
            chatApiToken = data.token || null;
        } catch (error) {
            console.warn('No se pudo obtener el token de sesión del chat.');
        }
    }

    initChatSession();

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
        $('#enviar').prop('disabled', $('#campo-de-texto input[type="text"]').val().trim() === '');
    });

    $('#enviar').on('click', async function (event) {
        event.preventDefault(); // Previene el envío del formulario
        
        if (isProcessing) return; // Bloquear si ya está procesando un mensaje
        
        var inputText = $('#campo-de-texto input[type="text"]').val(); // Obtiene el texto del input

        if (inputText.trim() === '') {
            return; // Detiene la ejecución si el campo está vacío
        }

        if (inputText.length > MAX_INPUT_LENGTH) {
            showToast('El mensaje es demasiado largo.');
            return;
        }

        isProcessing = true;
        $('#enviar').prop('disabled', true); // Deshabilitar el botón mientras se procesa el mensaje
        $('#campo-de-texto input[type="text"]').prop('disabled', true); // Deshabilitar el input para evitar múltiples envíos

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
        scrollToBottom();

        robotResponseCount++;

        // Agregar el mensaje del usuario al historial
        chatHistory.push({
            role: "user",
            content: inputText
        });

        // Mostrar mensaje temporal "Procesando respuesta..." con animación de resplandor
        var robotMessageId = 'robot-msg-' + robotResponseCount;
        var processingMessage = '<div class="robot thinking" id="' + robotMessageId + '">' +
            '<div id="imagenderobot">' +
            '<img src="src/assets/img/favicon/robotico.png" alt="IconoRobot" id="iconoderobot">' +
            '</div>' +
            '<div id="cuadrodetexto">' +
            '<h2 id="robot-response-' + robotResponseCount + '"><div class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></h2>' +
            '</div>' +
            '</div>';

        $('#chat').append(processingMessage);
        scrollToBottom();

        // Llamar a la función de la API con el texto del usuario y el historial
        const apiResponse = await sendChatCompletion(chatHistory);

        // Remover la clase de pensando y reemplazar el loader por el texto
        $('#' + robotMessageId).removeClass('thinking');
        $('#robot-response-' + robotResponseCount).html('');
        typeWriter(apiResponse, 'robot-response-' + robotResponseCount, function () {
            isProcessing = false;
            $('#campo-de-texto input[type="text"]').prop('disabled', false).focus();
            $('#enviar').prop('disabled', $('#campo-de-texto input[type="text"]').val().trim() === '');
        });

        // Agregar la respuesta del asistente al historial
        chatHistory.push({
            role: "assistant",
            content: apiResponse
        });
    });

    // Función para procesar la sintaxis Markdown a HTML (Protegido contra XSS)
    function formatMarkdown(text) {
        if (!text) return '';
        const htmlText = text
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
            
        // Usar DOMPurify para eliminar posibles inyecciones de script
        return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(htmlText) : htmlText;
    }

    function typeWriter(textToType, elementId, callback) {
        var index = 0;
        var speed = 12; // Velocidad de tipeo optimizada

        function type() {
            if (index < textToType.length) {
                index++;
                var currentSubstring = textToType.substring(0, index);
                $('#' + elementId).html(formatMarkdown(currentSubstring) + '<span class="typing-cursor"></span>');
                // Usar scroll sin animación jQuery para la escritura para no saturar
                var chatBox = $('#chat')[0];
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(type, speed);
            } else {
                $('#' + elementId).html(formatMarkdown(textToType));
                scrollToBottom();
                if (typeof callback === "function") {
                    callback();
                }
            }
        }
        type();
    }

    $('#limpiar-chat').on('click', function (event) {
        location.reload();
    });

    $('#compartir-enlace').on('click', function (event) {
        var copyText = window.location.href;
        navigator.clipboard.writeText(copyText);
        showToast("Enlace copiado al portapapeles");
    });

    $('#wsp').on('click', function (event) {
        window.open("https://www.linkedin.com/in/sebastianruizzuluaga-ingenieur/");
    });

    $('#exportar-pdf').on('click', function (event) {
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            showToast("Error: Librerías de exportación no cargadas");
            return;
        }

        const element = document.getElementById('chat');
        showToast("Generando reporte PDF...");

        html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('mecani-chat.pdf');
            showToast("PDF exportado exitosamente");
        }).catch(error => {
            showToast("Error al exportar PDF");
        });
    });

    // Petición al servidor backend (Proxy seguro)
    async function sendChatCompletion(chatHistory) {
        const data = {
            messages: [
                ...chatHistory
            ],
            language: translations[currentLang].lang_name
        };

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (chatApiToken) {
                headers['X-Chat-Token'] = chatApiToken;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: headers,
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
            $('#robot-response-' + robotResponseCount).css('color', '#ef4444');
            return "El sistema de comunicación está experimentando fallas en este momento: " + error.message;
        }
    }

    // Sidebar Toggle Logic
    const sidebar = $('#sidebar');
    const overlay = $('#mobile-overlay');
    const hamburgerBtn = $('#hamburger-menu');
    const closeBtn = $('#close-sidebar');
    const toggleSliderBtn = $('#sidebar-toggle-btn');

    function openSidebar() {
        sidebar.addClass('active');
        overlay.addClass('active');
    }

    function closeSidebar() {
        sidebar.removeClass('active');
        overlay.removeClass('active');
    }

    // Toggle slider logic para colapsar o desplegar la barra lateral
    toggleSliderBtn.on('click', function () {
        sidebar.toggleClass('collapsed');
        $('.board').toggleClass('expanded');
        toggleSliderBtn.toggleClass('collapsed');
    });

    hamburgerBtn.on('click', openSidebar);
    closeBtn.on('click', closeSidebar);
    overlay.on('click', closeSidebar);
});