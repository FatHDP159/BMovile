const express = require('express');
const router = express.Router();
const solicitudesRepository = require('../../infrastructure/repositories/solicitudes.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const Notificacion = require('../../domain/notificaciones/notificaciones.model.js');
const User = require('../../domain/users/user.model.js');

// Helper
const crearNotif = async ({ usuario, tipo, titulo, mensaje, link = null, referencia_id = null }) => {
    try {
        const existe = await Notificacion.findOne({ usuario, tipo, referencia_id, leida: false });
        if (existe) return;
        await Notificacion.create({ usuario, tipo, titulo, mensaje, link, referencia_id });
    } catch (err) {
        console.error('Error creando notificación:', err.message);
    }
};

// GET - Buscar empresa por RUC (asesor)
router.get('/buscar/:ruc', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const resultado = await solicitudesRepository.buscarPorRuc(req.params.ruc, req.user.id);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar empresa', error: error.message });
    }
});

// POST - Crear solicitud (asesor) → notifica a supervisor y sistemas
router.post('/', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { ruc, razon_social } = req.body;
        const solicitud = await solicitudesRepository.crear(
            req.user.id, req.user.nombre_user, ruc, razon_social
        );

        // Notificar a supervisores y sistemas
        const destinatarios = await User.find({
            rol_user: { $in: ['supervisor', 'sistemas'] },
            estado_user: 'activo',
        });

        for (const dest of destinatarios) {
            await crearNotif({
                usuario: dest._id,
                tipo: 'solicitud_nueva',
                titulo: 'Nueva solicitud de empresa',
                mensaje: `${req.user.nombre_user} solicitó la empresa "${razon_social}" (${ruc})`,
                link: '/solicitudes',
                referencia_id: solicitud._id.toString(),
            });
        }

        res.status(201).json({ message: 'Solicitud enviada correctamente', solicitud });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET - Listar todas las solicitudes (supervisor/sistemas)
router.get('/', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const solicitudes = await solicitudesRepository.findAll();
        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar solicitudes', error: error.message });
    }
});

// GET - Solo pendientes (supervisor/sistemas)
router.get('/pendientes', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const solicitudes = await solicitudesRepository.findPendientes();
        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar pendientes', error: error.message });
    }
});

// PATCH - Aprobar solicitud → notifica al asesor
router.patch('/:id/aprobar', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const solicitud = await solicitudesRepository.aprobar(req.params.id, req.user.nombre_user);

        // Notificar al asesor
        await crearNotif({
            usuario: solicitud.asesor.id,
            tipo: 'solicitud_aprobada',
            titulo: '✅ Solicitud aprobada',
            mensaje: `Tu solicitud para "${solicitud.empresa.razon_social}" fue aprobada por ${req.user.nombre_user}`,
            link: '/mi-cartera',
            referencia_id: solicitud._id.toString(),
        });

        res.json({ message: 'Solicitud aprobada', solicitud });
    } catch (error) {
        res.status(500).json({ message: 'Error al aprobar solicitud', error: error.message });
    }
});

// PATCH - Rechazar solicitud → notifica al asesor
router.patch('/:id/rechazar', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const solicitud = await solicitudesRepository.rechazar(req.params.id, req.user.nombre_user);

        // Notificar al asesor
        await crearNotif({
            usuario: solicitud.asesor.id,
            tipo: 'solicitud_rechazada',
            titulo: '❌ Solicitud rechazada',
            mensaje: `Tu solicitud para "${solicitud.empresa.razon_social}" fue rechazada por ${req.user.nombre_user}`,
            link: '/buscar',
            referencia_id: solicitud._id.toString(),
        });

        res.json({ message: 'Solicitud rechazada', solicitud });
    } catch (error) {
        res.status(500).json({ message: 'Error al rechazar solicitud', error: error.message });
    }
});

module.exports = router;