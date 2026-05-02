const FichaGestion = require('../../domain/fichaGestion/fichaGestion.model.js');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const fichaGestionRepository = {

    // ── Crear o agregar interacción (Opción A) ────────────────────────────────
    // Si no existe ficha activa para ruc+asesor → crea una nueva
    // Si ya existe → agrega interacción
    tipificar: async ({ ruc, id_asesor, nombre_asesor, rol_asesor, tipo, comentario, contacto }) => {
        // Obtener datos de empresa
        const empresaV2 = await EmpresaV2.findOne({ ruc });
        const empresaLegacy = !empresaV2 ? await BdGeneral.findOne({ ruc }) : null;

        const razon_social = empresaV2?.sunat?.razon_social || empresaLegacy?.razon_social || ruc;
        const segmento = empresaV2?.salesforce?.segmento || empresaLegacy?.segmento || null;
        const total_lineas = empresaV2?.osiptel?.total || empresaLegacy?.lineas?.total || 0;

        const interaccion = {
            fecha: new Date(),
            tipo,
            comentario: comentario || null,
            contacto: contacto || {},
            agregado_por: { id: id_asesor, nombre: nombre_asesor, rol: rol_asesor },
        };

        // Buscar ficha activa
        let ficha = await FichaGestion.findOne({ ruc, 'asesor.id_asesor': id_asesor, activa: true });

        if (!ficha) {
            // Crear nueva ficha
            ficha = await FichaGestion.create({
                ruc,
                razon_social,
                segmento,
                total_lineas,
                asesor: { id_asesor },
                activa: true,
                estado_general: 'activo',
                fechas: { fecha_inicio: new Date(), fecha_ultimo_contacto: new Date() },
                interacciones: [interaccion],
                oportunidades: [],
            });
        } else {
            // Agregar interacción a ficha existente
            ficha.interacciones.push(interaccion);
            ficha.fechas.fecha_ultimo_contacto = new Date();
            await ficha.save();
        }

        // Actualizar estado en empresas_v2
        if (empresaV2) {
            const fechaDesasignacion = new Date();
            fechaDesasignacion.setDate(fechaDesasignacion.getDate() + 30);
            await EmpresaV2.findOneAndUpdate(
                { ruc },
                { estado_base: 'trabajada', 'asignacion.fecha_desasignacion': fechaDesasignacion },
                { new: true }
            );
        }

        return ficha;
    },

    // ── Agregar oportunidad a ficha ───────────────────────────────────────────
    agregarOportunidad: async (fichaId, oportunidad) => {
        const ficha = await FichaGestion.findByIdAndUpdate(
            fichaId,
            { $push: { oportunidades: { ...oportunidad, fecha_creacion: new Date() } } },
            { new: true }
        );
        if (!ficha) throw new Error('Ficha no encontrada');
        return ficha;
    },

    // ── Actualizar oportunidad ────────────────────────────────────────────────
    actualizarOportunidad: async (fichaId, oportunidadId, datos) => {
        const updateData = {};
        Object.keys(datos).forEach(k => {
            updateData[`oportunidades.$.${k}`] = datos[k];
        });

        // Si se aprueba, guardar fecha_ganada
        if (datos.estado === 'Negociada Aprobada') {
            updateData['oportunidades.$.fecha_ganada'] = new Date();
            // Actualizar estado general de la ficha
        }

        const ficha = await FichaGestion.findOneAndUpdate(
            { _id: fichaId, 'oportunidades._id': oportunidadId },
            { $set: updateData },
            { new: true }
        );
        if (!ficha) throw new Error('Ficha u oportunidad no encontrada');

        // Actualizar estado_general si corresponde
        const opo = ficha.oportunidades.id(oportunidadId);
        if (opo?.estado === 'Negociada Aprobada') {
            await FichaGestion.findByIdAndUpdate(fichaId, {
                estado_general: 'cerrado_ganado',
                'fechas.fecha_cierre': new Date(),
            });
        } else if (opo?.estado === 'Negociada Rechazada') {
            await FichaGestion.findByIdAndUpdate(fichaId, {
                estado_general: 'cerrado_perdido',
                'fechas.fecha_cierre': new Date(),
            });
        }

        return ficha;
    },

    // ── Archivar ficha (al reasignar empresa) ─────────────────────────────────
    archivar: async (fichaId) => {
        return await FichaGestion.findByIdAndUpdate(
            fichaId,
            { activa: false, 'fechas.fecha_cierre': new Date() },
            { new: true }
        );
    },

    // ── Mis fichas (asesor) ───────────────────────────────────────────────────
    findByAsesor: async (id_asesor, { busqueda, estado_general, page = 1, limit = 50 } = {}) => {
        const filtro = { 'asesor.id_asesor': id_asesor, activa: true };
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { razon_social: { $regex: busqueda, $options: 'i' } },
        ];
        if (estado_general) filtro.estado_general = estado_general;

        const skip = (page - 1) * limit;
        const total = await FichaGestion.countDocuments(filtro);
        const fichas = await FichaGestion.find(filtro)
            .skip(skip).limit(limit)
            .sort({ 'fechas.fecha_ultimo_contacto': -1 });

        return { fichas, total, page, totalPages: Math.ceil(total / limit) };
    },

    // ── Todas las fichas (supervisor/sistemas) ────────────────────────────────
    findAll: async ({ busqueda, estado_general, id_asesor, activa, page = 1, limit = 50 } = {}) => {
        const filtro = {};
        if (activa !== undefined) filtro.activa = activa;
        else filtro.activa = true;
        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { razon_social: { $regex: busqueda, $options: 'i' } },
        ];
        if (estado_general) filtro.estado_general = estado_general;
        if (id_asesor) filtro['asesor.id_asesor'] = id_asesor;

        const skip = (page - 1) * limit;
        const total = await FichaGestion.countDocuments(filtro);
        const fichas = await FichaGestion.find(filtro)
            .populate('asesor.id_asesor', 'nombre_user dni_user')
            .skip(skip).limit(limit)
            .sort({ 'fechas.fecha_ultimo_contacto': -1 });

        return { fichas, total, page, totalPages: Math.ceil(total / limit) };
    },

    // ── Historial de una empresa (todas las fichas, activas y archivadas) ─────
    findHistorialByRuc: async (ruc) => {
        return await FichaGestion.find({ ruc })
            .populate('asesor.id_asesor', 'nombre_user dni_user')
            .sort({ createdAt: -1 });
    },

    // ── Ficha por ID ──────────────────────────────────────────────────────────
    findById: async (id) => {
        return await FichaGestion.findById(id).populate('asesor.id_asesor', 'nombre_user dni_user');
    },

    // ── Funnel — solo fichas con oportunidades activas ────────────────────────
    findFunnel: async ({ id_asesor, busqueda, estados, segmento, lineas_min, lineas_max, page = 1, limit = 50 }) => {
        const filtro = { activa: true, 'oportunidades.0': { $exists: true } };
        if (id_asesor) filtro['asesor.id_asesor'] = id_asesor;
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
        if (estados && estados.length > 0) {
            filtro['oportunidades.estado'] = { $in: estados };
        }

        const skip = (page - 1) * limit;
        const total = await FichaGestion.countDocuments(filtro);
        const fichas = await FichaGestion.find(filtro)
            .populate('asesor.id_asesor', 'nombre_user')
            .skip(skip).limit(limit)
            .sort({ 'fechas.fecha_ultimo_contacto': -1 });

        return { fichas, total, page, totalPages: Math.ceil(total / limit) };
    },

    // ── Migración: convertir gestiones antiguas a fichas ─────────────────────
    migrarDesdeGestiones: async (gestiones) => {
        const fichasPorRucAsesor = {};

        for (const g of gestiones) {
            const key = `${g.ruc}_${g.asesor?.id_asesor?.toString()}`;
            if (!fichasPorRucAsesor[key]) {
                fichasPorRucAsesor[key] = {
                    ruc: g.ruc,
                    razon_social: g.razon_social,
                    segmento: g.segmento,
                    total_lineas: g.total_lineas,
                    asesor: { id_asesor: g.asesor?.id_asesor },
                    activa: true,
                    estado_general: 'activo',
                    fechas: {
                        fecha_inicio: g.fechas?.fecha_tipificacion || g.createdAt,
                        fecha_ultimo_contacto: g.fechas?.fecha_tipificacion || g.createdAt,
                    },
                    interacciones: [],
                    oportunidades: [],
                };
            }

            const ficha = fichasPorRucAsesor[key];

            // Actualizar fecha_ultimo_contacto si es más reciente
            const fechaG = g.fechas?.fecha_tipificacion || g.createdAt;
            if (fechaG > ficha.fechas.fecha_ultimo_contacto) {
                ficha.fechas.fecha_ultimo_contacto = fechaG;
            }

            // Agregar interacción
            if (g.tipo_tipificacion !== 'interesado') {
                ficha.interacciones.push({
                    fecha: fechaG,
                    tipo: g.tipo_tipificacion,
                    comentario: g.comentario || g.oportunidad?.comentario || null,
                    contacto: g.contacto || {},
                    agregado_por: { id: g.asesor?.id_asesor, nombre: 'Migrado', rol: 'asesor' },
                });
            }

            // Agregar oportunidad si es interesado
            if (g.tipo_tipificacion === 'interesado' && g.oportunidad) {
                ficha.oportunidades.push({
                    titulo: g.oportunidad.titulo,
                    producto: g.oportunidad.producto,
                    cantidad: g.oportunidad.cantidad,
                    cargo_fijo: g.oportunidad.cargo_fijo,
                    estado: g.oportunidad.estado || 'Identificada',
                    sustento: g.oportunidad.sustento || false,
                    comentario: g.oportunidad.comentario || g.comentario || null,
                    fecha_creacion: fechaG,
                    fecha_ganada: g.fechas?.fecha_ganada || null,
                    operadores: g.oportunidad.operadores || {},
                });

                // Actualizar estado general según oportunidad
                if (g.oportunidad.estado === 'Negociada Aprobada') {
                    ficha.estado_general = 'cerrado_ganado';
                    ficha.fechas.fecha_cierre = g.fechas?.fecha_ganada || fechaG;
                }
            }
        }

        // Insertar todas las fichas
        const fichas = Object.values(fichasPorRucAsesor);
        let creadas = 0;
        for (const f of fichas) {
            await FichaGestion.updateOne(
                { ruc: f.ruc, 'asesor.id_asesor': f.asesor.id_asesor, activa: true },
                { $setOnInsert: f },
                { upsert: true }
            );
            creadas++;
        }
        return { creadas, total: gestiones.length };
    },
};

module.exports = fichaGestionRepository;