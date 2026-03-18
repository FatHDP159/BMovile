const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const Gestion = require('../../domain/gestiones/gestiones.model.js');
const BdGeneral = require('../../domain/db_general/db_general.models.js');
const Actividad = require('../../domain/actividades/actividades.model.js');

// Mapeo productos -> categoría CF
const CATEGORIA_CF = {
    'Portabilidad': 'movil',
    'Renovación': 'movil',
    'Alta': 'movil',
    'Fibra': 'fibra',
    'HFC o FTTH': 'fibra',
    'Cloud': 'cloud',
    'Licencias Google': 'cloud',
    'Licencias Microsoft': 'cloud',
    'SVA': 'fija',
};

// GET - Dashboard asesor
router.get('/asesor', verifyToken, verifyRole('asesor'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const id_asesor = req.user.id;

        // Rango de fechas
        const inicio = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fin = fecha_hasta ? new Date(fecha_hasta) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

        const filtroFecha = { $gte: inicio, $lte: fin };

        // ── Actividades de hoy ──────────────────────────────────────────────
        const hoyInicio = new Date(); hoyInicio.setHours(0,0,0,0);
        const hoyFin = new Date(); hoyFin.setHours(23,59,59,999);
        const actHoy = await Actividad.find({
            asesor: id_asesor,
            fecha: { $gte: hoyInicio, $lte: hoyFin },
        });

        const actividadesHoy = {
            llamada: actHoy.filter(a => a.tipo === 'llamada').length,
            reunion: actHoy.filter(a => a.tipo === 'reunion').length,
            seguimiento: actHoy.filter(a => a.tipo === 'seguimiento').length,
            tarea: actHoy.filter(a => a.tipo === 'tarea').length,
            enviar_informacion: actHoy.filter(a => a.tipo === 'enviar_informacion').length,
        };

        // ── Empresas asignadas en el periodo ───────────────────────────────
        const empresasAsignadas = await BdGeneral.countDocuments({
            'asignacion.id_asesor': id_asesor,
            'asignacion.fecha_asignada': filtroFecha,
        });

        // ── Gestiones del periodo ──────────────────────────────────────────
        const gestiones = await Gestion.find({
            'asesor.id_asesor': id_asesor,
            'fechas.fecha_tipificacion': filtroFecha,
        });

        // Interesados (tipificados como interesado en el periodo)
        const interesados = gestiones.filter(g => g.tipo_tipificacion === 'interesado');

        // Clientes en funnel (todas las gestiones interesado activas)
        const clientesFunnel = await Gestion.countDocuments({
            'asesor.id_asesor': id_asesor,
            tipo_tipificacion: 'interesado',
        });

        // Ganadas en el periodo
        const ganadas = interesados.filter(g => g.oportunidad?.estado === 'Negociada Aprobada');

        // CF por categoría
        const cfTotales = { movil: 0, fibra: 0, fija: 0, cloud: 0, total: 0 };
        ganadas.forEach(g => {
            const cf = g.oportunidad?.cargo_fijo || 0;
            const cat = CATEGORIA_CF[g.oportunidad?.producto] || 'movil';
            cfTotales[cat] += cf;
            cfTotales.total += cf;
        });

        // ── Funnel stages ──────────────────────────────────────────────────
        const negociacion = interesados.filter(g => g.oportunidad?.estado === 'Negociación').length;
        const propuesta = interesados.filter(g => g.oportunidad?.estado === 'Propuesta Entregada').length;
        const identificada = interesados.filter(g => g.oportunidad?.estado === 'Identificada').length;

        const funnelStages = [
            { etapa: 'Prospectos',   cantidad: empresasAsignadas },
            { etapa: 'Interesados',  cantidad: interesados.length },
            { etapa: 'Propuesta',    cantidad: propuesta + negociacion + ganadas.length },
            { etapa: 'Negociación',  cantidad: negociacion + ganadas.length },
            { etapa: 'Ganadas',      cantidad: ganadas.length },
        ];

        // ── Ventas por producto (dona) ─────────────────────────────────────
        const ventasPorProducto = { movil: 0, fibra: 0, fija: 0, cloud: 0 };
        ganadas.forEach(g => {
            const cat = CATEGORIA_CF[g.oportunidad?.producto] || 'movil';
            ventasPorProducto[cat]++;
        });

        // ── Tasa de efectividad ────────────────────────────────────────────
        const tasaEfectividad = empresasAsignadas > 0
            ? Math.round((interesados.length / empresasAsignadas) * 100)
            : 0;

        // ── Reuniones completadas por día ──────────────────────────────────
        const reuniones = await Actividad.find({
            asesor: id_asesor,
            tipo: 'reunion',
            estado: 'completado',
            fecha: filtroFecha,
        });

        // Agrupar por día
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
            },
            kpis: {
                ventasPorProducto,
                tasaEfectividad,
                empresasAsignadas,
                interesados: interesados.length,
                funnelStages,
                reunionesChart,
            },
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al cargar dashboard', error: error.message });
    }
});

module.exports = router;