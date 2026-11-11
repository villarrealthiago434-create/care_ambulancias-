const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la raíz y desde la carpeta public
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para servir index.html (buscando en raíz o en public)
app.get('/', (req, res) => {
    const filePathRoot = path.join(__dirname, 'index.html');
    const filePathPublic = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(filePathRoot)) {
        res.sendFile(filePathRoot);
    } else if (fs.existsSync(filePathPublic)) {
        res.sendFile(filePathPublic);
    } else {
        fs.readdir(__dirname, (err, files) => {
            console.error(`[CARE ERROR] Archivos en __dirname (${__dirname}):`, files);
            res.status(404).send(`Error 404: No se encontró el archivo index.html ni en la raíz ni en la carpeta public. Archivos disponibles: ${files ? files.join(', ') : 'ninguno'}`);
        });
    }
});

// Ruta API de estado
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'CARE - Sistema de Gestión de Traslados de Ambulancias',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`[CARE] Servidor corriendo en el puerto ${PORT}`);
});
