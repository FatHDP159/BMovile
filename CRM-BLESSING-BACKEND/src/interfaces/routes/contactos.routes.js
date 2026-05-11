const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const xlsx = require('xlsx');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const ContactoAutorizado = require('../../domain/contactos/contactoAutorizado.model.js');
const ContactoAutorizadoDato = require('../../domain/contactos/contactoAutorizadoDato.model.js');
const ContactoRRLL = require('../../domain/contactos/contactoRRLL.model.js');
const ContactoRRLLDato = require('../../domain/contactos/contactoRRLLDato.model.js');

const fu = fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } });

const clean = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return ['N/A', '#N/A', 'null', 'undefined', '0', ''].includes(s) ? null : s;
};

const CHUNK_SIZE = 500;

// ── POST - Importar Contactos Autorizados ─────────────────────────────────
router.post('/autorizados/importar', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });

        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let insertados = 0, actualizados = 0, errores = [];

        // Procesar en chunks de 500
        for (let chunk = 0; chunk < filas.length; chunk += CHUNK_SIZE) {
            const lote = filas.slice(chunk, chunk + CHUNK_SIZE);

            // 1. bulkWrite contactos
            const opsContactos = [];
            const filasValidas = [];

            for (const [i, f] of lote.entries()) {
                const ruc    = clean(f['ruc']);
                const nombre = clean(f['nombre']);
                if (!ruc || !nombre) {
                    errores.push({ fila: chunk + i + 2, error: 'ruc y nombre son obligatorios' });
                    continue;
                }
                filasValidas.push({ f, ruc, nombre });
                opsContactos.push({
                    updateOne: {
                        filter: { ruc, nombre },
                        update: {
                            $set: { cargo: clean(f['cargo']), dni: clean(f['dni']) },
                            $setOnInsert: { ruc, nombre },
                        },
                        upsert: true,
                    }
                });
            }

            if (opsContactos.length === 0) continue;
            const resContactos = await ContactoAutorizado.bulkWrite(opsContactos, { ordered: false });
            insertados += resContactos.upsertedCount || 0;
            actualizados += resContactos.modifiedCount || 0;

            // 2. Obtener _ids de los contactos del lote
            const rucsNombres = filasValidas.map(({ ruc, nombre }) => ({ ruc, nombre }));
            const contactosDB = await ContactoAutorizado.find({
                $or: rucsNombres
            }).select('_id ruc nombre');

            // Mapa ruc+nombre → _id
            const mapaId = {};
            for (const c of contactosDB) {
                mapaId[`${c.ruc}__${c.nombre}`] = c._id;
            }

            // 3. bulkWrite datos (tel/correo)
            const opsDatos = [];
            for (const { f, ruc, nombre } of filasValidas) {
                const id_contacto = mapaId[`${ruc}__${nombre}`];
                if (!id_contacto) continue;

                for (let i = 1; i <= 5; i++) {
                    const val = clean(f[`tel_${i}`]);
                    if (val) opsDatos.push({
                        updateOne: {
                            filter: { id_contacto, tipo: 'telefono', valor: val },
                            update: { $setOnInsert: { id_contacto, ruc, tipo: 'telefono', valor: val } },
                            upsert: true,
                        }
                    });
                }
                for (let i = 1; i <= 3; i++) {
                    const val = clean(f[`correo_${i}`]);
                    if (val) opsDatos.push({
                        updateOne: {
                            filter: { id_contacto, tipo: 'correo', valor: val },
                            update: { $setOnInsert: { id_contacto, ruc, tipo: 'correo', valor: val } },
                            upsert: true,
                        }
                    });
                }
            }

            if (opsDatos.length > 0) {
                await ContactoAutorizadoDato.bulkWrite(opsDatos, { ordered: false });
            }
        }

        res.json({ message: 'Contactos autorizados importados', insertados, actualizados, errores: errores.slice(0, 20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Importar Contactos RRLL ────────────────────────────────────────
router.post('/rrll/importar', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });

        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let insertados = 0, actualizados = 0, errores = [];

        for (let chunk = 0; chunk < filas.length; chunk += CHUNK_SIZE) {
            const lote = filas.slice(chunk, chunk + CHUNK_SIZE);

            const opsContactos = [];
            const filasValidas = [];

            for (const [i, f] of lote.entries()) {
                const ruc    = clean(f['ruc']);
                const nombre = clean(f['nombre'] ?? f['NOMBRE_RRLL']);
                if (!ruc || !nombre) {
                    errores.push({ fila: chunk + i + 2, error: 'ruc y nombre son obligatorios' });
                    continue;
                }
                filasValidas.push({ f, ruc, nombre });
                opsContactos.push({
                    updateOne: {
                        filter: { ruc, nombre },
                        update: {
                            $set: {
                                cargo:    clean(f['cargo']    ?? f['CARGO_RRLL']),
                                tipo_doc: clean(f['tipo_doc'] ?? f['TIPO_DOC_RRLL']),
                                nr_doc:   clean(f['nr_doc']   ?? f['NR_DOC_RRLL']),
                            },
                            $setOnInsert: { ruc, nombre },
                        },
                        upsert: true,
                    }
                });
            }

            if (opsContactos.length === 0) continue;
            const resContactos = await ContactoRRLL.bulkWrite(opsContactos, { ordered: false });
            insertados += resContactos.upsertedCount || 0;
            actualizados += resContactos.modifiedCount || 0;

            const rucsNombres = filasValidas.map(({ ruc, nombre }) => ({ ruc, nombre }));
            const contactosDB = await ContactoRRLL.find({ $or: rucsNombres }).select('_id ruc nombre');

            const mapaId = {};
            for (const c of contactosDB) {
                mapaId[`${c.ruc}__${c.nombre}`] = c._id;
            }

            const opsDatos = [];
            for (const { f, ruc, nombre } of filasValidas) {
                const id_contacto = mapaId[`${ruc}__${nombre}`];
                if (!id_contacto) continue;

                for (let i = 1; i <= 5; i++) {
                    const val = clean(f[`tel_${i}`]);
                    if (val) opsDatos.push({
                        updateOne: {
                            filter: { id_contacto, tipo: 'telefono', valor: val },
                            update: { $setOnInsert: { id_contacto, ruc, tipo: 'telefono', valor: val } },
                            upsert: true,
                        }
                    });
                }
                for (let i = 1; i <= 3; i++) {
                    const val = clean(f[`correo_${i}`]);
                    if (val) opsDatos.push({
                        updateOne: {
                            filter: { id_contacto, tipo: 'correo', valor: val },
                            update: { $setOnInsert: { id_contacto, ruc, tipo: 'correo', valor: val } },
                            upsert: true,
                        }
                    });
                }
            }

            if (opsDatos.length > 0) {
                await ContactoRRLLDato.bulkWrite(opsDatos, { ordered: false });
            }
        }

        res.json({ message: 'Contactos RRLL importados', insertados, actualizados, errores: errores.slice(0, 20) });
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── GET - Obtener contactos autorizados por RUC ───────────────────────────
router.get('/autorizados/:ruc', verifyToken, async (req, res) => {
    try {
        const contactos = await ContactoAutorizado.find({ ruc: req.params.ruc });
        const resultado = await Promise.all(contactos.map(async (c) => {
            const datos = await ContactoAutorizadoDato.find({ id_contacto: c._id });
            return {
                ...c.toObject(),
                telefonos: datos.filter(d => d.tipo === 'telefono').map(d => d.valor),
                correos:   datos.filter(d => d.tipo === 'correo').map(d => d.valor),
            };
        }));
        res.json(resultado);
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── GET - Obtener contactos RRLL por RUC ──────────────────────────────────
router.get('/rrll/:ruc', verifyToken, async (req, res) => {
    try {
        const contactos = await ContactoRRLL.find({ ruc: req.params.ruc });
        const resultado = await Promise.all(contactos.map(async (c) => {
            const datos = await ContactoRRLLDato.find({ id_contacto: c._id });
            return {
                ...c.toObject(),
                telefonos: datos.filter(d => d.tipo === 'telefono').map(d => d.valor),
                correos:   datos.filter(d => d.tipo === 'correo').map(d => d.valor),
            };
        }));
        res.json(resultado);
    } catch (e) { res.status(500).json({ message: 'Error', error: e.message }); }
});

// ── POST - Agregar contacto autorizado individual ─────────────────────────
router.post('/autorizados/agregar', verifyToken, async (req, res) => {
    try {
        const { ruc, nombre, cargo, dni, telefonos, correos } = req.body;
        if (!ruc || !nombre) return res.status(400).json({ message: 'ruc y nombre son obligatorios' });

        await ContactoAutorizado.findOneAndUpdate(
            { ruc, nombre },
            { $set: { cargo: cargo || null, dni: dni || null }, $setOnInsert: { ruc, nombre } },
            { upsert: true, new: true }
        );

        const contacto = await ContactoAutorizado.findOne({ ruc, nombre });

        if (telefonos?.length) {
            for (const val of telefonos) {
                if (!val.trim()) continue;
                await ContactoAutorizadoDato.updateOne(
                    { id_contacto: contacto._id, tipo: 'telefono', valor: val.trim() },
                    { $setOnInsert: { id_contacto: contacto._id, ruc, tipo: 'telefono', valor: val.trim() } },
                    { upsert: true }
                );
            }
        }

        if (correos?.length) {
            for (const val of correos) {
                if (!val.trim()) continue;
                await ContactoAutorizadoDato.updateOne(
                    { id_contacto: contacto._id, tipo: 'correo', valor: val.trim() },
                    { $setOnInsert: { id_contacto: contacto._id, ruc, tipo: 'correo', valor: val.trim() } },
                    { upsert: true }
                );
            }
        }

        res.json({ message: 'Contacto guardado correctamente', contacto });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar contacto', error: error.message });
    }
});

module.exports = router;