const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const xlsx = require('xlsx');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');

const fu = fileUpload({ limits: { fileSize: 100 * 1024 * 1024 } });
const BATCH = 500;

const parseNum = (v) => { try { const n = Number(v); return isNaN(n) ? 0 : n; } catch { return 0; } };
const parseDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
const clean = (v) => { if (!v) return null; const s = String(v).trim(); return ['N/A','#N/A','null','undefined',''].includes(s) ? null : s; };

const bulkUpsert = async (ops) => {
    let insertados = 0, actualizados = 0;
    for (let i = 0; i < ops.length; i += BATCH) {
        const result = await EmpresaV2.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
        insertados  += result.upsertedCount  || 0;
        actualizados += result.modifiedCount || 0;
    }
    return { insertados, actualizados };
};

// ── GET - Buscar con filtros ──────────────────────────────────────────────────
router.get('/buscar', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { busqueda, estado, segmento, estatus_sf, consultor_sf, lineas_min, lineas_max, operador, page = 1, limit = 50 } = req.query;
        const filtro = {};
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { 'sunat.razon_social': { $regex: busqueda, $options: 'i' } },
        ];
        if (estado)       filtro.estado_base = estado;
        if (segmento)     filtro['salesforce.segmento'] = { $regex: segmento, $options: 'i' };
        if (estatus_sf)   filtro['salesforce.estatus'] = { $regex: estatus_sf, $options: 'i' };
        if (consultor_sf) filtro['salesforce.consultor'] = { $regex: consultor_sf, $options: 'i' };
        if (operador)     filtro[`osiptel.${operador}`] = { $gt: 0 };
        if (lineas_min || lineas_max) {
            filtro['osiptel.total'] = {};
            if (lineas_min) filtro['osiptel.total'].$gte = Number(lineas_min);
            if (lineas_max) filtro['osiptel.total'].$lte = Number(lineas_max);
        }
        const skip = (Number(page) - 1) * Number(limit);
        const total = await EmpresaV2.countDocuments(filtro);
        const empresas = await EmpresaV2.find(filtro)
            .populate('asignacion.id_asesor', 'nombre_user dni_user')
            .skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
        res.json({ empresas, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar', error: error.message });
    }
});

// ── POST - Importar SUNAT ─────────────────────────────────────────────────────
router.post('/importar/sunat', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        const ops = [];
        for (const f of filas) {
            const ruc = clean(f['ruc']);
            if (!ruc) continue;
            ops.push({
                updateOne: {
                    filter: { ruc },
                    update: { $set: {
                        sunat: {
                            razon_social: clean(f['razon_social']),
                            estado:       clean(f['estado']),
                            condicion:    clean(f['condicion']),
                            direccion:    clean(f['direccion']),
                            actividad:    clean(f['actividad']),
                        }
                    }},
                    upsert: true,
                }
            });
        }

        const { insertados, actualizados } = await bulkUpsert(ops);
        res.json({ message: 'SUNAT importado', insertados, actualizados, errores: [] });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar OSIPTEL ───────────────────────────────────────────────────
router.post('/importar/osiptel', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        const ops = [];
        for (const f of filas) {
            const ruc = clean(f['ruc']);
            if (!ruc) continue;
            const claro    = parseNum(f['claro']    ?? f['L_Claro']);
            const movistar = parseNum(f['movistar'] ?? f['L_Movistar']);
            const entel    = parseNum(f['entel']    ?? f['L_Entel']);
            const otros    = parseNum(f['otros']    ?? f['L_Otros']);
            ops.push({
                updateOne: {
                    filter: { ruc },
                    update: { $set: { osiptel: { claro, movistar, entel, otros, total: claro + movistar + entel + otros } } },
                    upsert: true,
                }
            });
        }

        const { insertados, actualizados } = await bulkUpsert(ops);
        res.json({ message: 'OSIPTEL importado', insertados, actualizados, errores: [] });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar SALESFORCE ────────────────────────────────────────────────
router.post('/importar/salesforce', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', cellDates: true, raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        const ops = [];
        for (const f of filas) {
            const ruc = clean(f['ruc']);
            if (!ruc) continue;
            ops.push({
                updateOne: {
                    filter: { ruc },
                    update: { $set: { salesforce: {
                        segmento:           clean(f['segmento']            ?? f['SF_segmento']),
                        facturacion:        parseNum(f['facturacion']       ?? f['SF_facturacion_servicios']),
                        grupo_economico:    clean(f['grupo_economico']      ?? f['SF_grupo_economico']),
                        estatus:            clean(f['estatus']              ?? f['SF_Estatus']),
                        consultor:          clean(f['consultor']            ?? f['SF_Consultor']),
                        fecha_asignacion:   parseDate(f['fecha_asignacion'] ?? f['SF_Ultima_Fecha_Asignacion']),
                        tipo_cliente:       clean(f['tipo_cliente']         ?? f['SF_Tipo_Cliente']),
                        sustento:           String(f['sustento'] ?? f['SF_Tiene_Sustento_Adjunto'] ?? '').toLowerCase() === 'si',
                        fecha_sustento:     parseDate(f['fecha_sustento']   ?? f['SF_Fecha_Sustento_Adjunto']),
                        detalle_servicios:  clean(f['detalle_servicios']    ?? f['SF_Detalle_Servicios']),
                        oportunidad_ganada: String(f['oportunidad_ganada']  ?? f['SF_Oportunidad_Ganada'] ?? '').toLowerCase() === 'si',
                        fecha_oportunidad:  parseDate(f['fecha_oportunidad'] ?? f['SF_Fecha_Oportunidad']),
                    }}},
                    upsert: true,
                }
            });
        }

        const { insertados, actualizados } = await bulkUpsert(ops);
        res.json({ message: 'Salesforce importado', insertados, actualizados, errores: [] });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar CONTACTOS AUTORIZADOS (redirige al nuevo endpoint) ────────
router.post('/importar/contactos-autorizados', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    res.status(301).json({ message: 'Usa el endpoint /api/contactos/autorizados/importar' });
});

// ── POST - Importar CONTACTOS RRLL (redirige al nuevo endpoint) ───────────────
router.post('/importar/contactos-rrll', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    res.status(301).json({ message: 'Usa el endpoint /api/contactos/rrll/importar' });
});

// ── GET - Exportar ────────────────────────────────────────────────────────────
router.get('/exportar', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { segmento, estatus_sf, consultor_sf, operador, lineas_min, lineas_max, estado } = req.query;
        const filtro = {};
        if (estado)       filtro.estado_base = estado;
        if (segmento)     filtro['salesforce.segmento'] = { $regex: segmento, $options: 'i' };
        if (estatus_sf)   filtro['salesforce.estatus'] = { $regex: estatus_sf, $options: 'i' };
        if (consultor_sf) filtro['salesforce.consultor'] = { $regex: consultor_sf, $options: 'i' };
        if (operador)     filtro[`osiptel.${operador}`] = { $gt: 0 };
        if (lineas_min || lineas_max) {
            filtro['osiptel.total'] = {};
            if (lineas_min) filtro['osiptel.total'].$gte = Number(lineas_min);
            if (lineas_max) filtro['osiptel.total'].$lte = Number(lineas_max);
        }
        const empresas = await EmpresaV2.find(filtro).populate('asignacion.id_asesor', 'nombre_user').limit(100000);
        res.json({ empresas, total: empresas.length });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});
// POST - Asignación masiva empresas_v2
router.post('/asignar-masivo', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const {
            id_asesor, cantidad, segmento,
            operadores,      // array: ['entel','movistar']
            lineas_min_op,   // número mínimo de líneas por cada operador seleccionado
            aplicar_reglas_sf // boolean — solo para Mayores
        } = req.body;

        if (!id_asesor || !cantidad) {
            return res.status(400).json({ message: 'id_asesor y cantidad son requeridos' });
        }

        const hoy = new Date();

        const filtro = {
            estado_base: 'disponible',
            'asignacion.id_asesor': null,
        };

        // Filtro segmento
        if (segmento) filtro['salesforce.segmento'] = { $regex: segmento, $options: 'i' };

        // Filtro operadores — cada operador seleccionado debe tener al menos lineas_min_op líneas
        if (operadores?.length > 0) {
            const minLineas = Number(lineas_min_op) || 1;
            filtro.$and = operadores.map(op => ({
                [`osiptel.${op}`]: { $gte: minLineas }
            }));
        }

        // Reglas Salesforce para Mayores
        if (aplicar_reglas_sf) {
            const hace30dias = new Date(hoy); hace30dias.setDate(hoy.getDate() - 30);
            const hace3meses = new Date(hoy); hace3meses.setMonth(hoy.getMonth() - 3);

            // Excluir caso 4: sustento=true Y oportunidad_ganada=true → BLINDADA
            filtro.$nor = [
                { 'salesforce.sustento': true, 'salesforce.oportunidad_ganada': true }
            ];

            // Casos 2 y 3: sustento O oportunidad → esperar 3 meses desde fecha_asignacion
            // Solo asignables si han pasado 3 meses o si no tienen ni sustento ni oportunidad
            filtro.$or = [
                // Caso 1: sin sustento y sin oportunidad, más de 30 días desde asignación SF
                {
                    'salesforce.sustento': false,
                    'salesforce.oportunidad_ganada': false,
                    $or: [
                        { 'salesforce.fecha_asignacion': { $lte: hace30dias } },
                        { 'salesforce.fecha_asignacion': null },
                    ]
                },
                // Caso 2: con sustento, sin oportunidad, más de 3 meses
                {
                    'salesforce.sustento': true,
                    'salesforce.oportunidad_ganada': false,
                    'salesforce.fecha_asignacion': { $lte: hace3meses }
                },
                // Caso 3: sin sustento, con oportunidad, más de 3 meses
                {
                    'salesforce.sustento': false,
                    'salesforce.oportunidad_ganada': true,
                    'salesforce.fecha_asignacion': { $lte: hace3meses }
                },
            ];
        }

        // Obtener empresas elegibles
        const empresas = await EmpresaV2.find(filtro).limit(Number(cantidad));

        if (empresas.length === 0) {
            return res.json({ message: 'No se encontraron empresas disponibles con esos filtros', total: 0 });
        }

        // Asignar
        const ids = empresas.map(e => e._id);
        await EmpresaV2.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    'asignacion.id_asesor': id_asesor,
                    'asignacion.fecha_asignada': hoy,
                    'asignacion.fecha_desasignacion': null,
                    estado_base: 'asignada',
                }
            }
        );

        res.json({ message: `${empresas.length} empresas asignadas correctamente`, total: empresas.length });
    } catch (error) {
        res.status(500).json({ message: 'Error en asignación masiva', error: error.message });
    }
});



module.exports = router;