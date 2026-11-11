
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(path.join(__dirname)));

// Ruta principal que sirve el archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta API de verificación de estado del servicio
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'CARE - Sistema de Gestión de Traslados de Ambulancias',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`[CARE] Servidor backend corriendo exitosamente en el puerto ${PORT}`);
});
