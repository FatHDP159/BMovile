const mongoose = require('mongoose');

const permisosSchema = new mongoose.Schema(
    {
        rol: {
            type: String,
            enum: ['asesor', 'supervisor', 'sistemas'],
            required: true,
        },
        modulo: {
            type: String,
            required: true,
        },
        puede_ver: { type: Boolean, default: false },
        puede_crear: { type: Boolean, default: false },
        puede_editar: { type: Boolean, default: false },
        puede_eliminar: { type: Boolean, default: false },
        solo_propios: { type: Boolean, default: false },
    }
);

module.exports = mongoose.model('Permisos', permisosSchema);