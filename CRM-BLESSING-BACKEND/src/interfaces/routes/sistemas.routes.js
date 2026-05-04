const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const FichaGestion = require('../../domain/fichaGestion/fichaGestion.model.js');
const Actividad = require('../../domain/actividades/actividades.model.js');
const Objetivo = require('../../domain/objetivos/objetivos.model.js');
const User = require('../../domain/users/user.model.js');

const calcDiasRango = (inicio, fin) => {
    return Math.max(1, Math.round((new Date(fin) - new Date(inicio)) / 86400000));
};

const fechaFin = (fecha_hasta) => {
    if (!fecha_hasta) return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    const f = new Date(fecha_hasta);
    f.setHours(23, 59, 59, 999);
    return f;
};

// GET - Dashboard sistemas
router.get('/dashboard', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, asesores: asesoresParam, granularidad = 'mensual' } = req.query;

        const inicio = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fin = fechaFin(fecha_hasta);
        const diasRango = calcDiasRango(inicio, fin);

        let asesores = await User.find({ rol_user: 'asesor', estado_user: 'activo' }).select('_id nombre_user');
        if (asesoresParam) {
            const ids = Array.isArray(asesoresParam) ? asesoresParam : asesoresParam.split(',');
            asesores = asesores.filter(a => ids.includes(a._id.toString()));
        }

        // Cargar todas las fichas activas
        const fichas = await FichaGestion.find({ activa: true });
        const reuniones = await Actividad.find({ tipo: 'reunion', estado: 'completado', fecha: { $gte: inicio, $lte: fin } });
        const objGlobal = await Objetivo.findOne({ tipo: 'global' });
        const objetivoDiario = objGlobal?.objetivo_diario || 0;

        // Interacciones en el período
        const interaccionesEnPeriodo = fichas.flatMap(f =>
            f.interacciones.filter(i =>
                new Date(i.fecha) >= inicio && new Date(i.fecha) <= fin
            )
        );
        const totalTipificaciones = interaccionesEnPeriodo.length;

        // Oportunidades creadas en el período (1 por ficha que tenga al menos 1 oportunidad en el período)
        const totalOportunidades = fichas.reduce((acc, f) => {
            const oposEnPeriodo = (f.oportunidades || []).filter(o =>
                new Date(o.fecha_creacion) >= inicio && new Date(o.fecha_creacion) <= fin
            );
            return acc + (oposEnPeriodo.length > 0 ? 1 : 0);
        }, 0);

        const totalCitas = reuniones.length;
        const conversionBase = totalTipificaciones > 0 ? Math.round((totalOportunidades / totalTipificaciones) * 100) : 0;
        const efectividadComercial = totalOportunidades > 0 ? Math.round((totalCitas / totalOportunidades) * 100) : 0;

        // Tabla asesores
        const tablaAsesores = await Promise.all(asesores.map(async (asesor) => {
            const fichasAsesor = fichas.filter(f => f.asesor?.id_asesor?.toString() === asesor._id.toString());

            // Interacciones del asesor en el período
            const interAsesor = fichasAsesor.flatMap(f =>
                f.interacciones.filter(i =>
                    new Date(i.fecha) >= inicio && new Date(i.fecha) <= fin
                )
            ).length;

            // Oportunidades del asesor creadas en el período
            const opAsesor = fichasAsesor.reduce((acc, f) => {
                const oposEnPeriodo = (f.oportunidades || []).filter(o =>
                    new Date(o.fecha_creacion) >= inicio && new Date(o.fecha_creacion) <= fin
                );
                return acc + (oposEnPeriodo.length > 0 ? 1 : 0);
            }, 0);

            const citasAsesor = reuniones.filter(r => r.asesor?.toString() === asesor._id.toString()).length;
            const objetivoPeriodo = objetivoDiario * diasRango;
            const alcance = objetivoPeriodo > 0 ? Math.round((opAsesor / objetivoPeriodo) * 100) : 0;

            return {
                id: asesor._id,
                nombre: asesor.nombre_user,
                tipificaciones: interAsesor,
                oportunidades: opAsesor,
                citas: citasAsesor,
                objetivo_periodo: objetivoPeriodo,
                alcance,
            };
        }));

        const funnelData = [
            { etapa: 'Tipificaciones', cantidad: totalTipificaciones },
            { etapa: 'Oportunidades',  cantidad: totalOportunidades },
            { etapa: 'Citas',          cantidad: totalCitas },
        ];

        // Serie temporal
        const serieData = [];
        if (granularidad === 'diario') {
            const dias = Math.min(diasRango, 31);
            for (let i = 0; i < dias; i++) {
                const dia = new Date(inicio);
                dia.setDate(inicio.getDate() + i);
                const diaFin = new Date(dia); diaFin.setHours(23,59,59,999);
                const iDia = interaccionesEnPeriodo.filter(i =>
                    new Date(i.fecha) >= dia && new Date(i.fecha) <= diaFin
                );
                serieData.push({
                    label: `${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}`,
                    tipificaciones: iDia.length,
                    oportunidades: iDia.filter(i => i.tipo === 'interesado').length,
                });
            }
        } else if (granularidad === 'semanal') {
            let semanaInicio = new Date(inicio);
            while (semanaInicio <= fin) {
                const semanaFin = new Date(semanaInicio);
                semanaFin.setDate(semanaInicio.getDate() + 6);
                semanaFin.setHours(23,59,59,999);
                const iSem = interaccionesEnPeriodo.filter(i =>
                    new Date(i.fecha) >= semanaInicio && new Date(i.fecha) <= semanaFin
                );
                serieData.push({
                    label: `${String(semanaInicio.getDate()).padStart(2,'0')}/${String(semanaInicio.getMonth()+1).padStart(2,'0')}`,
                    tipificaciones: iSem.length,
                    oportunidades: iSem.filter(i => i.tipo === 'interesado').length,
                });
                semanaInicio = new Date(semanaInicio);
                semanaInicio.setDate(semanaInicio.getDate() + 7);
            }
        } else {
            const meses = {};
            interaccionesEnPeriodo.forEach(i => {
                const d = new Date(i.fecha);
                const key = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                if (!meses[key]) meses[key] = { label: key, tipificaciones: 0, oportunidades: 0 };
                meses[key].tipificaciones++;
                if (i.tipo === 'interesado') meses[key].oportunidades++;
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