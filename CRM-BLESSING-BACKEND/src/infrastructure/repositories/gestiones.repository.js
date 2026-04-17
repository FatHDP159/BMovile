const Gestion = require('../../domain/gestiones/gestiones.model.js');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const gestionesRepository = {

    create: async (data) => {
        const empresa = await BdGeneral.findOne({ ruc: data.ruc });
        const gestion = new Gestion({
            ...data,
            segmento: empresa?.segmento || null,
            total_lineas: empresa?.lineas?.total || 0,
            fechas: { fecha_tipificacion: new Date() },
        });
        const saved = await gestion.save();

        const fechaDesasignacion = new Date();
        fechaDesasignacion.setDate(fechaDesasignacion.getDate() + 30);
        await BdGeneral.findOneAndUpdate(
            { ruc: data.ruc },
            { estado_base: 'trabajada', 'asignacion.fecha_desasignacion': fechaDesasignacion }
        );

        return saved;
    },

    findAll: async () => {
        return await Gestion.find().populate('asesor.id_asesor', 'nombre_user dni_user').sort({ createdAt: -1 });
    },

    findByAsesor: async (id_asesor, { busqueda, tipo, fecha_desde, fecha_hasta, page = 1, limit = 50 } = {}) => {
        const filtro = { 'asesor.id_asesor': id_asesor };
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { razon_social: { $regex: busqueda, $options: 'i' } },
        ];
        if (tipo) filtro.tipo_tipificacion = tipo;
        if (fecha_desde || fecha_hasta) {
            filtro['fechas.fecha_tipificacion'] = {};
            if (fecha_desde) filtro['fechas.fecha_tipificacion'].$gte = new Date(fecha_desde);
            if (fecha_hasta) {
                const fin = new Date(fecha_hasta);
                fin.setDate(fin.getDate() + 1);
                filtro['fechas.fecha_tipificacion'].$lte = fin;
            }
        }
        const skip = (page - 1) * limit;
        const total = await Gestion.countDocuments(filtro);
        const gestiones = await Gestion.find(filtro).skip(skip).limit(limit).sort({ 'fechas.fecha_tipificacion': -1 });
        return { gestiones, total, page, totalPages: Math.ceil(total / limit) };
    },

    findById: async (id) => {
        return await Gestion.findById(id).populate('asesor.id_asesor', 'nombre_user dni_user');
    },

    update: async (id, data) => {
        // Si se marca como Negociada Aprobada, guardar fecha_ganada
        const updateData = { ...data };
        if (data.oportunidad?.estado === 'Negociada Aprobada') {
            updateData['fechas.fecha_ganada'] = new Date();
        }
        // Si se cambia de Negociada Aprobada a otro estado, limpiar fecha_ganada
        if (data.oportunidad?.estado && data.oportunidad.estado !== 'Negociada Aprobada') {
            updateData['fechas.fecha_ganada'] = null;
        }
        return await Gestion.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    },

    findFunnel: async ({ id_asesor, busqueda, estados, segmento, lineas_min, lineas_max, fecha_desde, fecha_hasta, page = 1, limit = 50 }) => {
        const filtro = { tipo_tipificacion: 'interesado' };
        if (id_asesor) filtro['asesor.id_asesor'] = id_asesor;
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { razon_social: { $regex: busqueda, $options: 'i' } },
        ];
        if (estados && estados.length > 0) filtro['oportunidad.estado'] = { $in: estados };
        if (segmento) filtro.segmento = segmento;
        if (lineas_min || lineas_max) {
            filtro.total_lineas = {};
            if (lineas_min) filtro.total_lineas.$gte = Number(lineas_min);
            if (lineas_max) filtro.total_lineas.$lte = Number(lineas_max);
        }
        if (fecha_desde || fecha_hasta) {
            filtro['fechas.fecha_tipificacion'] = {};
            if (fecha_desde) filtro['fechas.fecha_tipificacion'].$gte = new Date(fecha_desde);
            if (fecha_hasta) {
                const fin = new Date(fecha_hasta);
                fin.setDate(fin.getDate() + 1);
                filtro['fechas.fecha_tipificacion'].$lte = fin;
            }
        }
        const skip = (page - 1) * limit;
        const total = await Gestion.countDocuments(filtro);
        const gestiones = await Gestion.find(filtro)
            .populate('asesor.id_asesor', 'nombre_user')
            .skip(skip).limit(limit)
            .sort({ 'fechas.fecha_tipificacion': -1 });
        return { gestiones, total, page, totalPages: Math.ceil(total / limit) };
    },
};

module.exports = gestionesRepository;