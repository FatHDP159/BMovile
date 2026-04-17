const Actividad = require('../../domain/actividades/actividades.model.js');

// Helper — normaliza fecha a mediodia Peru (GMT-5) para evitar desfase
const normalizarFecha = (fecha) => {
    const f = new Date(fecha);
    f.setUTCHours(12, 0, 0, 0); // mediodía UTC = 7am Peru, nunca cae en día anterior
    return f;
};

const actividadesRepository = {

    create: async (data) => {
        const dataFixed = { ...data };
        if (dataFixed.fecha) dataFixed.fecha = normalizarFecha(dataFixed.fecha);
        const actividad = new Actividad(dataFixed);
        return await actividad.save();
    },

    findByAsesor: async (asesor_id) => {
        return await Actividad.find({ asesor: asesor_id }).sort({ fecha: 1, hora: 1 });
    },

    findByAsesorAndWeek: async (asesor_id, fechaInicio, fechaFin) => {
        const inicio = new Date(fechaInicio);
        inicio.setUTCHours(0, 0, 0, 0);
        const fin = new Date(fechaFin);
        fin.setUTCHours(23, 59, 59, 999);
        return await Actividad.find({
            asesor: asesor_id,
            fecha: { $gte: inicio, $lte: fin },
        }).sort({ fecha: 1, hora: 1 });
    },

    findByAsesorAndDay: async (asesor_id, fecha) => {
        const inicio = new Date(fecha);
        inicio.setUTCHours(0, 0, 0, 0);
        const fin = new Date(fecha);
        fin.setUTCHours(23, 59, 59, 999);
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
        const dataFixed = { ...data };
        if (dataFixed.fecha) dataFixed.fecha = normalizarFecha(dataFixed.fecha);
        return await Actividad.findByIdAndUpdate(id, dataFixed, { returnDocument: 'after' });
    },

    delete: async (id) => {
        return await Actividad.findByIdAndDelete(id);
    },
};

module.exports = actividadesRepository;