const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const FichaGestion = require('../../domain/fichaGestion/fichaGestion.model.js');
const User = require('../../domain/users/user.model.js');

// GET /api/reportes-bd/metricas
router.get('/metricas', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const hace7dias = new Date();
        hace7dias.setDate(hace7dias.getDate() - 7);

        const [
            porSegmento,
            sinLineas,
            porOperadorRaw,
            sinContactosAutorizados,
            sinTelefono,
            sinCorreo,
            porEstadoRaw,
            rucsConContactoReciente,
            fichasSinOportunidades,
            fichasEnFunnel,
        ] = await Promise.all([
            // 1. Por segmento
            EmpresaV2.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$salesforce.segmento', 'Sin segmento'] },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            // 2. Sin líneas (osiptel.total === 0)
            EmpresaV2.countDocuments({ 'osiptel.total': 0 }),

            // 3. Por operador dominante (mayor cantidad de líneas)
            EmpresaV2.aggregate([
                {
                    $addFields: {
                        max_lineas: {
                            $max: [
                                '$osiptel.claro',
                                '$osiptel.movistar',
                                '$osiptel.entel',
                                '$osiptel.otros',
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        operador_dominante: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.claro', '$max_lineas'] }] },
                                        then: 'claro',
                                    },
                                    {
                                        case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.movistar', '$max_lineas'] }] },
                                        then: 'movistar',
                                    },
                                    {
                                        case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.entel', '$max_lineas'] }] },
                                        then: 'entel',
                                    },
                                    {
                                        case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.otros', '$max_lineas'] }] },
                                        then: 'otros',
                                    },
                                ],
                                default: 'sin_operador',
                            },
                        },
                    },
                },
                {
                    $group: { _id: '$operador_dominante', count: { $sum: 1 } },
                },
            ]),

            // 4. Sin ningún contacto autorizado
            EmpresaV2.countDocuments({
                $or: [
                    { contactos_autorizados: { $exists: false } },
                    { contactos_autorizados: { $size: 0 } },
                ],
            }),

            // 5. Sin teléfono en contactos autorizados
            EmpresaV2.countDocuments({
                contactos_autorizados: {
                    $not: { $elemMatch: { tel: { $nin: [null, ''] } } },
                },
            }),

            // 6. Sin correo en contactos autorizados
            EmpresaV2.countDocuments({
                contactos_autorizados: {
                    $not: { $elemMatch: { correo: { $nin: [null, ''] } } },
                },
            }),

            // 7. Por estado_base
            EmpresaV2.aggregate([
                {
                    $group: {
                        _id: '$estado_base',
                        count: { $sum: 1 },
                    },
                },
            ]),

            // 8. RUCs con contacto en los últimos 7 días (para calcular asignadas sin tipificar)
            FichaGestion.distinct('ruc', {
                activa: true,
                'fechas.fecha_ultimo_contacto': { $gte: hace7dias },
            }),

            // 9. Fichas activas sin oportunidades
            FichaGestion.countDocuments({
                activa: true,
                $or: [
                    { oportunidades: { $exists: false } },
                    { oportunidades: { $size: 0 } },
                ],
            }),

            // 10. Fichas activas con oportunidades en funnel (no cerradas)
            FichaGestion.countDocuments({
                activa: true,
                oportunidades: {
                    $elemMatch: {
                        estado: {
                            $in: ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada'],
                        },
                    },
                },
            }),
        ]);

        // 8 (cont.) — empresas asignadas sin tipificar en más de 7 días
        const asignadasSinTipificar = await EmpresaV2.countDocuments({
            estado_base: 'asignada',
            ruc: { $nin: rucsConContactoReciente },
        });

        // Normalizar resultados de aggregations a objetos planos
        const segmentos = {};
        porSegmento.forEach(s => { segmentos[s._id] = s.count; });

        const operadores = {};
        porOperadorRaw.forEach(o => { operadores[o._id] = o.count; });

        const estados = {};
        porEstadoRaw.forEach(e => { estados[e._id] = e.count; });

        res.json({
            porSegmento: segmentos,
            sinLineas,
            porOperador: operadores,
            sinContactosAutorizados,
            sinTelefono,
            sinCorreo,
            porEstado: estados,
            asignadasSinTipificar,
            fichasSinOportunidades,
            fichasEnFunnel,
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al cargar métricas de BD', error: error.message });
    }
});

// GET /api/reportes-bd/segmentos-raw  ← diagnóstico temporal
router.get('/segmentos-raw', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const valores = await EmpresaV2.distinct('salesforce.segmento');
        res.json({ total: valores.length, valores });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// GET /api/reportes-bd/descargar?tipo=segmento&valor=Pyme
router.get('/descargar', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { tipo, valor } = req.query;

        const camposEmpresa = {
            ruc: 1,
            'sunat.razon_social': 1,
            'salesforce.segmento': 1,
            estado_base: 1,
            'osiptel.claro': 1,
            'osiptel.movistar': 1,
            'osiptel.entel': 1,
            'osiptel.otros': 1,
            'osiptel.total': 1,
        };

        const fmtEmpresa = (e) => ({
            RUC: e.ruc,
            Razon_Social: e.sunat?.razon_social || '',
            Segmento: e.salesforce?.segmento || '',
            Estado: e.estado_base || '',
            Lineas_Claro: e.osiptel?.claro ?? 0,
            Lineas_Movistar: e.osiptel?.movistar ?? 0,
            Lineas_Entel: e.osiptel?.entel ?? 0,
            Lineas_Otros: e.osiptel?.otros ?? 0,
            Total_Lineas: e.osiptel?.total ?? 0,
        });

        if (tipo === 'segmento') {
            const query = (!valor || valor === 'Sin segmento')
                ? { $or: [{ 'salesforce.segmento': null }, { 'salesforce.segmento': '' }] }
                : { 'salesforce.segmento': valor };
            const docs = await EmpresaV2.find(query, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinLineas') {
            const docs = await EmpresaV2.find({ 'osiptel.total': 0 }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'operador') {
            const SWITCH_OP = {
                $switch: {
                    branches: [
                        { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.claro',    '$max_lineas'] }] }, then: 'claro'       },
                        { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.movistar', '$max_lineas'] }] }, then: 'movistar'    },
                        { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.entel',    '$max_lineas'] }] }, then: 'entel'       },
                        { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.otros',    '$max_lineas'] }] }, then: 'otros'       },
                    ],
                    default: 'sin_operador',
                },
            };
            const docs = await EmpresaV2.aggregate([
                { $addFields: { max_lineas: { $max: ['$osiptel.claro', '$osiptel.movistar', '$osiptel.entel', '$osiptel.otros'] } } },
                { $addFields: { operador_dominante: SWITCH_OP } },
                { $match: { operador_dominante: valor } },
                { $project: { ruc: 1, sunat: 1, salesforce: 1, estado_base: 1, osiptel: 1 } },
            ]);
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinContactos') {
            const docs = await EmpresaV2.find({
                $or: [{ contactos_autorizados: { $exists: false } }, { contactos_autorizados: { $size: 0 } }],
            }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinTelefono') {
            const docs = await EmpresaV2.find({
                contactos_autorizados: { $not: { $elemMatch: { tel: { $nin: [null, ''] } } } },
            }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinCorreo') {
            const docs = await EmpresaV2.find({
                contactos_autorizados: { $not: { $elemMatch: { correo: { $nin: [null, ''] } } } },
            }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'estado') {
            const docs = await EmpresaV2.find({ estado_base: valor }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'asignadasSinTipificar') {
            const hace7dias = new Date();
            hace7dias.setDate(hace7dias.getDate() - 7);
            const rucsRecientes = await FichaGestion.distinct('ruc', {
                activa: true,
                'fechas.fecha_ultimo_contacto': { $gte: hace7dias },
            });
            const docs = await EmpresaV2.find({
                estado_base: 'asignada',
                ruc: { $nin: rucsRecientes },
            }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'fichasSinOportunidades' || tipo === 'fichasEnFunnel') {
            const fichaQuery = tipo === 'fichasSinOportunidades'
                ? { activa: true, $or: [{ oportunidades: { $exists: false } }, { oportunidades: { $size: 0 } }] }
                : { activa: true, oportunidades: { $elemMatch: { estado: { $in: ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada'] } } } };

            const fichasResult = await FichaGestion.find(fichaQuery, {
                ruc: 1, razon_social: 1, segmento: 1,
                'asesor.id_asesor': 1, 'fechas.fecha_ultimo_contacto': 1,
            }).lean();

            const asesorIds = [...new Set(fichasResult.map(f => f.asesor?.id_asesor?.toString()).filter(Boolean))];
            const asesorDocs = await User.find({ _id: { $in: asesorIds } }, { nombre_user: 1 }).lean();
            const asesorMap = {};
            asesorDocs.forEach(a => { asesorMap[a._id.toString()] = a.nombre_user; });

            const resultado = fichasResult.map(f => ({
                RUC: f.ruc,
                Razon_Social: f.razon_social,
                Segmento: f.segmento || '',
                Asesor: asesorMap[f.asesor?.id_asesor?.toString()] || '',
                Ultimo_Contacto: f.fechas?.fecha_ultimo_contacto
                    ? new Date(f.fechas.fecha_ultimo_contacto).toLocaleDateString('es-PE')
                    : 'Sin contacto',
            }));
            return res.json(resultado);
        }

        return res.status(400).json({ message: 'Tipo de descarga no válido' });

    } catch (error) {
        res.status(500).json({ message: 'Error al descargar datos', error: error.message });
    }
});

module.exports = router;
