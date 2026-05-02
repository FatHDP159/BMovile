const mongoose = require('mongoose');

const contactoSchema = new mongoose.Schema({
    nombre:   { type: String, default: null },
    dni:      { type: String, default: null },
    telefono: { type: String, default: null },
}, { _id: false });

const interaccionSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    tipo: {
        type: String,
        enum: ['llamada', 'sin_contacto', 'con_deuda', 'no_contesta',
               'cliente_claro', 'empresa_con_sustento_valido', 'cliente_no_interesado'],
        required: true,
    },
    comentario:   { type: String, default: null },
    contacto:     { type: contactoSchema, default: {} },
    agregado_por: {
        id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        nombre: { type: String },
        rol:    { type: String },
    },
}, { _id: true });

const oportunidadSchema = new mongoose.Schema({
    titulo:      { type: String, default: null },
    producto:    { type: String, default: null },
    cantidad:    { type: Number, default: 0 },
    cargo_fijo:  { type: Number, default: 0 },
    estado: {
        type: String,
        enum: ['Identificada', 'Propuesta Entregada', 'Negociación',
               'Negociada Aprobada', 'Negociada Rechazada'],
        default: 'Identificada',
    },
    sustento:              { type: Boolean, default: false },
    comentario:            { type: String, default: null },
    fecha_creacion:        { type: Date, default: Date.now },
    fecha_cierre_esperada: { type: Date, default: null },
    fecha_ganada:          { type: Date, default: null },
    operadores: {
        entel:    { type: Number, default: 0 },
        claro:    { type: Number, default: 0 },
        movistar: { type: Number, default: 0 },
        otros:    { type: Number, default: 0 },
        total:    { type: Number, default: 0 },
    },
}, { _id: true });

const fichaGestionSchema = new mongoose.Schema({
    ruc:          { type: String, required: true, trim: true },
    razon_social: { type: String, required: true, trim: true },
    segmento:     { type: String, default: null },
    total_lineas: { type: Number, default: 0 },

    asesor: {
        id_asesor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },

    activa: { type: Boolean, default: true }, // false = archivada

    estado_general: {
        type: String,
        enum: ['activo', 'cerrado_ganado', 'cerrado_perdido', 'descartado'],
        default: 'activo',
    },

    fechas: {
        fecha_inicio:          { type: Date, default: Date.now },
        fecha_ultimo_contacto: { type: Date, default: null },
        fecha_cierre:          { type: Date, default: null },
    },

    interacciones: [interaccionSchema],
    oportunidades: [oportunidadSchema],

}, { timestamps: true });

// Índices
fichaGestionSchema.index({ ruc: 1, 'asesor.id_asesor': 1, activa: 1 });
fichaGestionSchema.index({ 'asesor.id_asesor': 1, activa: 1 });
fichaGestionSchema.index({ ruc: 1, activa: 1 });

module.exports = mongoose.model('FichaGestion', fichaGestionSchema);