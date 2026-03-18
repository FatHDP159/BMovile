const mongoose = require('mongoose');

const db_generalSchema = new mongoose.Schema(
    {
        ruc: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        razon_social: {
            type: String,
            required: true,
            trim: true,
        },
        distrito: String,
        rubro_actividad_principal: String,
        segmento: String,
        lineas: {
            claro: { type: Number, default: 0 },
            movistar: { type: Number, default: 0 },
            entel: { type: Number, default: 0 },
            otros: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        contactos: [
            {
                nombre: { type: String, default: '' },
                dni: { type: String, default: '' },
                cargo: { type: String, default: '' },
                telefonos: [{ type: String }],
                emails: [{ type: String }],
            }
        ],
        estado_base: {
            type: String,
            enum: ['disponible', 'asignada', 'trabajada', 'descartada'],
            default: 'disponible',
        },
        asignacion: {
            id_asesor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            fecha_asignada: { type: Date, default: null },
            fecha_desasignacion: { type: Date, default: null },
        },
        salesforce: {
            consultor: { type: String, default: null },
            fecha_asignada: { type: Date, default: null },
            fecha_desasignacion: { type: Date, default: null },
            sustento_cargado: { type: Boolean, default: false },
            fecha_carga_sustento: { type: Date, default: null },
        },
    },
    {
        timestamps: true,
    }
);

db_generalSchema.index({ razon_social: 'text' });
db_generalSchema.index({ estado_base: 1 });
db_generalSchema.index({ segmento: 1 });
db_generalSchema.index({ 'asignacion.id_asesor': 1 });
db_generalSchema.index({ 'lineas.claro': 1 });
db_generalSchema.index({ 'lineas.movistar': 1 });
db_generalSchema.index({ 'lineas.entel': 1 });

module.exports = mongoose.model('BdGeneral', db_generalSchema);