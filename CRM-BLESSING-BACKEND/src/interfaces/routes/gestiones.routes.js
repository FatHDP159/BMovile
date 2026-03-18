const express = require('express');
const router = express.Router();
const gestionesRepository = require('../../infrastructure/repositories/gestiones.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');

// GET - Listar todas las gestiones (sistemas y supervisor) con filtros
router.get('/', verifyToken, verifyRole('sistemas', 'supervisor'), async (req, res) => {
    try {
        const { busqueda, tipo, fecha_desde, fecha_hasta, asesor, page, limit } = req.query;
        const resultado = await gestionesRepository.findAll({
            busqueda, tipo, fecha_desde, fecha_hasta, asesor_id: asesor,
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar gestiones', error: error.message });
    }
});

// GET - Funnel asesor
router.get('/funnel', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { busqueda, estados, segmento, lineas_min, lineas_max, fecha_desde, fecha_hasta, page, limit } = req.query;
        const resultado = await gestionesRepository.findFunnel({
            id_asesor: req.user.id,
            busqueda, segmento, lineas_min, lineas_max, fecha_desde, fecha_hasta,
            estados: estados ? (Array.isArray(estados) ? estados : estados.split(',')) : [],
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar funnel', error: error.message });
    }
});

// GET - Funnel supervisor (todos los asesores)
router.get('/funnel-supervisor', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const { busqueda, estados, segmento, lineas_min, lineas_max, fecha_desde, fecha_hasta, asesor, page, limit } = req.query;
        const resultado = await gestionesRepository.findFunnel({
            id_asesor: asesor || null,
            busqueda, segmento, lineas_min, lineas_max, fecha_desde, fecha_hasta,
            estados: estados ? (Array.isArray(estados) ? estados : estados.split(',')) : [],
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar funnel', error: error.message });
    }
});

// GET - Mis gestiones del asesor con filtros y paginación
router.get('/mis-gestiones', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { busqueda, tipo, fecha_desde, fecha_hasta, page, limit } = req.query;
        const resultado = await gestionesRepository.findByAsesor(req.user.id, {
            busqueda, tipo, fecha_desde, fecha_hasta,
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar gestiones', error: error.message });
    }
});

// POST - Crear gestión / tipificar (solo asesor)
router.post('/', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const gestion = await gestionesRepository.create({
            ...req.body,
            asesor: { id_asesor: req.user.id },
        });
        res.status(201).json({ message: 'Gestión creada correctamente', gestion });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear gestión', error: error.message });
    }
});

// PUT - Editar gestión (solo asesor)
router.put('/:id', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const gestion = await gestionesRepository.update(req.params.id, req.body);
        if (!gestion) return res.status(404).json({ message: 'Gestión no encontrada' });
        res.json({ message: 'Gestión actualizada correctamente', gestion });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar gestión', error: error.message });
    }
});

// GET - Ver gestión por ID
router.get('/:id', verifyToken, verifyRole('sistemas', 'supervisor', 'asesor'), async (req, res) => {
    try {
        const gestion = await gestionesRepository.findById(req.params.id);
        if (!gestion) return res.status(404).json({ message: 'Gestión no encontrada' });
        res.json(gestion);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener gestión', error: error.message });
    }
});

module.exports = router;