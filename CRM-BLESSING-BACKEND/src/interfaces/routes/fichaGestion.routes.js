const express = require('express');
const router = express.Router();
const fichaGestionRepository = require('../../infrastructure/repositories/fichaGestion.repository.js');
const Gestion = require('../../domain/gestiones/gestiones.model.js');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');

// ── POST /tipificar — Asesor o supervisor tipifica (crea o agrega interacción) ──
router.post('/tipificar', verifyToken, verifyRole('asesor', 'supervisor'), async (req, res) => {
    try {
        const { ruc, tipo, comentario, contacto } = req.body;
        if (!ruc || !tipo) return res.status(400).json({ message: 'ruc y tipo son obligatorios' });

        const ficha = await fichaGestionRepository.tipificar({
            ruc,
            id_asesor: req.user.id,
            nombre_asesor: req.user.nombre_user,
            rol_asesor: req.user.rol_user,
            tipo,
            comentario,
            contacto,
        });

        res.status(201).json({ message: 'Interacción registrada correctamente', ficha });
    } catch (error) {
        res.status(500).json({ message: 'Error al tipificar', error: error.message });
    }
});

// ── POST /:fichaId/oportunidades — Agregar oportunidad a ficha ──────────────
router.post('/:fichaId/oportunidades', verifyToken, verifyRole('asesor', 'supervisor'), async (req, res) => {
    try {
        const ficha = await fichaGestionRepository.agregarOportunidad(req.params.fichaId, req.body);
        res.status(201).json({ message: 'Oportunidad agregada correctamente', ficha });
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar oportunidad', error: error.message });
    }
});

// ── PUT /:fichaId/oportunidades/:opoId — Actualizar oportunidad ─────────────
router.put('/:fichaId/oportunidades/:opoId', verifyToken, verifyRole('asesor', 'supervisor'), async (req, res) => {
    try {
        const ficha = await fichaGestionRepository.actualizarOportunidad(
            req.params.fichaId,
            req.params.opoId,
            req.body
        );
        res.json({ message: 'Oportunidad actualizada correctamente', ficha });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar oportunidad', error: error.message });
    }
});

// ── GET /mis-fichas — Fichas activas del asesor ─────────────────────────────
router.get('/mis-fichas', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { busqueda, estado_general, page, limit } = req.query;
        const resultado = await fichaGestionRepository.findByAsesor(req.user.id, {
            busqueda, estado_general,
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar fichas', error: error.message });
    }
});

// ── GET /funnel — Fichas con oportunidades (asesor) ─────────────────────────
router.get('/funnel', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { busqueda, estados, segmento, lineas_min, lineas_max, page, limit } = req.query;
        const resultado = await fichaGestionRepository.findFunnel({
            id_asesor: req.user.id,
            busqueda, segmento, lineas_min, lineas_max,
            estados: estados ? (Array.isArray(estados) ? estados : estados.split(',')) : [],
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar funnel', error: error.message });
    }
});

// ── GET /funnel-supervisor — Funnel todos los asesores ──────────────────────
router.get('/funnel-supervisor', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const { busqueda, estados, segmento, lineas_min, lineas_max, asesor, page, limit } = req.query;
        const resultado = await fichaGestionRepository.findFunnel({
            id_asesor: asesor || null,
            busqueda, segmento, lineas_min, lineas_max,
            estados: estados ? (Array.isArray(estados) ? estados : estados.split(',')) : [],
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar funnel', error: error.message });
    }
});

// ── GET / — Todas las fichas (supervisor/sistemas) ──────────────────────────
router.get('/', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const { busqueda, estado_general, asesor, activa, page, limit } = req.query;
        const resultado = await fichaGestionRepository.findAll({
            busqueda, estado_general,
            id_asesor: asesor || null,
            activa: activa !== undefined ? activa === 'true' : undefined,
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar fichas', error: error.message });
    }
});

// ── GET /historial/:ruc — Historial completo de un RUC ──────────────────────
router.get('/historial/:ruc', verifyToken, verifyRole('asesor', 'supervisor', 'sistemas'), async (req, res) => {
    try {
        const fichas = await fichaGestionRepository.findHistorialByRuc(req.params.ruc);
        res.json(fichas);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar historial', error: error.message });
    }
});

// ── GET /:id — Ficha por ID ─────────────────────────────────────────────────
router.get('/:id', verifyToken, verifyRole('asesor', 'supervisor', 'sistemas'), async (req, res) => {
    try {
        const ficha = await fichaGestionRepository.findById(req.params.id);
        if (!ficha) return res.status(404).json({ message: 'Ficha no encontrada' });
        res.json(ficha);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener ficha', error: error.message });
    }
});

// ── PATCH /:id/archivar — Archivar ficha ────────────────────────────────────
router.patch('/:id/archivar', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const ficha = await fichaGestionRepository.archivar(req.params.id);
        res.json({ message: 'Ficha archivada correctamente', ficha });
    } catch (error) {
        res.status(500).json({ message: 'Error al archivar ficha', error: error.message });
    }
});

// PUT /:fichaId/interacciones/:interaccionId — Editar tipo y comentario
router.put('/:fichaId/interacciones/:interaccionId', verifyToken, verifyRole('asesor', 'supervisor'), async (req, res) => {
    try {
        const { tipo, comentario } = req.body;
        const ficha = await FichaGestion.findOneAndUpdate(
            { _id: req.params.fichaId, 'interacciones._id': req.params.interaccionId },
            {
                $set: {
                    'interacciones.$.tipo': tipo,
                    'interacciones.$.comentario': comentario || null,
                }
            },
            { new: true }
        );
        if (!ficha) return res.status(404).json({ message: 'Ficha o interacción no encontrada' });
        res.json({ message: 'Interacción actualizada', ficha });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar interacción', error: error.message });
    }
});

module.exports = router;