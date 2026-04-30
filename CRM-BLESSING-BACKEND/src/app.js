const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./interfaces/routes/auth.routes');
const userRoutes = require('./interfaces/routes/users.routes');
const bdGeneralRoutes = require('./interfaces/routes/bdGeneral.routes');
const gestionesRoutes = require('./interfaces/routes/gestiones.routes');
const actividadesRoutes = require('./interfaces/routes/actividades.routes');
const solicitudesRoutes = require('./interfaces/routes/solicitudes.routes');
const dashboardRoutes = require('./interfaces/routes/dashboard.routes');
const sistemasRoutes = require('./interfaces/routes/sistemas.routes');
const importarRoutes = require('./interfaces/routes/importar.routes');
const historialRoutes = require('./interfaces/routes/historial.routes');
const notificacionesRoutes = require('./interfaces/routes/notificaciones.routes');
const adminBDRoutes = require('./interfaces/routes/adminBD.routes');
const contactosRoutes = require('./interfaces/routes/contactos.routes');
const iniciarCron = require('./infrastructure/database/cron');

require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// --- CONEXIÓN Y CRON ---
connectDB();
iniciarCron();

// --- RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bd-general', bdGeneralRoutes);
app.use('/api/gestiones', gestionesRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sistemas', sistemasRoutes);
app.use('/api/importar', importarRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/admin-bd', adminBDRoutes);
app.use('/api/contactos', contactosRoutes);
app.get('/', (req, res) => {
    res.json({ message: '✅ CRM Blessing API corriendo' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;