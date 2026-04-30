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
    if (!v) return null;
    const s = String(v).trim();
    return ['N/A','#N/A','null','undefined','0',''].includes(s) ? null : s;
};

// Helper — importar datos (tel/correo) de un contacto
const importarDatos = async (ModelDato, id_contacto, ruc, fila, maxTel = 5, maxCorreo = 3) => {
    for (let i = 1; i <= maxTel; i++) {
        const val = clean(fila[`tel_${i}`]);
        if (val) {
            await ModelDato.updateOne(
                { id_contacto, tipo: 'telefono', valor: val },
                { $setOnInsert: { id_contacto, ruc, tipo: 'telefono', valor: val } },
                { upsert: true }
            );
        }
    }
    for (let i = 1; i <= maxCorreo; i++) {
        const val = clean(fila[`correo_${i}`]);
        if (val) {
            await ModelDato.updateOne(
                { id_contacto, tipo: 'correo', valor: val },
                { $setOnInsert: { id_contacto, ruc, tipo: 'correo', valor: val } },
                { upsert: true }
            );
        }
    }
};

// ── POST - Importar Contactos Autorizados ─────────────────────────────────
router.post('/autorizados/importar', verifyToken, verifyRole('sistemas'), fu, async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });

        const wb = xlsx.read(req.files.archivo.data, { type: 'buffer', raw: false });
        const filas = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, blankrows: false });

        let insertados = 0, actualizados = 0, errores = [];

        for (const [i, f] of filas.entries()) {
            const ruc    = clean(f['ruc']);
            const nombre = clean(f['nombre']);
            if (!ruc || !nombre) { errores.push({ fila: i+2, error: 'ruc y nombre son obligatorios' }); continue; }

            try {
                const datos = {
                    cargo: clean(f['cargo']),
                    dni:   clean(f['dni']),
                };

                // Upsert contacto por ruc + nombre
                const result = await ContactoAutorizado.findOneAndUpdate(
                    { ruc, nombre },
                    { $set: datos, $setOnInsert: { ruc, nombre } },
                    { upsert: true, new: true, rawResult: true }
                );

                if (result.lastErrorObject?.upserted) insertados++;
                else actualizados++;

                const contacto = result.value;
                await importarDatos(ContactoAutorizadoDato, contacto._id, ruc, f);
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
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

        for (const [i, f] of filas.entries()) {
            const ruc    = clean(f['ruc']);
            const nombre = clean(f['nombre'] ?? f['NOMBRE_RRLL']);
            if (!ruc || !nombre) { errores.push({ fila: i+2, error: 'ruc y nombre son obligatorios' }); continue; }

            try {
                const datos = {
                    cargo:    clean(f['cargo']    ?? f['CARGO_RRLL']),
                    tipo_doc: clean(f['tipo_doc'] ?? f['TIPO_DOC_RRLL']),
                    nr_doc:   clean(f['nr_doc']   ?? f['NR_DOC_RRLL']),
                };

                const result = await ContactoRRLL.findOneAndUpdate(
                    { ruc, nombre },
                    { $set: datos, $setOnInsert: { ruc, nombre } },
                    { upsert: true, new: true, rawResult: true }
                );

                if (result.lastErrorObject?.upserted) insertados++;
                else actualizados++;

                const contacto = result.value;
                await importarDatos(ContactoRRLLDato, contacto._id, ruc, f);
            } catch (err) { errores.push({ fila: i+2, error: err.message }); }
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

module.exports = router;