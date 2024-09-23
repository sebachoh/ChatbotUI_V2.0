$(document).ready(function() {
    var robotResponseCount = 0; // Contador respuestas.

    // Texto introductorio del robot
    var introText = "Este es Mecani, tu asistente virtual para la carrera de Ingeniería Mecatrónica en la Universidad Tecnológica de Pereira. Aquí puedes consultar sobre microcurrículos, laboratorios, horarios, servicios disponibles y requisitos del programa. ¡Estoy aquí para responder todas tus preguntas y guiarte en lo que necesites!";
    
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
    typeWriter(introText, 'intro-text');

    $('#enviar').on('click', function(event) {
        event.preventDefault(); // Previene el envío del formulario
        var inputText = $('#campo-de-texto input[type="text"]').val(); // Obtiene el texto del input

        // Validación: Si el campo de texto está vacío, mostrar alerta y no continuar
        if (inputText.trim() === '') {
            $('#enviar').prop('disabled', false);
            return; // Detiene la ejecución si el campo está vacío
        }
        else{
            $('#enviar').prop('disabled', true);
        }

        // Limitar caracteres y agregar salto de línea
        var maxChars = 50; // Cantidad de caracteres antes del salto de línea
        var formattedText = '';

        if (inputText.length > maxChars) {
            // Divide el texto en partes de máximo `maxChars`
            for (var i = 0; i < inputText.length; i += maxChars) {
                formattedText += inputText.substring(i, i + maxChars) + '<br>'; // Salto de línea
            }
        } else {
            formattedText = inputText; // Si no supera el límite, se muestra todo
        }

        // Aquí se añade un nuevo div del humano con su nuevo mensaje
        var humanMessage = '<div class="humano">' +
                           '<div id="cuadrodetexto">' +
                           '<h2>' + formattedText + '</h2>' +
                           '</div>' +
                           '<div id="imagendehumano">' +
                           '<img src="img/favicon/iconhuman.png" alt="IconoHumano" id="iconodehumano">' +
                           '</div>' +
                           '</div>';

        // Añadir el mensaje del humano al chat
        $('#chat').append(humanMessage);

        // Limpiar el input
        $('#campo-de-texto input[type="text"]').val('');

        // Incrementar el contador de respuestas del robot
        robotResponseCount++;

        // Aquí se añade un nuevo div del robot con una respuesta automática
        var robotMessage = '<div class="robot">' +
                            '<div id="imagenderobot">' +
                            '<img src="img/favicon/robotico.png" alt="IconoRobot" id="iconoderobot">' +
                            '</div>' +
                            '<div id="cuadrodetexto">' +
                            '<h2 id="robot-response-' + robotResponseCount + '"></h2>' +
                            '</div>' +
                            '</div>';

        // Añadir el mensaje del robot debajo del mensaje del humano
        $('#chat').append(robotMessage);

        // Iniciar la máquina de escribir para la respuesta del robot
        typeWriter("Respuesta automática del robot #" + robotResponseCount, 'robot-response-' + robotResponseCount);
    });

    // Función de máquina de escribir
    function typeWriter(textToType, elementId) {
        var index = 0;
        var speed = 10; // Velocidad de tipeo (milisegundos por letra)
    
        function type() {
            if (index < textToType.length) {
                $('#' + elementId).append(textToType.charAt(index)); // Añade letra por letra
                index++;
                setTimeout(type, speed); // Llama a la función de nuevo
            } else {
                // Habilita el botón de enviar cuando termine de escribir
                $('#enviar').prop('disabled', false);
            }
        }
        type(); // Inicia la máquina de escribir
    }
});
