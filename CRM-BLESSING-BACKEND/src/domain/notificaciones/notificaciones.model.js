const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        tipo: {
            type: String,
            enum: [
                'actividad_proxima', 'actividad_vencida',
                'solicitud_aprobada', 'solicitud_rechazada',
                'solicitud_nueva', 'empresa_desasignada',
                'oportunidad_sin_movimiento',
            ],
            required: true,
        },
        titulo: { type: String, required: true },
        mensaje: { type: String, required: true },
        leida: { type: Boolean, default: false },
        link: { type: String, default: null },
        referencia_id: { type: String, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Notificacion', notificacionSchema);