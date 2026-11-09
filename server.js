const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;
const SECRET_KEY = 'clave_secreta_super_segura_ambulancias';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicialización de la base de datos SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Error conectando a SQLite:', err);
  else console.log('Base de datos SQLite optimizada y lista.');
});

// Estructura de la base de datos
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fleet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_code TEXT UNIQUE,
    driver TEXT,
    driver_phone TEXT,
    paramedic TEXT,
    paramedic_phone TEXT,
    status TEXT,
    location TEXT,
    has_bed INTEGER DEFAULT 1,
    bed_type TEXT,
    stream_url TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS solicitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institucion_solicitante TEXT NOT NULL,
    medico_solicitante TEXT NOT NULL,
    telefono_contacto TEXT NOT NULL,
    paciente_nombre TEXT NOT NULL,
    dni TEXT NOT NULL,
    edad INTEGER,
    diagnostico TEXT NOT NULL,
    origen TEXT NOT NULL,
    destino TEXT NOT NULL,
    tipo_complejidad TEXT NOT NULL,
    requiere_oxigeno INTEGER DEFAULT 0,
    requiere_respirador INTEGER DEFAULT 0,
    observaciones TEXT,
    estado TEXT DEFAULT 'Pendiente',
    ambulancia_asignada TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Usuario administrador por defecto (pass: admin123)
  const hash = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'Director Médico')`, [hash]);
  
  // Flota inicial sin tripulación fija obligatoria
  db.run(`INSERT OR IGNORE INTO fleet (unit_code, driver, driver_phone, paramedic, paramedic_phone, status, location, has_bed, bed_type, stream_url) VALUES 
    ('AMB-01', '', '', '', '', 'Disponible', 'Base Central', 1, 'Cama de Terapia Intensiva (UTI) articulada', 'https://www.w3schools.com/html/mov_bbb.mp4'),
    ('AMB-02', '', '', '', '', 'Disponible', 'Sanatorio Allende', 1, 'Camilla de Traslado Estándar', 'https://www.w3schools.com/html/mov_bbb.mp4'),
    ('AMB-03', '', '', '', '', 'Disponible', 'Hospital de Clínicas', 1, 'Camilla de Alta Complejidad', 'https://www.w3schools.com/html/mov_bbb.mp4')`);
});

// Middleware JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'Acceso reservado a directores autorizados.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Sesión expirada.' });
    req.user = decoded;
    next();
  });
}

// ----------------------------------------------------
// 1. RUTA PÚBLICA (Sin clave) - Envío de Solicitudes
// ----------------------------------------------------
app.post('/api/public/solicitud', (req, res) => {
  const {
    institucion_solicitante, medico_solicitante, telefono_contacto,
    paciente_nombre, dni, edad, diagnostico, origen, destino,
    tipo_complejidad, requiere_oxigeno, requiere_respirador, observaciones
  } = req.body;

  if (!institucion_solicitante || !paciente_nombre || !origen || !destino) {
    return res.status(400).json({ error: 'Por favor complete todos los campos requeridos.' });
  }

  db.run(
    `INSERT INTO solicitudes (
      institucion_solicitante, medico_solicitante, telefono_contacto,
      paciente_nombre, dni, edad, diagnostico, origen, destino,
      tipo_complejidad, requiere_oxigeno, requiere_respirador, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      institucion_solicitante, medico_solicitante, telefono_contacto,
      paciente_nombre, dni, edad, diagnostico, origen, destino,
      tipo_complejidad, requiere_oxigeno ? 1 : 0, requiere_respirador ? 1 : 0, observaciones
    ],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error al procesar la solicitud.' });
      res.json({ message: 'Solicitud registrada con éxito', id: this.lastID });
    }
  );
});

// ----------------------------------------------------
// 2. RUTAS PRIVADAS (Para el Director / Encargado)
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Credenciales inválidas.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas.' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token, username: user.username, role: user.role });
  });
});

app.get('/api/admin/fleet', verifyToken, (req, res) => {
  db.all(`SELECT * FROM fleet`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar la flota.' });
    res.json(rows);
  });
});

// Actualizar tripulación de la unidad
app.patch('/api/admin/fleet/:unitCode/crew', verifyToken, (req, res) => {
  const { unitCode } = req.params;
  const { driver, driver_phone, paramedic, paramedic_phone } = req.body;
  db.run(
    `UPDATE fleet SET driver = ?, driver_phone = ?, paramedic = ?, paramedic_phone = ? WHERE unit_code = ?`,
    [driver, driver_phone, paramedic, paramedic_phone, unitCode],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error al actualizar la tripulación.' });
      res.json({ message: 'Tripulación actualizada correctamente.' });
    }
  );
});

app.get('/api/admin/solicitudes', verifyToken, (req, res) => {
  db.all(`SELECT * FROM solicitudes ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar solicitudes.' });
    res.json(rows);
  });
});

app.patch('/api/admin/solicitudes/:id/asignar', verifyToken, (req, res) => {
  const { id } = req.params;
  const { ambulancia } = req.body;
  db.run(
    `UPDATE solicitudes SET estado = 'Asignada', ambulancia_asignada = ? WHERE id = ?`,
    [ambulancia, id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error al asignar ambulancia.' });
      db.run(`UPDATE fleet SET status = 'En Servicio', has_bed = 0 WHERE unit_code = ?`, [ambulancia]);
      res.json({ message: 'Unidad asignada y despacho iniciado.' });
    }
  );
});

app.get('/api/reports/pdf/:unitCode', verifyToken, (req, res) => {
  const { unitCode } = req.params;
  db.get(`SELECT * FROM fleet WHERE unit_code = ?`, [unitCode], (err, unit) => {
    if (err || !unit) return res.status(404).send('Unidad no encontrada');

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=reporte-${unitCode}.pdf`);

    doc.pipe(res);
    doc.rect(50, 40, 512, 60).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(18).text('CENTRAL MÉDICA DE EMERGENCIAS - CARE', 65, 55);
    doc.fontSize(10).text('Reporte Oficial de Telemetría y Cama Médica', 65, 78);
    doc.moveDown(3);

    doc.fillColor('#0f172a').fontSize(14).text(`Código de Unidad: ${unit.unit_code}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#334155')
      .text(`• Chofer a Cargo: ${unit.driver || 'No asignado'} (Tel: ${unit.driver_phone || 'N/D'})`)
      .text(`• Médico / Paramédico: ${unit.paramedic || 'No asignado'} (Tel: ${unit.paramedic_phone || 'N/D'})`)
      .text(`• Estado Actual: ${unit.status}`)
      .text(`• Ubicación GPS: ${unit.location}`)
      .text(`• Estado de Cama / Camilla: ${unit.has_bed ? 'DISPONIBLE' : 'OCUPADA'}`)
      .text(`• Tipo de Cama: ${unit.bed_type}`)
      .text(`• Fecha de Emisión: ${new Date().toLocaleString('es-AR')}`);

    doc.moveDown(4);
    doc.fontSize(10).fillColor('#000000').text('________________________________________', { align: 'right' });
    doc.text('Firma del Médico Regulador de Guardia', { align: 'right' });
    doc.end();
  });
});

// Único punto de inicio del servidor al final del archivo
app.listen(PORT, () => {
  console.log(`Servidor de Ambulancias corriendo en el puerto ${PORT}`);
});
