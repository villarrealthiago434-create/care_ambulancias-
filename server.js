const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos explícitamente desde la raíz actual
app.use(express.static(__dirname));

// Ruta principal para servir index.html
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error al enviar index.html:", err);
            res.status(404).send("Error 404: No se encontró el archivo index.html en el servidor.");
        }
    });
});

// Ruta API de verificación de estado
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'CARE - Sistema de Gestión de Traslados de Ambulancias',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`[CARE] Servidor corriendo en el puerto ${PORT}`);
});
