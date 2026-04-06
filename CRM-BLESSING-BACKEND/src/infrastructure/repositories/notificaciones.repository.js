const Notificacion = require('../../domain/notificaciones/notificaciones.model.js');

const notificacionesRepository = {

    crear: async ({ usuario, tipo, titulo, mensaje, link = null, referencia_id = null }) => {
        const existe = await Notificacion.findOne({ usuario, tipo, referencia_id, leida: false });
        if (existe) return existe;
        return await Notificacion.create({ usuario, tipo, titulo, mensaje, link, referencia_id });
    },

    findByUsuario: async (usuario_id, soloNoLeidas = false) => {
        const filtro = { usuario: usuario_id };
        if (soloNoLeidas) filtro.leida = false;
        return await Notificacion.find(filtro).sort({ createdAt: -1 }).limit(50);
    },

    countNoLeidas: async (usuario_id) => {
        return await Notificacion.countDocuments({ usuario: usuario_id, leida: false });
    },

    marcarLeida: async (id) => {
        return await Notificacion.findByIdAndUpdate(id, { leida: true }, { returnDocument: 'after' });
    },

    marcarTodasLeidas: async (usuario_id) => {
        return await Notificacion.updateMany({ usuario: usuario_id, leida: false }, { leida: true });
    },

    eliminar: async (id) => {
        return await Notificacion.findByIdAndDelete(id);
    },
};

module.exports = notificacionesRepository;