const express = require('express');
const cors = require('cors'); // Solo una vez aquí arriba
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
const notificacionesRoutes = require('./interfaces/routes/notificaciones.routes');
const historialRoutes = require('./interfaces/routes/historial.routes');
const iniciarCron = require('./infrastructure/database/cron');

require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---

// Modificamos el CORS para que acepte cualquier origen por ahora (mientras configuras Vercel)
app.use(cors({
    origin: '*', // Permitir todos los orígenes temporalmente
    credentials: true,
}));

app.use(express.json());

// --- CONEXIÓN Y LOGICA ---
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


// Ruta de prueba (esto confirmará que el 502 desapareció)
app.get('/', (req, res) => {
    res.json({ message: '✅ CRM Blessing API corriendo' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;