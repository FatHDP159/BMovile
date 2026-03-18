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
const iniciarCron = require('./infrastructure/database/cron');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Conexión a MongoDB
connectDB();

// Cron Jobs
iniciarCron();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bd-general', bdGeneralRoutes);
app.use('/api/gestiones', gestionesRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sistemas', sistemasRoutes);
app.use('/api/importar', importarRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: '✅ CRM Blessing API corriendo' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;