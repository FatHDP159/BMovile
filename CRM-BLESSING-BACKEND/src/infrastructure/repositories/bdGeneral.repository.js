const BdGeneral = require('../../domain/db_general/db_general.models.js');

const bdGeneralRepository = {

    // Crear empresa
    create: async (data) => {
        const empresa = new BdGeneral(data);
        return await empresa.save();
    },

    // Listar todas las empresas
    findAll: async () => {
        return await BdGeneral.find().populate('asignacion.id_asesor', 'nombre_user dni_user rol_user');
    },

    // Buscar por RUC
    findByRuc: async (ruc) => {
        return await BdGeneral.findOne({ ruc }).populate('asignacion.id_asesor', 'nombre_user dni_user rol_user');
    },

    // Buscar por ID
    findById: async (id) => {
        return await BdGeneral.findById(id).populate('asignacion.id_asesor', 'nombre_user dni_user rol_user');
    },

    // Listar empresas por asesor
    findByAsesor: async (id_asesor, { busqueda, distrito, lineas_min, lineas_max, page = 1, limit = 20 } = {}) => {
        const filtro = { 'asignacion.id_asesor': id_asesor, estado_base: 'asignada' };
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { razon_social: { $regex: busqueda, $options: 'i' } },
        ];
        if (distrito) filtro.distrito = { $regex: distrito, $options: 'i' };
        if (lineas_min || lineas_max) {
            filtro['lineas.total'] = {};
            if (lineas_min) filtro['lineas.total'].$gte = Number(lineas_min);
            if (lineas_max) filtro['lineas.total'].$lte = Number(lineas_max);
        }
        const skip = (page - 1) * limit;
        const total = await BdGeneral.countDocuments(filtro);
        const empresas = await BdGeneral.find(filtro).skip(skip).limit(limit).sort({ createdAt: -1 });
        return { empresas, total, page, totalPages: Math.ceil(total / limit) };
    },

    // Asignar asesor
    asignar: async (id, id_asesor) => {
        return await BdGeneral.findByIdAndUpdate(
            id,
            {
                'asignacion.id_asesor': id_asesor,
                'asignacion.fecha_asignada': new Date(),
                'asignacion.fecha_desasignacion': null,
                estado_base: 'asignada',
            },
            { returnDocument: 'after' }
        );
    },

    // Desasignar asesor
    desasignar: async (id) => {
        return await BdGeneral.findByIdAndUpdate(
            id,
            {
                'asignacion.id_asesor': null,
                'asignacion.fecha_desasignacion': new Date(),
                estado_base: 'disponible',
            },
            { returnDocument: 'after' }
        );
    },

    // Actualizar estado y fecha desasignacion
    updateEstado: async (ruc, estado_base, fecha_desasignacion = null) => {
        return await BdGeneral.findOneAndUpdate(
            { ruc },
            {
                estado_base,
                'asignacion.fecha_desasignacion': fecha_desasignacion,
            },
            { returnDocument: 'after' }
        );
    },

    // Eliminar empresa y sus gestiones
    eliminar: async (id) => {
        const Gestion = require('../../domain/gestiones/gestiones.model.js');
        const empresa = await BdGeneral.findByIdAndDelete(id);
        if (empresa) {
            await Gestion.deleteMany({ ruc: empresa.ruc });
        }
        return empresa;
    },

    // Asignación masiva
    asignarMasivo: async (id_asesor, cantidad, segmento, operador, lineas_min, lineas_max) => {
        const filtro = { estado_base: 'disponible' };
        if (segmento) filtro.segmento = segmento;
        if (operador && operador !== 'mixto') {
            filtro[`lineas.${operador}`] = { $gt: 0 };
        }
        if (lineas_min || lineas_max) {
            filtro['lineas.total'] = {};
            if (lineas_min) filtro['lineas.total'].$gte = Number(lineas_min);
            if (lineas_max) filtro['lineas.total'].$lte = Number(lineas_max);
        }
        const empresas = await BdGeneral.find(filtro).limit(Number(cantidad));
        const ids = empresas.map((e) => e._id);
        await BdGeneral.updateMany(
            { _id: { $in: ids } },
            {
                'asignacion.id_asesor': id_asesor,
                'asignacion.fecha_asignada': new Date(),
                'asignacion.fecha_desasignacion': null,
                estado_base: 'asignada',
            }
        );
        return empresas.length;
    },

    // Desasignar todas las empresas de un asesor
    desasignarTodo: async (id_asesor) => {
        const result = await BdGeneral.updateMany(
            { 'asignacion.id_asesor': id_asesor },
            {
                'asignacion.id_asesor': null,
                'asignacion.fecha_desasignacion': new Date(),
                estado_base: 'disponible',
            }
        );
        return result.modifiedCount;
    },

    // Búsqueda con filtros y paginación
    buscar: async ({ busqueda, estado, segmento, operador, consultor, fecha_asignacion_sf, fecha_desasignacion_sf, page = 1, limit = 50 }) => {
        const filtro = {};
        if (busqueda) {
            filtro.$or = [
                { ruc: { $regex: busqueda, $options: 'i' } },
                { razon_social: { $regex: busqueda, $options: 'i' } },
            ];
        }
        if (estado) filtro.estado_base = estado;
        if (segmento) filtro.segmento = segmento;
        if (operador && operador !== 'mixto') filtro[`lineas.${operador}`] = { $gt: 0 };
        if (consultor) filtro['salesforce.consultor'] = { $regex: consultor, $options: 'i' };
        if (fecha_asignacion_sf) {
            const inicio = new Date(fecha_asignacion_sf);
            const fin = new Date(fecha_asignacion_sf);
            fin.setDate(fin.getDate() + 1);
            filtro['salesforce.fecha_asignada'] = { $gte: inicio, $lt: fin };
        }
        if (fecha_desasignacion_sf) {
            const inicio = new Date(fecha_desasignacion_sf);
            const fin = new Date(fecha_desasignacion_sf);
            fin.setDate(fin.getDate() + 1);
            filtro['salesforce.fecha_desasignacion'] = { $gte: inicio, $lt: fin };
        }

        const skip = (page - 1) * limit;
        const total = await BdGeneral.countDocuments(filtro);
        const empresas = await BdGeneral.find(filtro)
            .populate('asignacion.id_asesor', 'nombre_user dni_user')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        return { empresas, total, page, totalPages: Math.ceil(total / limit) };
    },

};

module.exports = bdGeneralRepository;