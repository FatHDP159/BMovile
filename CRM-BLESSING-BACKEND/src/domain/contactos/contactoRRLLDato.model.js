const mongoose = require('mongoose');

const contactoRRLLDatoSchema = new mongoose.Schema({
    id_contacto: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactoRRLL', required: true },
    ruc:         { type: String, required: true, trim: true },
    tipo:        { type: String, enum: ['telefono', 'correo'], required: true },
    valor:       { type: String, required: true, trim: true },
}, { timestamps: true });

contactoRRLLDatoSchema.index({ id_contacto: 1 });
contactoRRLLDatoSchema.index({ id_contacto: 1, tipo: 1, valor: 1 }, { unique: true });

module.exports = mongoose.model('ContactoRRLLDato', contactoRRLLDatoSchema, 'contactos_rrll_datos');