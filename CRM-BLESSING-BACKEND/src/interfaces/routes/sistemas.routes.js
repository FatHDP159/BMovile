const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const Gestion = require('../../domain/gestiones/gestiones.model.js');
const Actividad = require('../../domain/actividades/actividades.model.js');
const Objetivo = require('../../domain/objetivos/objetivos.model.js');
const User = require('../../domain/users/user.model.js');

// Calcular días en el rango para proyectar objetivo diario
const calcDiasRango = (inicio, fin) => {
    return Math.max(1, Math.round((fin - inicio) / 86400000) + 1);
};

// GET - Dashboard sistemas
router.get('/dashboard', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, asesores: asesoresParam, granularidad = 'mensual' } = req.query;

        const inicio = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fin = fecha_hasta ? new Date(fecha_hasta) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
        const filtroFecha = { $gte: inicio, $lte: fin };
        const diasRango = calcDiasRango(inicio, fin);

        // Asesores a mostrar
        let asesores = await User.find({ rol_user: 'asesor', estado_user: 'activo' }).select('_id nombre_user');
        if (asesoresParam) {
            const ids = Array.isArray(asesoresParam) ? asesoresParam : asesoresParam.split(',');
            asesores = asesores.filter(a => ids.includes(a._id.toString()));
        }

        // Gestiones del periodo
        const gestiones = await Gestion.find({ 'fechas.fecha_tipificacion': filtroFecha });

        // Reuniones completadas del periodo
        const reuniones = await Actividad.find({
            tipo: 'reunion', estado: 'completado', fecha: filtroFecha,
        });

        // Objetivo global
        const objGlobal = await Objetivo.findOne({ tipo: 'global' });
        const objetivoDiario = objGlobal?.objetivo_diario || 0;

        // KPIs maestros
        const totalTipificaciones = gestiones.length;
        const totalOportunidades = gestiones.filter(g => g.tipo_tipificacion === 'interesado').length;
        const totalCitas = reuniones.length;
        const conversionBase = totalTipificaciones > 0 ? Math.round((totalOportunidades / totalTipificaciones) * 100) : 0;
        const efectividadComercial = totalOportunidades > 0 ? Math.round((totalCitas / totalOportunidades) * 100) : 0;

        // Por asesor
        const tablaAsesores = await Promise.all(asesores.map(async (asesor) => {
            const gAsesor = gestiones.filter(g => g.asesor?.id_asesor?.toString() === asesor._id.toString());
            const opAsesor = gAsesor.filter(g => g.tipo_tipificacion === 'interesado').length;
            const citasAsesor = reuniones.filter(r => r.asesor?.toString() === asesor._id.toString()).length;
            const objetivoPeriodo = objetivoDiario * diasRango;
            const alcance = objetivoPeriodo > 0 ? Math.round((opAsesor / objetivoPeriodo) * 100) : 0;

            return {
                id: asesor._id,
                nombre: asesor.nombre_user,
                tipificaciones: gAsesor.length,
                oportunidades: opAsesor,
                citas: citasAsesor,
                objetivo_periodo: objetivoPeriodo,
                alcance,
            };
        }));

        // Funnel
        const funnelData = [
            { etapa: 'Tipificaciones', cantidad: totalTipificaciones },
            { etapa: 'Oportunidades',  cantidad: totalOportunidades },
            { etapa: 'Citas',          cantidad: totalCitas },
        ];

        // Serie temporal para granularidad
        const serieData = [];
        if (granularidad === 'diario') {
            const dias = Math.min(diasRango, 31);
            for (let i = 0; i < dias; i++) {
                const dia = new Date(inicio);
                dia.setDate(inicio.getDate() + i);
                const diaFin = new Date(dia); diaFin.setHours(23,59,59,999);
                const gDia = gestiones.filter(g => new Date(g.fechas?.fecha_tipificacion) >= dia && new Date(g.fechas?.fecha_tipificacion) <= diaFin);
                serieData.push({
                    label: `${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}`,
                    tipificaciones: gDia.length,
                    oportunidades: gDia.filter(g => g.tipo_tipificacion === 'interesado').length,
                });
            }
        } else if (granularidad === 'semanal') {
            let semanaInicio = new Date(inicio);
            while (semanaInicio <= fin) {
                const semanaFin = new Date(semanaInicio);
                semanaFin.setDate(semanaInicio.getDate() + 6);
                semanaFin.setHours(23,59,59,999);
                const gSem = gestiones.filter(g => new Date(g.fechas?.fecha_tipificacion) >= semanaInicio && new Date(g.fechas?.fecha_tipificacion) <= semanaFin);
                serieData.push({
                    label: `${String(semanaInicio.getDate()).padStart(2,'0')}/${String(semanaInicio.getMonth()+1).padStart(2,'0')}`,
                    tipificaciones: gSem.length,
                    oportunidades: gSem.filter(g => g.tipo_tipificacion === 'interesado').length,
                });
                semanaInicio.setDate(semanaInicio.getDate() + 7);
            }
        } else {
            // mensual
            const meses = {};
            gestiones.forEach(g => {
                const d = new Date(g.fechas?.fecha_tipificacion);
                const key = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                if (!meses[key]) meses[key] = { label: key, tipificaciones: 0, oportunidades: 0 };
                meses[key].tipificaciones++;
                if (g.tipo_tipificacion === 'interesado') meses[key].oportunidades++;
            });
            serieData.push(...Object.values(meses));
        }

        res.json({
            kpis: { totalTipificaciones, totalOportunidades, totalCitas, conversionBase, efectividadComercial },
            tablaAsesores,
            funnelData,
            serieData,
            diasRango,
            asesores,
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al cargar dashboard sistemas', error: error.message });
    }
});

// GET - Obtener objetivo global
router.get('/objetivos', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const obj = await Objetivo.findOne({ tipo: 'global' });
        res.json({ objetivo_diario: obj?.objetivo_diario || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// POST - Guardar objetivo global
router.post('/objetivos', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { objetivo_diario } = req.body;
        const obj = await Objetivo.findOneAndUpdate(
            { tipo: 'global' },
            { objetivo_diario: Number(objetivo_diario) },
            { upsert: true, returnDocument: 'after' }
        );
        res.json({ message: 'Objetivo guardado', obj });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

module.exports = router;