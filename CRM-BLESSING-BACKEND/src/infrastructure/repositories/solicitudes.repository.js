const Solicitud = require('../../domain/solicitudes/solicitudes.model.js');
const BdGeneral = require('../../domain/db_general/db_general.models.js');
const Gestion = require('../../domain/gestiones/gestiones.model.js');

const solicitudesRepository = {

    // Buscar empresa por RUC — lógica completa
    buscarPorRuc: async (ruc, id_asesor) => {
        const resultado = { ruc, estado: null, razon_social: null, consultor: null, solicitud: null };

        // 1. Buscar solicitud pendiente para este RUC
        const solicitudPendiente = await Solicitud.findOne({ 'empresa.ruc': ruc, estado: 'pendiente' });
        if (solicitudPendiente) {
            resultado.estado = 'solicitud_pendiente';
            resultado.razon_social = solicitudPendiente.empresa.razon_social;
            resultado.solicitud = {
                solicitado_por: solicitudPendiente.asesor.nombre,
                es_mia: solicitudPendiente.asesor.id.toString() === id_asesor.toString(),
            };
            return resultado;
        }

        // 2. Buscar en base de gestiones (última gestión)
        const ultimaGestion = await Gestion.findOne({ ruc }).sort({ createdAt: -1 })
            .populate('asesor.id_asesor', 'nombre_user');

        if (ultimaGestion) {
            resultado.razon_social = ultimaGestion.razon_social;
            resultado.consultor = ultimaGestion.asesor?.id_asesor?.nombre_user || 'Asesor';
            const diasDesde = Math.floor((new Date() - new Date(ultimaGestion.createdAt)) / 86400000);
            resultado.estado = diasDesde <= 30 ? 'en_gestion' : 'liberada';
            return resultado;
        }

        // 3. Buscar en base general
        const empresa = await BdGeneral.findOne({ ruc });
        if (empresa) {
            resultado.razon_social = empresa.razon_social;
            resultado.estado = 'no_gestionada';
            return resultado;
        }

        // 4. No existe
        resultado.estado = 'no_encontrada';
        return resultado;
    },

    // Crear solicitud
    crear: async (id_asesor, nombre_asesor, ruc, razon_social) => {
        // Verificar que no haya solicitud pendiente ya
        const existe = await Solicitud.findOne({ 'empresa.ruc': ruc, estado: 'pendiente' });
        if (existe) throw new Error('Ya existe una solicitud pendiente para esta empresa');
        return await Solicitud.create({
            asesor: { id: id_asesor, nombre: nombre_asesor },
            empresa: { ruc, razon_social },
        });
    },

    // Listar todas las solicitudes (supervisor)
    findAll: async () => {
        return await Solicitud.find().sort({ createdAt: -1 });
    },

    // Listar pendientes (supervisor)
    findPendientes: async () => {
        return await Solicitud.find({ estado: 'pendiente' }).sort({ createdAt: 1 });
    },

    // Aprobar solicitud
    aprobar: async (id, supervisor_nombre, id_asesor) => {
        const solicitud = await Solicitud.findByIdAndUpdate(
            id,
            { estado: 'aprobada', revisado_por: supervisor_nombre, fecha_revision: new Date() },
            { returnDocument: 'after' }
        );
        // Asignar empresa al asesor en bd_general
        await BdGeneral.findOneAndUpdate(
            { ruc: solicitud.empresa.ruc },
            {
                'asignacion.id_asesor': id_asesor || solicitud.asesor.id,
                'asignacion.fecha_asignada': new Date(),
                'asignacion.fecha_desasignacion': null,
                estado_base: 'asignada',
            }
        );
        return solicitud;
    },

    // Rechazar solicitud
    rechazar: async (id, supervisor_nombre) => {
        return await Solicitud.findByIdAndUpdate(
            id,
            { estado: 'rechazada', revisado_por: supervisor_nombre, fecha_revision: new Date() },
            { returnDocument: 'after' }
        );
    },
};

module.exports = solicitudesRepository;