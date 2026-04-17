const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const Gestion = require('../../domain/gestiones/gestiones.model.js');
const User = require('../../domain/users/user.model.js');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const PRODUCTOS_VALIDOS = ['Portabilidad','Renovación','Fibra','HFC o FTTH','Cloud','Alta','Licencias Google','Licencias Microsoft','SVA'];
const ESTADOS_VALIDOS   = ['Identificada','Propuesta Entregada','Negociación','Negociada Aprobada','Negociada Rechazada'];
const TIPOS_VALIDOS     = ['interesado','cliente_claro','sin_contacto','con_deuda','no_contesta','cliente_no_interesado','empresa_con_sustento_valido'];

const parseFecha = (val) => {
    if (!val) return null;
    const f = new Date(val);
    if (isNaN(f)) return null;
    f.setUTCHours(12, 0, 0, 0);
    return f;
};

// POST - Importar historial de gestiones
router.post('/importar', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        if (!req.files?.archivo) return res.status(400).json({ message: 'No se recibió archivo' });

        const xlsx = require('xlsx');
        const workbook = xlsx.read(req.files.archivo.data, { type: 'buffer', cellDates: true });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const filas = xlsx.utils.sheet_to_json(hoja, { defval: null, blankrows: false, raw: false });

        let insertados = 0;
        const errores = [];
        const asesoresCache = {};

        for (const [i, fila] of filas.entries()) {
            try {
                const ruc       = fila['ruc']               ? String(fila['ruc']).trim()               : null;
                const tipo      = fila['tipo_tipificacion']  ? String(fila['tipo_tipificacion']).trim().toLowerCase() : null;
                const dniAsesor = fila['asesor_dni']         ? String(fila['asesor_dni']).trim()         : null;
                const fechaStr  = fila['fecha_tipificacion'] ? String(fila['fecha_tipificacion']).trim() : null;

                if (!ruc || !tipo || !dniAsesor || !fechaStr) {
                    errores.push({ fila: i+2, error: 'Faltan campos obligatorios' }); continue;
                }
                if (!TIPOS_VALIDOS.includes(tipo)) {
                    errores.push({ fila: i+2, error: `Tipo inválido: ${tipo}` }); continue;
                }

                // Buscar asesor por DNI con cache
                if (!asesoresCache[dniAsesor]) {
                    const asesor = await User.findOne({ dni_user: dniAsesor });
                    if (!asesor) { errores.push({ fila: i+2, error: `Asesor no encontrado: ${dniAsesor}` }); continue; }
                    asesoresCache[dniAsesor] = asesor;
                }
                const asesor = asesoresCache[dniAsesor];

                const fecha = parseFecha(fechaStr);
                if (!fecha) { errores.push({ fila: i+2, error: `Fecha inválida: ${fechaStr}` }); continue; }

                // fecha_ganada
                const fechaGanadaStr = fila['fecha_ganada'] ? String(fila['fecha_ganada']).trim() : null;
                const fechaGanada = fechaGanadaStr ? parseFecha(fechaGanadaStr) : null;

                // Buscar empresa
                const empresa = await BdGeneral.findOne({ ruc });
                const segmento    = empresa?.segmento    || fila['segmento']     || null;
                const totalLineas = empresa?.lineas?.total || Number(fila['total_lineas'] || 0);

                // Oportunidad
                let oportunidad = undefined;
                if (tipo === 'interesado') {
                    const producto  = fila['producto']           ? String(fila['producto']).trim()           : null;
                    const estadoOpo = fila['estado_oportunidad'] ? String(fila['estado_oportunidad']).trim() : 'Identificada';
                    oportunidad = {
                        producto:   PRODUCTOS_VALIDOS.includes(producto) ? producto : null,
                        cantidad:   Number(fila['cantidad']   || 0),
                        cargo_fijo: Number(fila['cargo_fijo'] || 0),
                        estado:     ESTADOS_VALIDOS.includes(estadoOpo) ? estadoOpo : 'Identificada',
                        comentario: fila['comentario'] ? String(fila['comentario']).trim() : null,
                    };
                }

                const gestion = new Gestion({
                    ruc,
                    razon_social: fila['razon_social'] ? String(fila['razon_social']).trim() : '',
                    segmento,
                    total_lineas: totalLineas,
                    contacto: {
                        nombre:   fila['nombre_contacto']   ? String(fila['nombre_contacto']).trim()   : null,
                        dni:      fila['dni_contacto']      ? String(fila['dni_contacto']).trim()      : null,
                        telefono: fila['telefono_contacto'] ? String(fila['telefono_contacto']).trim() : null,
                    },
                    asesor: { id_asesor: asesor._id },
                    fechas: {
                        fecha_tipificacion: fecha,
                        fecha_ganada: fechaGanada,
                    },
                    tipo_tipificacion: tipo,
                    ...(oportunidad && { oportunidad }),
                });

                await gestion.save();
                insertados++;
            } catch (err) {
                errores.push({ fila: i+2, error: err.message });
            }
        }

        res.json({ message: 'Importación completada', insertados, errores: errores.slice(0, 20) });
    } catch (error) {
        res.status(500).json({ message: 'Error al importar historial', error: error.message });
    }
});

module.exports = router;