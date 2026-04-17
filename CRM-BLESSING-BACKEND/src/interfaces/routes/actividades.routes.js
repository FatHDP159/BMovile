const express = require('express');
const router = express.Router();
const actividadesRepository = require('../../infrastructure/repositories/actividades.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');

// Helper zona horaria
const fechaInicioDia = (fecha) => { const f = new Date(fecha); f.setUTCHours(0,0,0,0); return f; };
const fechaFinDia    = (fecha) => { const f = new Date(fecha); f.setUTCHours(23,59,59,999); return f; };

// GET - Todas las actividades del asesor
router.get('/', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const actividades = await actividadesRepository.findByAsesor(req.user.id);
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar actividades', error: error.message });
    }
});

// GET - Actividades por semana
router.get('/semana', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const actividades = await actividadesRepository.findByAsesorAndWeek(
            req.user.id,
            fechaInicioDia(fecha_inicio),
            fechaFinDia(fecha_fin)
        );
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar actividades', error: error.message });
    }
});

// GET - Actividades del día
router.get('/hoy', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const actividades = await actividadesRepository.findByAsesorAndDay(req.user.id, new Date());
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar actividades', error: error.message });
    }
});

// GET - Actividades pendientes
router.get('/pendientes', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const actividades = await actividadesRepository.findPendientes(req.user.id);
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar pendientes', error: error.message });
    }
});

// GET - Actividades por semana (supervisor)
router.get('/supervisor/semana', verifyToken, verifyRole('supervisor'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, asesor_id } = req.query;
        const Actividad = require('../../domain/actividades/actividades.model.js');
        const filtro = {
            fecha: { $gte: fechaInicioDia(fecha_inicio), $lte: fechaFinDia(fecha_fin) },
        };
        if (asesor_id) {
            filtro.asesor = asesor_id;
        } else {
            filtro.$or = [
                { asesor: req.user.id },
                { asesor: { $ne: req.user.id }, tipo: { $in: ['llamada', 'reunion', 'enviar_informacion', 'seguimiento'] } }
            ];
        }
        const actividades = await Actividad.find(filtro)
            .populate('asesor', 'nombre_user')
            .sort({ fecha: 1, hora: 1 });
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar actividades', error: error.message });
    }
});

// GET - Actividades hoy supervisor
router.get('/supervisor/hoy', verifyToken, verifyRole('supervisor'), async (req, res) => {
    try {
        const Actividad = require('../../domain/actividades/actividades.model.js');
        const inicio = new Date(); inicio.setUTCHours(0,0,0,0);
        const fin = new Date(); fin.setUTCHours(23,59,59,999);
        const actividades = await Actividad.find({
            fecha: { $gte: inicio, $lte: fin },
            $or: [
                { asesor: req.user.id },
                { asesor: { $ne: req.user.id }, tipo: { $in: ['llamada', 'reunion', 'enviar_informacion', 'seguimiento'] } }
            ]
        }).populate('asesor', 'nombre_user').sort({ hora: 1 });
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// GET - Pendientes supervisor
router.get('/supervisor/pendientes', verifyToken, verifyRole('supervisor'), async (req, res) => {
    try {
        const Actividad = require('../../domain/actividades/actividades.model.js');
        const actividades = await Actividad.find({
            estado: 'pendiente',
            $or: [
                { asesor: req.user.id },
                { asesor: { $ne: req.user.id }, tipo: { $in: ['llamada', 'reunion', 'enviar_informacion', 'seguimiento'] } }
            ]
        }).populate('asesor', 'nombre_user').sort({ fecha: 1, hora: 1 });
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// POST - Crear actividad (supervisor)
router.post('/supervisor', verifyToken, verifyRole('supervisor'), async (req, res) => {
    try {
        const actividad = await actividadesRepository.create({
            ...req.body,
            asesor: req.user.id,
        });
        res.status(201).json({ message: 'Actividad creada correctamente', actividad });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear actividad', error: error.message });
    }
});

// PUT - Editar actividad propia (supervisor)
router.put('/supervisor/:id', verifyToken, verifyRole('supervisor'), async (req, res) => {
    try {
        const actividad = await actividadesRepository.update(req.params.id, req.body);
        if (!actividad) return res.status(404).json({ message: 'Actividad no encontrada' });
        res.json({ message: 'Actividad actualizada', actividad });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar actividad', error: error.message });
    }
});

// DELETE - Eliminar actividad propia (supervisor)
router.delete('/supervisor/:id', verifyToken, verifyRole('supervisor'), async (req, res) => {
    try {
        await actividadesRepository.delete(req.params.id);
        res.json({ message: 'Actividad eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar actividad', error: error.message });
    }
});

// POST - Crear actividad asesor
router.post('/', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const actividad = await actividadesRepository.create({
            ...req.body,
            asesor: req.user.id,
        });
        res.status(201).json({ message: 'Actividad creada correctamente', actividad });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear actividad', error: error.message });
    }
});

// PUT - Editar actividad
router.put('/:id', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const actividad = await actividadesRepository.update(req.params.id, req.body);
        if (!actividad) return res.status(404).json({ message: 'Actividad no encontrada' });
        res.json({ message: 'Actividad actualizada', actividad });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar actividad', error: error.message });
    }
});

// DELETE - Eliminar actividad
router.delete('/:id', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        await actividadesRepository.delete(req.params.id);
        res.json({ message: 'Actividad eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar actividad', error: error.message });
    }
});

module.exports = router;