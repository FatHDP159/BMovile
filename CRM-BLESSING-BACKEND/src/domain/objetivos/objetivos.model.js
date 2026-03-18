const mongoose = require('mongoose');

const objetivoSchema = new mongoose.Schema(
    {
        tipo: { type: String, default: 'global' }, // 'global' para objetivo único
        objetivo_diario: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Objetivo', objetivoSchema);