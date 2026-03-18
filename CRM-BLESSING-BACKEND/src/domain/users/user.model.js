const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
    nombre_user: {
        type: String,
        required: true,
        trim: true,
    },
    dni_user: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    correo_user: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    contraseña_user: {
        type: String,
        required: true,
    },
    rol_user: {
        type: String,
        enum: ['asesor', 'supervisor', 'sistemas'],
        required: true,
    },
    estado_user: {
        type: String,
        enum: ['activo', 'inactivo', 'suspendido'],
        default: 'activo',
    },
    },
    {
    timestamps: true, // agrega created_at y updated_at automáticamente
    }
);

module.exports = mongoose.model('User', userSchema);