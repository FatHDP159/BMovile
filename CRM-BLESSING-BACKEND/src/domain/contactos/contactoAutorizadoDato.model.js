const mongoose = require('mongoose');

const contactoAutorizadoDatoSchema = new mongoose.Schema({
    id_contacto: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactoAutorizado', required: true },
    ruc:         { type: String, required: true, trim: true },
    tipo:        { type: String, enum: ['telefono', 'correo'], required: true },
    valor:       { type: String, required: true, trim: true },
}, { timestamps: true });

contactoAutorizadoDatoSchema.index({ id_contacto: 1 });
contactoAutorizadoDatoSchema.index({ id_contacto: 1, tipo: 1, valor: 1 }, { unique: true });

module.exports = mongoose.model('ContactoAutorizadoDato', contactoAutorizadoDatoSchema, 'contactos_autorizados_datos');