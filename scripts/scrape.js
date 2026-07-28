const https = require('https');
const fs = require('fs');

const urls = [
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/mision/',
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/vision/',
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/historia/',
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/perfil-del-aspirante/',
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/perfil-de-formacion/',
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/perfil-del-egresado/',
    'https://tecnologia.utp.edu.co/ingenieria-mecatronica/sin-categoria/perfil-profesional/',
    'https://comunicaciones.utp.edu.co/91398/sin-categoria/ingenieria-mecatronica-18-anos-de-historia-innovacion-y-futuro/'
];

let allData = '';
let completed = 0;

urls.forEach(url => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            // Extracción sencilla: remover estilos, scripts y tags HTML
            let title = url.split('/').filter(Boolean).pop().toUpperCase().replace(/-/g, ' ');
            let text = data.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                           .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/\s+/g, ' ')
                           .trim();
            
            allData += `\n\n--- ${title} ---\n\n` + text;
            completed++;

            if (completed === urls.length) {
                fs.writeFileSync('data/info_carrera.txt', allData);
                console.log('Se extrajo exitosamente toda la información de misión, visión, historia y perfiles en data/info_carrera.txt');
            }
        });
    }).on('error', err => console.error(err));
});
