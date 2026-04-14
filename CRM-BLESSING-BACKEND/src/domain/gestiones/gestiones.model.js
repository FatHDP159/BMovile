const mongoose = require('mongoose');

const gestionSchema = new mongoose.Schema(
    {
        ruc: { type: String, required: true, trim: true },
        razon_social: { type: String, required: true, trim: true },
        segmento: { type: String, default: null },
        total_lineas: { type: Number, default: 0 },
        contacto: {
            nombre: { type: String, default: null },
            dni: { type: String, default: null },
            telefono: { type: String, default: null },
        },
        asesor: {
            id_asesor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        },
        fechas: {
            fecha_tipificacion: { type: Date, default: null },
        },
        tipo_tipificacion: {
            type: String,
            enum: ['interesado', 'cliente_claro', 'sin_contacto', 'con_deuda', 'no_contesta' , 'cliente_no_interesado', 'empresa_con_sustento_valido'],
            required: true,
        },
        oportunidad: {
            titulo: { type: String, default: null },
            producto: { type: String, default: null },
            cantidad: { type: Number, default: 0 },
            cargo_fijo: { type: Number, default: 0 },
            operadores: {
                entel: { type: Number, default: 0 },
                claro: { type: Number, default: 0 },
                movistar: { type: Number, default: 0 },
                otros: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
            estado: {
                type: String,
                enum: ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'],
                default: 'Identificada',
            },
            sustento: { type: Boolean, default: false },
            comentario: { type: String, default: null },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Gestion', gestionSchema);