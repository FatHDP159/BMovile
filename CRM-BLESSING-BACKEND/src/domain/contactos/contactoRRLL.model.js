const mongoose = require('mongoose');

const contactoRRLLSchema = new mongoose.Schema({
    ruc:      { type: String, required: true, trim: true },
    nombre:   { type: String, required: true, trim: true },
    cargo:    { type: String, default: null },
    tipo_doc: { type: String, default: null },
    nr_doc:   { type: String, default: null },
}, { timestamps: true });

contactoRRLLSchema.index({ ruc: 1 });
contactoRRLLSchema.index({ ruc: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('ContactoRRLL', contactoRRLLSchema, 'contactos_rrll');