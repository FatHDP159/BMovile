const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const Gestion = require('../../domain/gestiones/gestiones.model.js');
const BdGeneral = require('../../domain/db_general/db_general.models.js');
const Actividad = require('../../domain/actividades/actividades.model.js');
const User = require('../../domain/users/user.model.js');

const CATEGORIA_CF = {
    'Portabilidad': 'movil', 'Renovación': 'movil', 'Alta': 'movil',
    'Fibra': 'fibra', 'HFC o FTTH': 'fibra',
    'Cloud': 'cloud', 'Licencias Google': 'cloud', 'Licencias Microsoft': 'cloud',
    'SVA': 'fija',
};

// GET - Dashboard asesor
router.get('/asesor', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const id_asesor = req.user.id;

        const inicio = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fin = fecha_hasta ? new Date(fecha_hasta) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
        const filtroFecha = { $gte: inicio, $lte: fin };

        const hoyInicio = new Date(); hoyInicio.setHours(0,0,0,0);
        const hoyFin = new Date(); hoyFin.setHours(23,59,59,999);
        const actHoy = await Actividad.find({ asesor: id_asesor, fecha: { $gte: hoyInicio, $lte: hoyFin } });

        const actividadesHoy = {
            llamada:            actHoy.filter(a => a.tipo === 'llamada').length,
            reunion:            actHoy.filter(a => a.tipo === 'reunion').length,
            seguimiento:        actHoy.filter(a => a.tipo === 'seguimiento').length,
            tarea:              actHoy.filter(a => a.tipo === 'tarea').length,
            enviar_informacion: actHoy.filter(a => a.tipo === 'enviar_informacion').length,
        };

        const empresasAsignadas = await BdGeneral.countDocuments({
            'asignacion.id_asesor': id_asesor,
            'asignacion.fecha_asignada': filtroFecha,
        });

        const gestiones = await Gestion.find({
            'asesor.id_asesor': id_asesor,
            'fechas.fecha_tipificacion': filtroFecha,
        });

        const interesados = gestiones.filter(g => g.tipo_tipificacion === 'interesado');
        const clientesFunnel = await Gestion.countDocuments({ 'asesor.id_asesor': id_asesor, tipo_tipificacion: 'interesado' });
        const ganadas = interesados.filter(g => g.oportunidad?.estado === 'Negociada Aprobada');

        const cfTotales = { movil: 0, fibra: 0, fija: 0, cloud: 0, total: 0 };
        ganadas.forEach(g => {
            const cf = g.oportunidad?.cargo_fijo || 0;
            const cat = CATEGORIA_CF[g.oportunidad?.producto] || 'movil';
            cfTotales[cat] += cf;
            cfTotales.total += cf;
        });

        const negociacion = interesados.filter(g => g.oportunidad?.estado === 'Negociación').length;
        const propuesta = interesados.filter(g => g.oportunidad?.estado === 'Propuesta Entregada').length;

        const funnelStages = [
            { etapa: 'Prospectos',  cantidad: empresasAsignadas },
            { etapa: 'Interesados', cantidad: interesados.length },
            { etapa: 'Propuesta',   cantidad: propuesta + negociacion + ganadas.length },
            { etapa: 'Negociación', cantidad: negociacion + ganadas.length },
            { etapa: 'Ganadas',     cantidad: ganadas.length },
        ];

        const ventasPorProducto = { movil: 0, fibra: 0, fija: 0, cloud: 0 };
        ganadas.forEach(g => { const cat = CATEGORIA_CF[g.oportunidad?.producto] || 'movil'; ventasPorProducto[cat]++; });

        const tasaEfectividad = empresasAsignadas > 0 ? Math.round((interesados.length / empresasAsignadas) * 100) : 0;

        const reuniones = await Actividad.find({ asesor: id_asesor, tipo: 'reunion', estado: 'completado', fecha: filtroFecha });
        const reunionesPorDia = {};
        reuniones.forEach(r => {
            const dia = new Date(r.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
            reunionesPorDia[dia] = (reunionesPorDia[dia] || 0) + 1;
        });
        const reunionesChart = Object.entries(reunionesPorDia).map(([fecha, cantidad]) => ({ fecha, cantidad }));

        res.json({
            actividadesHoy,
            tarjetas: { clientesFunnel, ganadas: ganadas.length, cfTotal: cfTotales.total, cfMovil: cfTotales.movil, cfFibra: cfTotales.fibra, cfFija: cfTotales.fija, cfCloud: cfTotales.cloud },
            kpis: { ventasPorProducto, tasaEfectividad, empresasAsignadas, interesados: interesados.length, funnelStages, reunionesChart },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar dashboard', error: error.message });
    }
});

// GET - Dashboard supervisor
router.get('/supervisor', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, id_asesor } = req.query;

        const inicio = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fin = fecha_hasta ? new Date(fecha_hasta) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
        const filtroFecha = { $gte: inicio, $lte: fin };

        const asesores = await User.find({ rol_user: 'asesor', estado_user: 'activo' }).select('_id nombre_user');

        const filtroAsesor = id_asesor ? { 'asesor.id_asesor': id_asesor } : {};
        const filtroAsignacion = id_asesor ? { 'asignacion.id_asesor': id_asesor } : {};

        const totalGestiones = await Gestion.countDocuments({ ...filtroAsesor, 'fechas.fecha_tipificacion': filtroFecha });
        const empresasAsignadas = await BdGeneral.countDocuments({ ...filtroAsignacion, 'asignacion.fecha_asignada': filtroFecha });
        const gestiones = await Gestion.find({ ...filtroAsesor, 'fechas.fecha_tipificacion': filtroFecha });

        const interesados = gestiones.filter(g => g.tipo_tipificacion === 'interesado');
        const ganadas = interesados.filter(g => g.oportunidad?.estado === 'Negociada Aprobada');
        const cfTotal = ganadas.reduce((acc, g) => acc + (g.oportunidad?.cargo_fijo || 0), 0);
        const tasaEfectividad = empresasAsignadas > 0 ? Math.round((interesados.length / empresasAsignadas) * 100) : 0;

        const rendimientoPorAsesor = await Promise.all(asesores.map(async (asesor) => {
            const gAsesor = gestiones.filter(g => g.asesor?.id_asesor?.toString() === asesor._id.toString());
            const intAsesor = gAsesor.filter(g => g.tipo_tipificacion === 'interesado');
            const ganAsesor = intAsesor.filter(g => g.oportunidad?.estado === 'Negociada Aprobada');
            const asigAsesor = await BdGeneral.countDocuments({ 'asignacion.id_asesor': asesor._id, 'asignacion.fecha_asignada': filtroFecha });
            return {
                id: asesor._id,
                nombre: asesor.nombre_user,
                asignadas: asigAsesor,
                gestiones: gAsesor.length,
                interesados: intAsesor.length,
                ganadas: ganAsesor.length,
                cf: ganAsesor.reduce((acc, g) => acc + (g.oportunidad?.cargo_fijo || 0), 0),
                efectividad: asigAsesor > 0 ? Math.round((intAsesor.length / asigAsesor) * 100) : 0,
            };
        }));

        const funnelStages = [
            { etapa: 'Prospectos',  cantidad: empresasAsignadas },
            { etapa: 'Interesados', cantidad: interesados.length },
            { etapa: 'Propuesta',   cantidad: interesados.filter(g => ['Propuesta Entregada','Negociación','Negociada Aprobada','Negociada Rechazada'].includes(g.oportunidad?.estado)).length },
            { etapa: 'Negociación', cantidad: interesados.filter(g => ['Negociación','Negociada Aprobada','Negociada Rechazada'].includes(g.oportunidad?.estado)).length },
            { etapa: 'Ganadas',     cantidad: ganadas.length },
        ];

        const ventasPorProducto = { movil: 0, fibra: 0, cloud: 0, fija: 0 };
        ganadas.forEach(g => { const cat = CATEGORIA_CF[g.oportunidad?.producto] || 'movil'; ventasPorProducto[cat]++; });

        const actPendientes = await Actividad.find({
            estado: 'pendiente',
            $or: [
                { asesor: req.user.id },
                { asesor: { $ne: req.user.id }, tipo: { $in: ['llamada','reunion','enviar_informacion','seguimiento'] } }
            ]
        }).populate('asesor', 'nombre_user').sort({ fecha: 1, hora: 1 }).limit(10);

        const gestionesPorTipo = {
            interesado:                 gestiones.filter(g => g.tipo_tipificacion === 'interesado').length,
            cliente_claro:              gestiones.filter(g => g.tipo_tipificacion === 'cliente_claro').length,
            sin_contacto:               gestiones.filter(g => g.tipo_tipificacion === 'sin_contacto').length,
            con_deuda:                  gestiones.filter(g => g.tipo_tipificacion === 'con_deuda').length,
            no_contesta:                gestiones.filter(g => g.tipo_tipificacion === 'no_contesta').length,
            cliente_no_interesado:      gestiones.filter(g => g.tipo_tipificacion === 'cliente_no_interesado').length,
            empresa_con_sustento_valido:gestiones.filter(g => g.tipo_tipificacion === 'empresa_con_sustento_valido').length,
        };

        res.json({
            metricas: { totalGestiones, empresasAsignadas, interesados: interesados.length, ganadas: ganadas.length, cfTotal, tasaEfectividad },
            rendimientoPorAsesor,
            kpis: { funnelStages, ventasPorProducto, gestionesPorTipo },
            actPendientes,
            asesores,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar dashboard supervisor', error: error.message });
    }
});

module.exports = router;
/*chau*/