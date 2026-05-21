const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const FichaGestion = require('../../domain/fichaGestion/fichaGestion.model.js');
const User                   = require('../../domain/users/user.model.js');
const ContactoAutorizado     = require('../../domain/contactos/contactoAutorizado.model.js');
const ContactoAutorizadoDato = require('../../domain/contactos/contactoAutorizadoDato.model.js');

const SEGMENTO_SWITCH = {
    $switch: {
        branches: [
            { case: { $in: [{ $toLower: '$salesforce.segmento' }, ['pyme']] },                           then: 'Pyme'     },
            { case: { $in: [{ $toLower: '$salesforce.segmento' }, ['micro empresas', 'micro empresa']] }, then: 'Micro'    },
            { case: { $in: [{ $toLower: '$salesforce.segmento' }, ['mayores']] },                         then: 'Mayores'  },
            { case: { $in: [{ $toLower: '$salesforce.segmento' }, ['empresas']] },                        then: 'Empresas' },
            { case: { $in: [{ $toLower: '$salesforce.segmento' }, ['gobierno']] },                        then: 'Gobierno' },
        ],
        default: 'Sin segmento',
    },
};

const fmtDesglose = (arr) => {
    const obj = {};
    arr.forEach(item => { obj[item._id] = item.count; });
    return obj;
};

const REGEX_SEGMENTO = {
    'Pyme':         { 'salesforce.segmento': { $regex: '^pyme$',     $options: 'i' } },
    'Micro':        { 'salesforce.segmento': { $regex: '^micro',     $options: 'i' } },
    'Mayores':      { 'salesforce.segmento': { $regex: '^mayores$',  $options: 'i' } },
    'Empresas':     { 'salesforce.segmento': { $regex: '^empresas$', $options: 'i' } },
    'Gobierno':     { 'salesforce.segmento': { $regex: '^gobierno$', $options: 'i' } },
    'Sin segmento': { $or: [
        { 'salesforce.segmento': null },
        { 'salesforce.segmento': { $regex: '^n/a$', $options: 'i' } },
        { 'salesforce.segmento': '' },
    ]},
};

// GET /api/reportes-bd/metricas
router.get('/metricas', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const hace7dias = new Date();
        hace7dias.setDate(hace7dias.getDate() - 7);

        // Fase 1 — queries independientes + RUCs de contactos en paralelo
        const [
            porSegmento,
            sinLineas,
            sinLineasDesgloseRaw,
            porOperadorRaw,
            porEstadoRaw,
            rucsConContactoReciente,
            fichasSinOportunidades,
            fichasEnFunnel,
            rucsConContacto,
            rucsConTelefono,
            rucsConCorreo,
        ] = await Promise.all([
            // 1. Por segmento (normalizado con SEGMENTO_SWITCH)
            EmpresaV2.aggregate([
                { $group: { _id: SEGMENTO_SWITCH, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // 2. Sin líneas — total
            EmpresaV2.countDocuments({ 'osiptel.total': 0 }),

            // 2b. Sin líneas — desglose por segmento
            EmpresaV2.aggregate([
                { $match: { 'osiptel.total': 0 } },
                { $group: { _id: SEGMENTO_SWITCH, count: { $sum: 1 } } },
            ]),

            // 3. Por operador dominante
            EmpresaV2.aggregate([
                {
                    $addFields: {
                        max_lineas: {
                            $max: ['$osiptel.claro', '$osiptel.movistar', '$osiptel.entel', '$osiptel.otros'],
                        },
                    },
                },
                {
                    $addFields: {
                        operador_dominante: {
                            $switch: {
                                branches: [
                                    { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.claro',    '$max_lineas'] }] }, then: 'claro'    },
                                    { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.movistar', '$max_lineas'] }] }, then: 'movistar' },
                                    { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.entel',    '$max_lineas'] }] }, then: 'entel'    },
                                    { case: { $and: [{ $gt: ['$max_lineas', 0] }, { $eq: ['$osiptel.otros',    '$max_lineas'] }] }, then: 'otros'    },
                                ],
                                default: 'sin_operador',
                            },
                        },
                    },
                },
                { $group: { _id: '$operador_dominante', count: { $sum: 1 } } },
            ]),

            // 4. Por estado_base
            EmpresaV2.aggregate([
                { $group: { _id: '$estado_base', count: { $sum: 1 } } },
            ]),

            // 5. RUCs con tipificación reciente (para asignadas sin tipificar)
            FichaGestion.distinct('ruc', {
                activa: true,
                'fechas.fecha_ultimo_contacto': { $gte: hace7dias },
            }),

            // 6. Fichas activas sin oportunidades
            FichaGestion.countDocuments({
                activa: true,
                $or: [{ oportunidades: { $exists: false } }, { oportunidades: { $size: 0 } }],
            }),

            // 7. Fichas activas con oportunidades en funnel
            FichaGestion.countDocuments({
                activa: true,
                oportunidades: {
                    $elemMatch: {
                        estado: { $in: ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada'] },
                    },
                },
            }),

            // 8. RUCs de calidad (colecciones de contactos)
            ContactoAutorizado.distinct('ruc'),
            ContactoAutorizadoDato.distinct('ruc', { tipo: 'telefono' }),
            ContactoAutorizadoDato.distinct('ruc', { tipo: 'correo' }),
        ]);

        // Fase 2 — calidad de datos (depende de los RUCs de fase 1) + asignadasSinTipificar
        const [
            sinContactosTotal,
            sinTelefonoTotal,
            sinCorreoTotal,
            sinContactosDesglose,
            sinTelefonoDesglose,
            sinCorreoDesglose,
            asignadasSinTipificar,
        ] = await Promise.all([
            // empresas sin ningún contacto autorizado
            EmpresaV2.countDocuments({ ruc: { $nin: rucsConContacto } }),
            // empresas con contacto pero sin teléfono
            EmpresaV2.countDocuments({ ruc: { $in: rucsConContacto, $nin: rucsConTelefono } }),
            // empresas con contacto pero sin correo
            EmpresaV2.countDocuments({ ruc: { $in: rucsConContacto, $nin: rucsConCorreo } }),
            // desglose por segmento
            EmpresaV2.aggregate([
                { $match: { ruc: { $nin: rucsConContacto } } },
                { $group: { _id: SEGMENTO_SWITCH, count: { $sum: 1 } } },
            ]),
            EmpresaV2.aggregate([
                { $match: { ruc: { $in: rucsConContacto, $nin: rucsConTelefono } } },
                { $group: { _id: SEGMENTO_SWITCH, count: { $sum: 1 } } },
            ]),
            EmpresaV2.aggregate([
                { $match: { ruc: { $in: rucsConContacto, $nin: rucsConCorreo } } },
                { $group: { _id: SEGMENTO_SWITCH, count: { $sum: 1 } } },
            ]),
            EmpresaV2.countDocuments({
                estado_base: 'asignada',
                ruc: { $nin: rucsConContactoReciente },
            }),
        ]);

        // Normalizar aggregations a objetos planos
        const segmentos = {};
        porSegmento.forEach(s => { segmentos[s._id] = s.count; });

        const operadores = {};
        porOperadorRaw.forEach(o => { operadores[o._id] = o.count; });

        const estados = {};
        porEstadoRaw.forEach(e => { estados[e._id] = e.count; });

        res.json({
            porSegmento: segmentos,
            sinLineas,
            sinLineasDesglose: fmtDesglose(sinLineasDesgloseRaw),
            porOperador: operadores,
            sinContactosAutorizados: sinContactosTotal,
            sinContactosDesglose:    fmtDesglose(sinContactosDesglose),
            sinTelefono:             sinTelefonoTotal,
            sinTelefonoDesglose:     fmtDesglose(sinTelefonoDesglose),
            sinCorreo:               sinCorreoTotal,
            sinCorreoDesglose:       fmtDesglose(sinCorreoDesglose),
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
            const query = REGEX_SEGMENTO[valor] ?? REGEX_SEGMENTO['Sin segmento'];
            const docs = await EmpresaV2.find(query, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinLineas') {
            const baseQuery = { 'osiptel.total': 0 };
            if (valor) {
                const segQuery = REGEX_SEGMENTO[valor] ?? REGEX_SEGMENTO['Sin segmento'];
                Object.assign(baseQuery, segQuery);
            }
            const docs = await EmpresaV2.find(baseQuery, camposEmpresa).lean();
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
            const rucsConContacto = await ContactoAutorizado.distinct('ruc');
            const docs = await EmpresaV2.find({ ruc: { $nin: rucsConContacto } }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinTelefono') {
            const [rucsConContacto, rucsConTelefono] = await Promise.all([
                ContactoAutorizado.distinct('ruc'),
                ContactoAutorizadoDato.distinct('ruc', { tipo: 'telefono' }),
            ]);
            const docs = await EmpresaV2.find({
                ruc: { $in: rucsConContacto, $nin: rucsConTelefono },
            }, camposEmpresa).lean();
            return res.json(docs.map(fmtEmpresa));
        }

        if (tipo === 'sinCorreo') {
            const [rucsConContacto, rucsConCorreo] = await Promise.all([
                ContactoAutorizado.distinct('ruc'),
                ContactoAutorizadoDato.distinct('ruc', { tipo: 'correo' }),
            ]);
            const docs = await EmpresaV2.find({
                ruc: { $in: rucsConContacto, $nin: rucsConCorreo },
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
