const express = require('express');
const router = express.Router();
const repo = require('../../infrastructure/repositories/notificaciones.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');

// GET - Mis notificaciones
router.get('/', verifyToken, async (req, res) => {
    try {
        const notificaciones = await repo.findByUsuario(req.user.id);
        res.json(notificaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// GET - Contador no leídas
router.get('/count', verifyToken, async (req, res) => {
    try {
        const count = await repo.countNoLeidas(req.user.id);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// PATCH - Marcar una como leída
router.patch('/:id/leer', verifyToken, async (req, res) => {
    try {
        await repo.marcarLeida(req.params.id);
        res.json({ message: 'Marcada como leída' });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// PATCH - Marcar todas como leídas
router.patch('/leer-todas', verifyToken, async (req, res) => {
    try {
        await repo.marcarTodasLeidas(req.user.id);
        res.json({ message: 'Todas marcadas como leídas' });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// DELETE - Eliminar notificación
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await repo.eliminar(req.params.id);
        res.json({ message: 'Notificación eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

module.exports = router;