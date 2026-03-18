const Actividad = require('../../domain/actividades/actividades.model.js');

const actividadesRepository = {

    create: async (data) => {
        const actividad = new Actividad(data);
        return await actividad.save();
    },

    findByAsesor: async (asesor_id) => {
        return await Actividad.find({ asesor: asesor_id }).sort({ fecha: 1, hora: 1 });
    },

    findByAsesorAndWeek: async (asesor_id, fechaInicio, fechaFin) => {
        return await Actividad.find({
            asesor: asesor_id,
            fecha: { $gte: fechaInicio, $lte: fechaFin },
        }).sort({ fecha: 1, hora: 1 });
    },

    findByAsesorAndDay: async (asesor_id, fecha) => {
        const inicio = new Date(fecha);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(fecha);
        fin.setHours(23, 59, 59, 999);
        return await Actividad.find({
            asesor: asesor_id,
            fecha: { $gte: inicio, $lte: fin },
        }).sort({ hora: 1 });
    },

    findPendientes: async (asesor_id) => {
        return await Actividad.find({
            asesor: asesor_id,
            estado: 'pendiente',
        }).sort({ fecha: 1, hora: 1 });
    },

    findById: async (id) => {
        return await Actividad.findById(id);
    },

    update: async (id, data) => {
        return await Actividad.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    },

    delete: async (id) => {
        return await Actividad.findByIdAndDelete(id);
    },
};

module.exports = actividadesRepository;