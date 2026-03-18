const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema(
    {
        asesor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        cliente: {
            id_gestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Gestion', default: null },
            ruc: { type: String, default: null },
            razon_social: { type: String, default: null },
        },
        tipo: {
            type: String,
            enum: ['llamada', 'reunion', 'tarea', 'enviar_informacion', 'seguimiento'],
            required: true,
        },
        titulo: { type: String, required: true, trim: true },
        descripcion: { type: String, default: null },
        fecha: { type: Date, required: true },
        hora: { type: String, required: true },
        estado: {
            type: String,
            enum: ['pendiente', 'completado', 'cancelado'],
            default: 'pendiente',
        },
        prioridad: {
            type: String,
            enum: ['alta', 'media', 'baja'],
            default: 'media',
        },
        recordatorio: {
            type: String,
            enum: ['10min', '30min', '1hora', '1dia', null],
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Actividad', actividadSchema);