const mongoose = require('mongoose');

const solicitudSchema = new mongoose.Schema(
    {
        asesor: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            nombre: { type: String, required: true },
        },
        empresa: {
            ruc: { type: String, required: true },
            razon_social: { type: String, required: true },
        },
        estado: {
            type: String,
            enum: ['pendiente', 'aprobada', 'rechazada'],
            default: 'pendiente',
        },
        revisado_por: { type: String, default: null },
        fecha_revision: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Solicitud', solicitudSchema);