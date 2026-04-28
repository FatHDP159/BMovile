const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const xlsx = require('xlsx');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');

const fu = fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } });

const parseNum = (v) => { try { const n = Number(v); return isNaN(n) ? 0 : n; } catch { return 0; } };
const parseDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
const clean = (v) => { if (!v) return null; const s = String(v).trim(); return ['N/A','#N/A','null','undefined',''].includes(s) ? null : s; };

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
            .skip(skip).limit(Number(limit))
            .sort({ createdAt: -1 });

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

        let insertados = 0, actualizados = 0, errores = [];

        for (const [i, f] of filas.entries()) {
            const ruc = clean(f['ruc']);
            if (!ruc) { errores.push({ fila: i+2, error: 'RUC vacío' }); continue; }
            try {
                const existe = await EmpresaV2.findOne({ ruc });
                const sunat = {
                    razon_social: clean(f['razon_social']),
                    estado:       clean(f['estado']),
                    condicion:    clean(f['condicion']),
                    direccion:    clean(f['direccion']),
                    actividad:    clean(f['actividad']),
                };
                if (existe) {
                    await EmpresaV2.updateOne({ ruc }, { $set: { sunat } });
                    actualizados++;
                } else {
                    await EmpresaV2.create({ ruc, sunat });
                    insertados++;
                }
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
        }
        res.json({ message: 'SUNAT importado', insertados, actualizados, errores: errores.slice(0,20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar OSIPTEL ───────────────────────────────────────────────────
router.post('/importar/osiptel', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let insertados = 0, actualizados = 0, errores = [];

        for (const [i, f] of filas.entries()) {
            const ruc = clean(f['ruc']);
            if (!ruc) { errores.push({ fila: i+2, error: 'RUC vacío' }); continue; }
            try {
                const claro    = parseNum(f['claro']    ?? f['L_Claro']);
                const movistar = parseNum(f['movistar'] ?? f['L_Movistar']);
                const entel    = parseNum(f['entel']    ?? f['L_Entel']);
                const otros    = parseNum(f['otros']    ?? f['L_Otros']);
                const osiptel  = { claro, movistar, entel, otros, total: claro + movistar + entel + otros };

                const existe = await EmpresaV2.findOne({ ruc });
                if (existe) {
                    await EmpresaV2.updateOne({ ruc }, { $set: { osiptel } });
                    actualizados++;
                } else {
                    await EmpresaV2.create({ ruc, osiptel });
                    insertados++;
                }
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
        }
        res.json({ message: 'OSIPTEL importado', insertados, actualizados, errores: errores.slice(0,20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar SALESFORCE ────────────────────────────────────────────────
router.post('/importar/salesforce', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', cellDates: true, raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let insertados = 0, actualizados = 0, errores = [];

        for (const [i, f] of filas.entries()) {
            const ruc = clean(f['ruc']);
            if (!ruc) { errores.push({ fila: i+2, error: 'RUC vacío' }); continue; }
            try {
                const salesforce = {
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
                };

                const existe = await EmpresaV2.findOne({ ruc });
                if (existe) {
                    await EmpresaV2.updateOne({ ruc }, { $set: { salesforce } });
                    actualizados++;
                } else {
                    await EmpresaV2.create({ ruc, salesforce });
                    insertados++;
                }
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
        }
        res.json({ message: 'Salesforce importado', insertados, actualizados, errores: errores.slice(0,20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar CONTACTOS AUTORIZADOS ─────────────────────────────────────
router.post('/importar/contactos-autorizados', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let procesados = 0, errores = [];

        for (const [i, f] of filas.entries()) {
            const ruc = clean(f['ruc']);
            if (!ruc) { errores.push({ fila: i+2, error: 'RUC vacío' }); continue; }
            try {
                const contacto = {
                    nombre: clean(f['nombre']),
                    dni:    clean(f['dni']),
                    tel:    clean(f['tel']),
                    correo: clean(f['correo']),
                };
                if (!contacto.nombre) { errores.push({ fila: i+2, error: 'Nombre vacío' }); continue; }

                const empresa = await EmpresaV2.findOne({ ruc });
                if (!empresa) {
                    await EmpresaV2.create({ ruc, contactos_autorizados: [contacto] });
                } else {
                    const existe = empresa.contactos_autorizados.some(c =>
                        c.nombre?.toLowerCase() === contacto.nombre?.toLowerCase()
                    );
                    if (!existe) {
                        await EmpresaV2.updateOne({ ruc }, { $push: { contactos_autorizados: contacto } });
                    } else {
                        await EmpresaV2.updateOne(
                            { ruc, 'contactos_autorizados.nombre': contacto.nombre },
                            { $set: { 'contactos_autorizados.$': contacto } }
                        );
                    }
                }
                procesados++;
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
        }
        res.json({ message: 'Contactos autorizados importados', procesados, errores: errores.slice(0,20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar CONTACTOS RRLL ────────────────────────────────────────────
router.post('/importar/contactos-rrll', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });
        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let procesados = 0, errores = [];

        for (const [i, f] of filas.entries()) {
            const ruc = clean(f['ruc']);
            if (!ruc) { errores.push({ fila: i+2, error: 'RUC vacío' }); continue; }
            try {
                const contacto = {
                    tipo_doc: clean(f['tipo_doc'] ?? f['TIPO_DOC_RRLL']),
                    nr_doc:   clean(f['nr_doc']   ?? f['NR_DOC_RRLL']),
                    nombre:   clean(f['nombre']   ?? f['NOMBRE_RRLL']),
                    cargo:    clean(f['cargo']    ?? f['CARGO_RRLL']),
                    tel:      clean(f['tel']),
                    correo:   clean(f['correo']),
                };
                if (!contacto.nombre) { errores.push({ fila: i+2, error: 'Nombre vacío' }); continue; }

                const empresa = await EmpresaV2.findOne({ ruc });
                if (!empresa) {
                    await EmpresaV2.create({ ruc, contactos_rrll: [contacto] });
                } else {
                    const existe = empresa.contactos_rrll.some(c =>
                        c.nombre?.toLowerCase() === contacto.nombre?.toLowerCase()
                    );
                    if (!existe) {
                        await EmpresaV2.updateOne({ ruc }, { $push: { contactos_rrll: contacto } });
                    } else {
                        await EmpresaV2.updateOne(
                            { ruc, 'contactos_rrll.nombre': contacto.nombre },
                            { $set: { 'contactos_rrll.$': contacto } }
                        );
                    }
                }
                procesados++;
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
        }
        res.json({ message: 'Contactos RRLL importados', procesados, errores: errores.slice(0,20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── GET - Exportar ────────────────────────────────────────────────────────────
router.get('/exportar', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        const { tabla = 'completo', segmento, estatus_sf, consultor_sf, operador, lineas_min, lineas_max, estado } = req.query;

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

        res.json({ empresas, total: empresas.length, tabla });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

module.exports = router;