const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const FichaGestion = require('../../domain/fichaGestion/fichaGestion.model.js');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const ContactoAutorizado = require('../../domain/contactos/contactoAutorizado.model.js');
const ContactoAutorizadoDato = require('../../domain/contactos/contactoAutorizadoDato.model.js');

const fmtFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d)) return '';
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const limpio = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D2558' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
    },
};

const cellStyle = {
    alignment: { vertical: 'middle', wrapText: false },
    border: {
        top:    { style: 'thin', color: { argb: 'FFE8E8E8' } },
        bottom: { style: 'thin', color: { argb: 'FFE8E8E8' } },
        left:   { style: 'thin', color: { argb: 'FFE8E8E8' } },
        right:  { style: 'thin', color: { argb: 'FFE8E8E8' } },
    },
};

const aplicarEstiloFila = (row, isEven) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.style = {
            ...cellStyle,
            fill: isEven
                ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F6FA' } }
                : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
        };
    });
};

const setupHoja = (ws, headers, colWidths) => {
    ws.addRow(headers);
    const headerRow = ws.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.style = headerStyle;
    });
    colWidths.forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
};

// GET /api/export-funnel
router.get('/', verifyToken, verifyRole('supervisor', 'sistemas'), async (req, res) => {
    try {
        const { busqueda, estados, segmento, lineas_min, lineas_max, asesor } = req.query;

        // ── Cargar fichas del funnel ──────────────────────────────────────────
        const filtro = { activa: true, 'oportunidades.0': { $exists: true } };
        if (asesor) filtro['asesor.id_asesor'] = asesor;
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { razon_social: { $regex: busqueda, $options: 'i' } },
        ];
        if (segmento) filtro.segmento = segmento;
        if (lineas_min || lineas_max) {
            filtro.total_lineas = {};
            if (lineas_min) filtro.total_lineas.$gte = Number(lineas_min);
            if (lineas_max) filtro.total_lineas.$lte = Number(lineas_max);
        }
        if (estados) {
            const arr = Array.isArray(estados) ? estados : estados.split(',').filter(Boolean);
            if (arr.length > 0) filtro['oportunidades.estado'] = { $in: arr };
        }

        const fichas = await FichaGestion.find(filtro)
            .populate('asesor.id_asesor', 'nombre_user')
            .sort({ 'fechas.fecha_ultimo_contacto': -1 })
            .lean();

        if (fichas.length === 0) {
            return res.status(404).json({ message: 'No hay datos para exportar' });
        }

        // ── Cargar empresas_v2 ────────────────────────────────────────────────
        const rucs = [...new Set(fichas.map(f => f.ruc))];
        const empresas = await EmpresaV2.find({ ruc: { $in: rucs } }).lean();
        const empresaMap = {};
        empresas.forEach(e => { empresaMap[e.ruc] = e; });

        // ── Cargar contactos autorizados ──────────────────────────────────────
        const contactosAuth = await ContactoAutorizado.find({ ruc: { $in: rucs } }).lean();
        const datosContactos = await ContactoAutorizadoDato.find({ id_contacto: { $in: contactosAuth.map(c => c._id) } }).lean();

        const contactosMap = {};
        contactosAuth.forEach(c => {
            if (!contactosMap[c.ruc]) contactosMap[c.ruc] = [];
            const tels = datosContactos.filter(d => d.id_contacto?.toString() === c._id?.toString() && d.tipo === 'telefono').map(d => d.valor);
            const correos = datosContactos.filter(d => d.id_contacto?.toString() === c._id?.toString() && d.tipo === 'correo').map(d => d.valor);
            contactosMap[c.ruc].push({ ...c, telefonos: tels, correos });
        });

        // ── Crear workbook ────────────────────────────────────────────────────
        const wb = new ExcelJS.Workbook();
        wb.creator = 'CRM B-Movile';
        wb.created = new Date();

        // ════════════════════════════════════════════════════════════════════
        // HOJA 1 — FUNNEL
        // ════════════════════════════════════════════════════════════════════
        const ws1 = wb.addWorksheet('Funnel');
        const h1 = [
            'RUC', 'Razón Social', 'Asesor', 'Segmento', 'Líneas',
            'Último Contacto', 'Estado Oportunidad', 'Producto',
            'Cantidad', 'Cargo Fijo (S/.)', 'Sustento', 'Fecha Cierre Esp.',
            'Entel Neg.', 'Claro Neg.', 'Movistar Neg.', 'Otros Neg.', 'Total Neg.',
            'Contacto Funnel - Nombre', 'Contacto Funnel - Teléfono', 'Contacto Funnel - DNI',
            'Comentario',
        ];
        const w1 = [14, 40, 20, 12, 8, 16, 20, 18, 10, 14, 10, 16, 10, 10, 12, 10, 10, 28, 16, 12, 35];
        setupHoja(ws1, h1, w1);

        fichas.forEach((f, idx) => {
            const asesorNombre = f.asesor?.id_asesor?.nombre_user || '';
            const ultimaInter = f.interacciones?.length > 0 ? f.interacciones[f.interacciones.length - 1] : null;
            const opos = f.oportunidades?.length > 0 ? f.oportunidades : [null];

            opos.forEach(opo => {
                const row = ws1.addRow([
                    limpio(f.ruc),
                    limpio(f.razon_social),
                    limpio(asesorNombre),
                    limpio(f.segmento),
                    f.total_lineas || 0,
                    fmtFecha(f.fechas?.fecha_ultimo_contacto),
                    limpio(opo?.estado),
                    limpio(opo?.producto),
                    opo?.cantidad ?? '',
                    opo?.cargo_fijo ?? '',
                    opo ? (opo.sustento ? 'Sí' : 'No') : '',
                    fmtFecha(opo?.fecha_cierre_esperada),
                    opo?.operadores?.entel ?? 0,
                    opo?.operadores?.claro ?? 0,
                    opo?.operadores?.movistar ?? 0,
                    opo?.operadores?.otros ?? 0,
                    opo?.operadores?.total ?? 0,
                    limpio(opo?.contacto?.nombre),
                    limpio(opo?.contacto?.telefono),
                    limpio(opo?.contacto?.dni),
                    limpio(ultimaInter?.comentario),
                ]);
                aplicarEstiloFila(row, idx % 2 === 0);
            });
        });

        // ════════════════════════════════════════════════════════════════════
        // HOJA 2 — SUNAT
        // ════════════════════════════════════════════════════════════════════
        const ws2 = wb.addWorksheet('SUNAT');
        const h2 = ['RUC', 'Razón Social', 'Estado SUNAT', 'Condición', 'Dirección', 'Actividad Económica'];
        const w2 = [14, 45, 16, 16, 55, 40];
        setupHoja(ws2, h2, w2);

        rucs.forEach((ruc, idx) => {
            const e = empresaMap[ruc];
            const row = ws2.addRow([
                limpio(ruc),
                limpio(e?.sunat?.razon_social),
                limpio(e?.sunat?.estado),
                limpio(e?.sunat?.condicion),
                limpio(e?.sunat?.direccion),
                limpio(e?.sunat?.actividad),
            ]);
            aplicarEstiloFila(row, idx % 2 === 0);
        });

        // ════════════════════════════════════════════════════════════════════
        // HOJA 3 — SALESFORCE
        // ════════════════════════════════════════════════════════════════════
        const ws3 = wb.addWorksheet('Salesforce');
        const h3 = [
            'RUC', 'Razón Social', 'Segmento SF', 'Consultor SF',
            'Fecha Asignación SF', 'Sustento SF', 'Estatus SF',
            'Tipo Cliente', 'Facturación', 'Grupo Económico',
            'Detalle Servicios', 'Oportunidad Ganada', 'Fecha Oportunidad',
        ];
        const w3 = [14, 40, 14, 25, 18, 12, 18, 16, 14, 25, 30, 18, 18];
        setupHoja(ws3, h3, w3);

        rucs.forEach((ruc, idx) => {
            const e = empresaMap[ruc];
            const sf = e?.salesforce || {};
            const row = ws3.addRow([
                limpio(ruc),
                limpio(e?.sunat?.razon_social),
                limpio(sf.segmento),
                limpio(sf.consultor),
                fmtFecha(sf.fecha_asignacion),
                sf.sustento ? 'Sí' : 'No',
                limpio(sf.estatus),
                limpio(sf.tipo_cliente),
                sf.facturacion ?? '',
                limpio(sf.grupo_economico),
                limpio(sf.detalle_servicios),
                sf.oportunidad_ganada ? 'Sí' : 'No',
                fmtFecha(sf.fecha_oportunidad),
            ]);
            aplicarEstiloFila(row, idx % 2 === 0);
        });

        // ════════════════════════════════════════════════════════════════════
        // HOJA 4 — OSIPTEL
        // ════════════════════════════════════════════════════════════════════
        const ws4 = wb.addWorksheet('OSIPTEL - Líneas');
        const h4 = ['RUC', 'Razón Social', 'Entel', 'Claro', 'Movistar', 'Otros', 'Total Líneas'];
        const w4 = [14, 45, 10, 10, 12, 10, 14];
        setupHoja(ws4, h4, w4);

        rucs.forEach((ruc, idx) => {
            const e = empresaMap[ruc];
            const o = e?.osiptel || {};
            const row = ws4.addRow([
                limpio(ruc),
                limpio(e?.sunat?.razon_social),
                o.entel ?? 0,
                o.claro ?? 0,
                o.movistar ?? 0,
                o.otros ?? 0,
                o.total ?? 0,
            ]);
            aplicarEstiloFila(row, idx % 2 === 0);
            // Resaltar total
            row.getCell(7).font = { bold: true };
        });

        // ════════════════════════════════════════════════════════════════════
        // HOJA 5 — CONTACTOS AUTORIZADOS
        // ════════════════════════════════════════════════════════════════════
        const ws5 = wb.addWorksheet('Contactos Autorizados');
        const h5 = ['ruc', 'nombre', 'cargo', 'dni', 'tel_1', 'tel_2', 'tel_3', 'tel_4', 'tel_5', 'correo_1', 'correo_2', 'correo_3'];
        const w5 = [14, 40, 25, 12, 14, 14, 14, 14, 14, 30, 30, 30];
        setupHoja(ws5, h5, w5);

        let rowIdx5 = 0;
        rucs.forEach(ruc => {
            const contactos = contactosMap[ruc] || [];
            if (contactos.length === 0) return;
            contactos.forEach(c => {
                const tels = c.telefonos || [];
                const corrs = c.correos || [];
                const row = ws5.addRow([
                    limpio(ruc),
                    limpio(c.nombre),
                    limpio(c.cargo),
                    limpio(c.dni),
                    limpio(tels[0]),
                    limpio(tels[1]),
                    limpio(tels[2]),
                    limpio(tels[3]),
                    limpio(tels[4]),
                    limpio(corrs[0]),
                    limpio(corrs[1]),
                    limpio(corrs[2]),
                ]);
                aplicarEstiloFila(row, rowIdx5 % 2 === 0);
                rowIdx5++;
            });
        });

        // ── Enviar archivo ────────────────────────────────────────────────────
        const fecha = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="funnel_${fecha}.xlsx"`);
        await wb.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al exportar funnel', error: error.message });
    }
});

module.exports = router;