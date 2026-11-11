const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));
app.use(express.static(__dirname));

// Ruta principal con depuración detallada
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    
    console.log(`[CARE DEBUG] Intentando servir: ${filePath}`);
    console.log(`[CARE DEBUG] ¿Existe el archivo?: ${fs.existsSync(filePath)}`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Listar archivos del directorio actual para depurar en los logs de Render
        fs.readdir(__dirname, (err, files) => {
            console.error(`[CARE ERROR] Archivos en __dirname (${__dirname}):`, files);
            res.status(404).send(`Error 404: No se encontró el archivo index.html. Directorio actual contiene: ${files ? files.join(', ') : 'error al leer'}`);
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
