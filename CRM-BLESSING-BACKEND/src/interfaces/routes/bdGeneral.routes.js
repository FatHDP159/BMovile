const express = require("express");
const router = express.Router();
const bdGeneralRepository = require("../../infrastructure/repositories/bdGeneral.repository");
const { verifyToken } = require("../../infrastructure/middlewares/auth.middleware");
const { verifyRole } = require("../../infrastructure/middlewares/roles.middleware");

// GET - Listar todas las empresas
router.get("/", verifyToken, verifyRole("sistemas", "supervisor"), async (req, res) => {
    try {
        const empresas = await bdGeneralRepository.findAll();
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ message: "Error al listar empresas", error: error.message });
    }
});

// GET - Buscar con filtros y paginación
router.get("/buscar", verifyToken, verifyRole("sistemas", "supervisor"), async (req, res) => {
    try {
        const { busqueda, estado, segmento, operador, consultor, fecha_asignacion_sf, fecha_desasignacion_sf, page, limit } = req.query;
        const resultado = await bdGeneralRepository.buscar({
            busqueda, estado, segmento, operador, consultor, fecha_asignacion_sf, fecha_desasignacion_sf,
            page: Number(page) || 1,
            limit: Number(limit) || 50,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: "Error al buscar empresas", error: error.message });
    }
});

// GET - Listar cartera del asesor
router.get("/mi-cartera", verifyToken, verifyRole("asesor", "supervisor"), async (req, res) => {
    try {
        const { busqueda, distrito, lineas_min, lineas_max, page, limit } = req.query;
        const resultado = await bdGeneralRepository.findByAsesor(req.user.id, {
            busqueda, distrito, lineas_min, lineas_max,
            page: Number(page) || 1,
            limit: Number(limit) || 20,
        });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: "Error al listar cartera", error: error.message });
    }
});

// POST - Crear empresa (solo sistemas)
router.post("/", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const empresa = await bdGeneralRepository.create(req.body);
        res.status(201).json({ message: "Empresa creada correctamente", empresa });
    } catch (error) {
        res.status(500).json({ message: "Error al crear empresa", error: error.message });
    }
});

// POST - Asignación masiva (solo sistemas)
router.post("/asignar-masivo", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const { id_asesor, cantidad, segmento, operador, lineas_min, lineas_max } = req.body;
        if (!id_asesor || !cantidad) return res.status(400).json({ message: "id_asesor y cantidad son requeridos" });
        const total = await bdGeneralRepository.asignarMasivo(id_asesor, cantidad, segmento, operador, lineas_min, lineas_max);
        res.json({ message: `${total} empresas asignadas correctamente`, total });
    } catch (error) {
        res.status(500).json({ message: "Error en asignación masiva", error: error.message });
    }
});

// POST - Agregar contacto a empresa
router.post("/:id/contactos", verifyToken, verifyRole("asesor", "sistemas", "supervisor"), async (req, res) => {
    try {
        const BdGeneral = require('../../domain/db_general/db_general.models.js');
        const empresa = await BdGeneral.findById(req.params.id);
        if (!empresa) return res.status(404).json({ message: "Empresa no encontrada" });
        empresa.contactos.push(req.body);
        await empresa.save();
        res.json({ message: "Contacto agregado correctamente", empresa });
    } catch (error) {
        res.status(500).json({ message: "Error al agregar contacto", error: error.message });
    }
});

// PATCH - Asignar empresa individual
router.patch("/:id/asignar", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const { id_asesor } = req.body;
        const empresa = await bdGeneralRepository.asignar(req.params.id, id_asesor);
        if (!empresa) return res.status(404).json({ message: "Empresa no encontrada" });
        res.json({ message: "Empresa asignada correctamente", empresa });
    } catch (error) {
        res.status(500).json({ message: "Error al asignar empresa", error: error.message });
    }
});

// PATCH - Desasignar empresa individual
router.patch("/:id/desasignar", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const empresa = await bdGeneralRepository.desasignar(req.params.id);
        if (!empresa) return res.status(404).json({ message: "Empresa no encontrada" });
        res.json({ message: "Empresa desasignada correctamente", empresa });
    } catch (error) {
        res.status(500).json({ message: "Error al desasignar empresa", error: error.message });
    }
});

// PATCH - Desasignar todas las empresas de un asesor
router.patch("/desasignar-todo/:id_asesor", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const total = await bdGeneralRepository.desasignarTodo(req.params.id_asesor);
        res.json({ message: `${total} empresas desasignadas correctamente`, total });
    } catch (error) {
        res.status(500).json({ message: "Error al desasignar", error: error.message });
    }
});

// DELETE - Eliminar contacto de empresa
router.delete("/:id/contactos/:index", verifyToken, verifyRole("asesor", "sistemas", "supervisor"), async (req, res) => {
    try {
        const BdGeneral = require('../../domain/db_general/db_general.models.js');
        const empresa = await BdGeneral.findById(req.params.id);
        if (!empresa) return res.status(404).json({ message: "Empresa no encontrada" });
        empresa.contactos.splice(Number(req.params.index), 1);
        await empresa.save();
        res.json({ message: "Contacto eliminado correctamente", empresa });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar contacto", error: error.message });
    }
});

// DELETE - Eliminar empresa (solo sistemas)
router.delete("/:id", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const empresa = await bdGeneralRepository.eliminar(req.params.id);
        if (!empresa) return res.status(404).json({ message: "Empresa no encontrada" });
        res.json({ message: "Empresa eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar empresa", error: error.message });
    }
});

// POST - Desasignación masiva con filtros
router.post("/desasignar-masivo", verifyToken, verifyRole("sistemas"), async (req, res) => {
    try {
        const { id_asesor, segmento, operador, lineas_min, lineas_max } = req.body;
        if (!id_asesor) return res.status(400).json({ message: "id_asesor es requerido" });

        const filtro = {
            'asignacion.id_asesor': id_asesor,
            estado_base: { $in: ['asignada', 'trabajada'] },
        };
        if (segmento) filtro.segmento = segmento;
        if (operador) filtro[`lineas.${operador}`] = { $gt: 0 };
        if (lineas_min || lineas_max) {
            filtro['lineas.total'] = {};
            if (lineas_min) filtro['lineas.total'].$gte = Number(lineas_min);
            if (lineas_max) filtro['lineas.total'].$lte = Number(lineas_max);
        }

        const result = await BdGeneral.updateMany(filtro, {
            'asignacion.id_asesor': null,
            'asignacion.fecha_desasignacion': new Date(),
            estado_base: 'disponible',
        });

        res.json({ message: `${result.modifiedCount} empresas desasignadas correctamente`, total: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: "Error en desasignación masiva", error: error.message });
    }
});

module.exports = router;