const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const FichaGestion = require('../../domain/fichaGestion/fichaGestion.model.js');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const Actividad = require('../../domain/actividades/actividades.model.js');
const User = require('../../domain/users/user.model.js');

const CATEGORIA_CF = {
    'Portabilidad': 'movil', 'Renovación': 'movil', 'Alta': 'movil',
    'Fibra': 'fibra', 'HFC o FTTH': 'fibra',
    'Cloud': 'cloud', 'Licencias Google': 'cloud', 'Licencias Microsoft': 'cloud',
    'SVA': 'fija',
};

const fechaFin = (fecha_hasta) => {
    if (!fecha_hasta) return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    const f = new Date(fecha_hasta);
    f.setHours(23, 59, 59, 999);
    return f;
};

// GET - Dashboard asesor
router.get('/asesor', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const id_asesor = req.user.id;

        const inicio = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fin = fechaFin(fecha_hasta);

        // Actividades de hoy
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

        // Empresas en cartera
        const empresasEnCartera = await EmpresaV2.countDocuments({
            'asignacion.id_asesor': id_asesor,
            estado_base: 'asignada',
        });

        // Todas las fichas activas del asesor
        const fichas = await FichaGestion.find({
            'asesor.id_asesor': id_asesor,
            activa: true,
        });

        // Interacciones en el período seleccionado
        const interaccionesEnPeriodo = fichas.flatMap(f =>
            f.interacciones.filter(i =>
                new Date(i.fecha) >= inicio && new Date(i.fecha) <= fin
            )
        );

        // Fichas con oportunidades (interesados)
        const fichasConOpo = fichas.filter(f => f.oportunidades?.length > 0);
        const interesados = fichasConOpo.length;
        const clientesFunnel = interesados;

        // Todas las oportunidades
        const todasOportunidades = fichas.flatMap(f => f.oportunidades || []);

        // Ganadas en el período
        const ganadas = todasOportunidades.filter(o =>
            o.estado === 'Negociada Aprobada' &&
            o.fecha_ganada &&
            new Date(o.fecha_ganada) >= inicio &&
            new Date(o.fecha_ganada) <= fin
        );

        // CF por categoría
        const cfTotales = { movil: 0, fibra: 0, fija: 0, cloud: 0, total: 0 };
        ganadas.forEach(o => {
            const cf = o.cargo_fijo || 0;
            const cat = CATEGORIA_CF[o.producto] || 'movil';
            cfTotales[cat] += cf;
            cfTotales.total += cf;
        });

        // Funnel stages
        const enPropuesta = todasOportunidades.filter(o => ['Propuesta Entregada','Negociación','Negociada Aprobada'].includes(o.estado)).length;
        const enNegociacion = todasOportunidades.filter(o => ['Negociación','Negociada Aprobada'].includes(o.estado)).length;

        const funnelStages = [
            { etapa: 'En cartera',  cantidad: empresasEnCartera },
            { etapa: 'Interesados', cantidad: interesados },
            { etapa: 'Propuesta',   cantidad: enPropuesta },
            { etapa: 'Negociación', cantidad: enNegociacion },
            { etapa: 'Ganadas',     cantidad: ganadas.length },
        ];

        const ventasPorProducto = { movil: 0, fibra: 0, fija: 0, cloud: 0 };
        ganadas.forEach(o => { const cat = CATEGORIA_CF[o.producto] || 'movil'; ventasPorProducto[cat]++; });

        const tasaEfectividad = empresasEnCartera > 0 ? Math.round((interesados / empresasEnCartera) * 100) : 0;

        // Reuniones completadas en el período
        const reuniones = await Actividad.find({
            asesor: id_asesor,
            tipo: 'reunion',
            estado: 'completado',
            fecha: { $gte: inicio, $lte: fin }
        });
        const reunionesPorDia = {};
        reuniones.forEach(r => {
            const dia = new Date(r.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
            reunionesPorDia[dia] = (reunionesPorDia[dia] || 0) + 1;
        });
        const reunionesChart = Object.entries(reunionesPorDia).map(([fecha, cantidad]) => ({ fecha, cantidad }));

        res.json({
            actividadesHoy,
            tarjetas: {
                clientesFunnel,
                ganadas: ganadas.length,
                cfTotal: cfTotales.total,
                cfMovil: cfTotales.movil,
                cfFibra: cfTotales.fibra,
                cfFija: cfTotales.fija,
                cfCloud: cfTotales.cloud,
                gestionesPeriodo: interaccionesEnPeriodo.length,
            },
            kpis: { ventasPorProducto, tasaEfectividad, empresasEnCartera, interesados, funnelStages, reunionesChart },
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
        const fin = fechaFin(fecha_hasta);

        const asesores = await User.find({ rol_user: 'asesor', estado_user: 'activo' }).select('_id nombre_user');

        const filtroFicha = id_asesor
            ? { 'asesor.id_asesor': id_asesor, activa: true }
            : { activa: true };

        const filtroCartera = id_asesor
            ? { 'asignacion.id_asesor': id_asesor, estado_base: 'asignada' }
            : { estado_base: 'asignada' };

        const empresasEnCartera = await EmpresaV2.countDocuments(filtroCartera);
        const fichas = await FichaGestion.find(filtroFicha);

        // Interacciones en el período
        const interaccionesEnPeriodo = fichas.flatMap(f =>
            f.interacciones.filter(i =>
                new Date(i.fecha) >= inicio && new Date(i.fecha) <= fin
            )
        );
        const totalGestiones = interaccionesEnPeriodo.length;

        // Oportunidades
        const todasOpos = fichas.flatMap(f => f.oportunidades || []);
        const interesados = fichas.filter(f => f.oportunidades?.length > 0).length;

        // Ganadas en el período
        const ganadas = todasOpos.filter(o =>
            o.estado === 'Negociada Aprobada' &&
            o.fecha_ganada &&
            new Date(o.fecha_ganada) >= inicio &&
            new Date(o.fecha_ganada) <= fin
        );
        const cfTotal = ganadas.reduce((acc, o) => acc + (o.cargo_fijo || 0), 0);
        const tasaEfectividad = empresasEnCartera > 0 ? Math.round((interesados / empresasEnCartera) * 100) : 0;

        // Rendimiento por asesor
        const rendimientoPorAsesor = await Promise.all(asesores.map(async (asesor) => {
            const fichasAsesor = fichas.filter(f => f.asesor?.id_asesor?.toString() === asesor._id.toString());
            const interAsesor = fichasAsesor.flatMap(f =>
                f.interacciones.filter(i =>
                    new Date(i.fecha) >= inicio && new Date(i.fecha) <= fin
                )
            ).length;
            const intAsesor = fichasAsesor.filter(f => f.oportunidades?.length > 0).length;
            const oposAsesor = fichasAsesor.flatMap(f => f.oportunidades || []);
            const ganAsesor = oposAsesor.filter(o =>
                o.estado === 'Negociada Aprobada' &&
                o.fecha_ganada &&
                new Date(o.fecha_ganada) >= inicio &&
                new Date(o.fecha_ganada) <= fin
            );
            const enCarteraAsesor = await EmpresaV2.countDocuments({
                'asignacion.id_asesor': asesor._id,
                estado_base: 'asignada',
            });
            return {
                id: asesor._id,
                nombre: asesor.nombre_user,
                enCartera: enCarteraAsesor,
                gestiones: interAsesor,
                interesados: intAsesor,
                ganadas: ganAsesor.length,
                cf: ganAsesor.reduce((acc, o) => acc + (o.cargo_fijo || 0), 0),
                efectividad: enCarteraAsesor > 0 ? Math.round((intAsesor / enCarteraAsesor) * 100) : 0,
            };
        }));

        // Funnel
        const funnelStages = [
            { etapa: 'En cartera',  cantidad: empresasEnCartera },
            { etapa: 'Interesados', cantidad: interesados },
            { etapa: 'Propuesta',   cantidad: todasOpos.filter(o => ['Propuesta Entregada','Negociación','Negociada Aprobada'].includes(o.estado)).length },
            { etapa: 'Negociación', cantidad: todasOpos.filter(o => ['Negociación','Negociada Aprobada'].includes(o.estado)).length },
            { etapa: 'Ganadas',     cantidad: ganadas.length },
        ];

        const ventasPorProducto = { movil: 0, fibra: 0, cloud: 0, fija: 0 };
        ganadas.forEach(o => { const cat = CATEGORIA_CF[o.producto] || 'movil'; ventasPorProducto[cat]++; });

        // Gestiones por tipo en el período
        const gestionesPorTipo = {
            interesado:                  interaccionesEnPeriodo.filter(i => i.tipo === 'interesado').length,
            cliente_claro:               interaccionesEnPeriodo.filter(i => i.tipo === 'cliente_claro').length,
            sin_contacto:                interaccionesEnPeriodo.filter(i => i.tipo === 'sin_contacto').length,
            con_deuda:                   interaccionesEnPeriodo.filter(i => i.tipo === 'con_deuda').length,
            no_contesta:                 interaccionesEnPeriodo.filter(i => i.tipo === 'no_contesta').length,
            cliente_no_interesado:       interaccionesEnPeriodo.filter(i => i.tipo === 'cliente_no_interesado').length,
            empresa_con_sustento_valido: interaccionesEnPeriodo.filter(i => i.tipo === 'empresa_con_sustento_valido').length,
        };

        const actPendientes = await Actividad.find({
            estado: 'pendiente',
            $or: [
                { asesor: req.user.id },
                { asesor: { $ne: req.user.id }, tipo: { $in: ['llamada','reunion','enviar_informacion','seguimiento'] } }
            ]
        }).populate('asesor', 'nombre_user').sort({ fecha: 1, hora: 1 }).limit(10);

        res.json({
            metricas: { totalGestiones, empresasEnCartera, interesados, ganadas: ganadas.length, cfTotal, tasaEfectividad },
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