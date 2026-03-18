const express = require('express');
const router = express.Router();
const solicitudesRepository = require('../../infrastructure/repositories/solicitudes.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');

// GET - Buscar empresa por RUC (asesor)
router.get('/buscar/:ruc', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const resultado = await solicitudesRepository.buscarPorRuc(req.params.ruc, req.user.id);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar empresa', error: error.message });
    }
});

// POST - Crear solicitud (asesor)
router.post('/', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { ruc, razon_social } = req.body;
        const solicitud = await solicitudesRepository.crear(
            req.user.id, req.user.nombre_user, ruc, razon_social
        );
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

// PATCH - Aprobar solicitud (supervisor/sistemas)
router.patch('/:id/aprobar', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const solicitud = await solicitudesRepository.aprobar(req.params.id, req.user.nombre_user);
        res.json({ message: 'Solicitud aprobada', solicitud });
    } catch (error) {
        res.status(500).json({ message: 'Error al aprobar solicitud', error: error.message });
    }
});

// PATCH - Rechazar solicitud (supervisor/sistemas)
router.patch('/:id/rechazar', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const solicitud = await solicitudesRepository.rechazar(req.params.id, req.user.nombre_user);
        res.json({ message: 'Solicitud rechazada', solicitud });
    } catch (error) {
        res.status(500).json({ message: 'Error al rechazar solicitud', error: error.message });
    }
});

module.exports = router;