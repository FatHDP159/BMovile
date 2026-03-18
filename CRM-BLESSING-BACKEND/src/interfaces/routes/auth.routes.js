const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../../infrastructure/repositories/user.repository');
require('dotenv').config();

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { correo_user, contraseña_user } = req.body;

        // 1. Verificar si el usuario existe
        const user = await userRepository.findByCorreo(correo_user);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // 2. Verificar estado del usuario
        if (user.estado_user !== 'activo') {
            return res.status(403).json({ message: 'Usuario inactivo o suspendido' });
        }

        // 3. Verificar contraseña
        const validPassword = await bcrypt.compare(contraseña_user, user.contraseña_user);
        if (!validPassword) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // 4. Generar tokens
        const payload = {
            id: user._id,
            rol_user: user.rol_user,
            nombre_user: user.nombre_user,
        };

        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRES,
        });

        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRES,
        });

        res.json({
            message: 'Login exitoso',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                nombre_user: user.nombre_user,
                rol_user: user.rol_user,
                estado_user: user.estado_user,
            },
        });

    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token no proporcionado' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const accessToken = jwt.sign(
            { id: decoded.id, rol_user: decoded.rol_user, nombre_user: decoded.nombre_user },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES }
        );

        res.json({ accessToken });

    } catch (error) {
        res.status(403).json({ message: 'Refresh token inválido o expirado' });
    }
});

module.exports = router;