const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la raíz
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname)));

// Ruta principal para servir index.html
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        fs.readdir(__dirname, (err, files) => {
            console.error(`[CARE ERROR] Archivos en __dirname (${__dirname}):`, files);
            res.status(404).send(`Error 404: No se encontró el archivo index.html en el servidor. Archivos disponibles: ${files ? files.join(', ') : 'ninguno'}`);
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
