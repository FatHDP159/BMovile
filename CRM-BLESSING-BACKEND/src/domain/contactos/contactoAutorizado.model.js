const mongoose = require('mongoose');

const contactoAutorizadoSchema = new mongoose.Schema({
    ruc:    { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    cargo:  { type: String, default: null },
    dni:    { type: String, default: null },
}, { timestamps: true });

contactoAutorizadoSchema.index({ ruc: 1 });
contactoAutorizadoSchema.index({ ruc: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('ContactoAutorizado', contactoAutorizadoSchema, 'contactos_autorizados');