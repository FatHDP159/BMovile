const mongoose = require('mongoose');

const contactoAutorizadoSchema = new mongoose.Schema({
    nombre: { type: String, default: null },
    dni:    { type: String, default: null },
    tel:    { type: String, default: null },
    correo: { type: String, default: null },
}, { _id: true });

const contactoRRLLSchema = new mongoose.Schema({
    tipo_doc: { type: String, default: null },
    nr_doc:   { type: String, default: null },
    nombre:   { type: String, default: null },
    cargo:    { type: String, default: null },
    tel:      { type: String, default: null },
    correo:   { type: String, default: null },
}, { _id: true });

const empresaV2Schema = new mongoose.Schema({
    ruc: { type: String, required: true, unique: true, trim: true },

    sunat: {
        razon_social: { type: String, default: null },
        estado:       { type: String, default: null },
        condicion:    { type: String, default: null },
        direccion:    { type: String, default: null },
        actividad:    { type: String, default: null },
    },

    osiptel: {
        claro:    { type: Number, default: 0 },
        movistar: { type: Number, default: 0 },
        entel:    { type: Number, default: 0 },
        otros:    { type: Number, default: 0 },
        total:    { type: Number, default: 0 },
    },

    salesforce: {
        segmento:            { type: String, default: null },
        facturacion:         { type: Number, default: null },
        grupo_economico:     { type: String, default: null },
        estatus:             { type: String, default: null },
        consultor:           { type: String, default: null },
        fecha_asignacion:    { type: Date,   default: null },
        tipo_cliente:        { type: String, default: null },
        sustento:            { type: Boolean, default: false },
        fecha_sustento:      { type: Date,   default: null },
        detalle_servicios:   { type: String, default: null },
        oportunidad_ganada:  { type: Boolean, default: false },
        fecha_oportunidad:   { type: Date,   default: null },
    },

    contactos_autorizados: [contactoAutorizadoSchema],
    contactos_rrll:        [contactoRRLLSchema],

    asignacion: {
        id_asesor:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        fecha_asignada:     { type: Date, default: null },
        fecha_desasignacion:{ type: Date, default: null },
    },

    estado_base: {
        type: String,
        enum: ['disponible', 'asignada', 'trabajada', 'descartada'],
        default: 'disponible',
    },

}, { timestamps: true });

// Índices para búsquedas rápidas
empresaV2Schema.index({ ruc: 1 });
empresaV2Schema.index({ estado_base: 1 });
empresaV2Schema.index({ 'salesforce.segmento': 1 });
empresaV2Schema.index({ 'asignacion.id_asesor': 1 });
empresaV2Schema.index({ 'sunat.razon_social': 'text' });

module.exports = mongoose.model('EmpresaV2', empresaV2Schema, 'empresas_v2');