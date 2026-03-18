const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const userRepository = require('../../infrastructure/repositories/user.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');

// GET - Listar todos los usuarios (sistemas y supervisor)
router.get('/', verifyToken, verifyRole('sistemas', 'supervisor'), async (req, res) => {
    try {
        const users = await userRepository.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al listar usuarios', error: error.message });
    }
});

// POST - Crear usuario (solo sistemas)
router.post('/', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { nombre_user, dni_user, correo_user, contraseña_user, rol_user } = req.body;

        // Encriptar contraseña
        const hash = await bcrypt.hash(contraseña_user, 10);

        const newUser = await userRepository.create({
            nombre_user,
            dni_user,
            correo_user,
            contraseña_user: hash,
            rol_user,
        });

        res.status(201).json({
            message: 'Usuario creado correctamente',
            user: {
                id: newUser._id,
                nombre_user: newUser.nombre_user,
                rol_user: newUser.rol_user,
                estado_user: newUser.estado_user,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear usuario', error: error.message });
    }
});

// PATCH - Cambiar estado usuario (solo sistemas)
router.patch('/:id/estado', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { estado_user } = req.body;
        const updated = await userRepository.changeEstado(req.params.id, estado_user);

        if (!updated) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Estado actualizado correctamente',
            user: updated,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
    }
});

// GET - Obtener perfil propio
router.get('/perfil', verifyToken, async (req, res) => {
    try {
        const user = await userRepository.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
    }
});

// PUT - Editar usuario (solo sistemas)
router.put('/:id', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { nombre_user, dni_user, correo_user, rol_user, contraseña_user } = req.body;

        const data = { nombre_user, dni_user, correo_user, rol_user };

        // Solo actualiza contraseña si se envió
        if (contraseña_user && contraseña_user.trim() !== '') {
            const bcrypt = require('bcryptjs');
            data.contraseña_user = await bcrypt.hash(contraseña_user, 10);
        }

        const updated = await userRepository.update(req.params.id, data);

        if (!updated) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Usuario actualizado correctamente',
            user: updated,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
});

// DELETE - Eliminar usuario (solo sistemas)
router.delete('/:id', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const deleted = await userRepository.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
});

module.exports = router;