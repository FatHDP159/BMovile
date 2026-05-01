const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const ContactoAutorizado = require('../../domain/contactos/contactoAutorizado.model.js');
const ContactoAutorizadoDato = require('../../domain/contactos/contactoAutorizadoDato.model.js');
const ContactoRRLL = require('../../domain/contactos/contactoRRLL.model.js');
const ContactoRRLLDato = require('../../domain/contactos/contactoRRLLDato.model.js');

// Helper — obtener contactos con datos
const getContactosConDatos = async (ruc, Modelo, ModeloDato) => {
    const contactos = await Modelo.find({ ruc });
    return Promise.all(contactos.map(async (c) => {
        const datos = await ModeloDato.find({ id_contacto: c._id });
        return {
            ...c.toObject(),
            telefonos: datos.filter(d => d.tipo === 'telefono').map(d => d.valor),
            correos:   datos.filter(d => d.tipo === 'correo').map(d => d.valor),
        };
    }));
};

// GET - Mi cartera (asesor)
router.get('/mi-cartera', verifyToken, verifyRole('asesor', 'supervisor'), async (req, res) => {
    try {
        const { busqueda, lineas_min, lineas_max, operador, page = 1, limit = 20 } = req.query;
        const id_asesor = req.user.id;

        const filtro = {
            'asignacion.id_asesor': id_asesor,
            estado_base: 'asignada',
        };

        if (busqueda) filtro.$or = [
            { ruc: { $regex: busqueda, $options: 'i' } },
            { 'sunat.razon_social': { $regex: busqueda, $options: 'i' } },
        ];
        if (operador) filtro[`osiptel.${operador}`] = { $gt: 0 };
        if (lineas_min || lineas_max) {
            filtro['osiptel.total'] = {};
            if (lineas_min) filtro['osiptel.total'].$gte = Number(lineas_min);
            if (lineas_max) filtro['osiptel.total'].$lte = Number(lineas_max);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await EmpresaV2.countDocuments(filtro);
        const empresas = await EmpresaV2.find(filtro)
            .skip(skip).limit(Number(limit))
            .sort({ 'asignacion.fecha_asignada': -1 });

        // Adjuntar contactos autorizados a cada empresa
        const empresasConContactos = await Promise.all(empresas.map(async (emp) => {
            const contactos_autorizados = await getContactosConDatos(emp.ruc, ContactoAutorizado, ContactoAutorizadoDato);
            return { ...emp.toObject(), contactos_autorizados };
        }));

        res.json({
            empresas: empresasConContactos,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar cartera', error: error.message });
    }
});

// GET - Contactos RRLL de una empresa
router.get('/:ruc/contactos-rrll', verifyToken, async (req, res) => {
    try {
        const contactos = await getContactosConDatos(req.params.ruc, ContactoRRLL, ContactoRRLLDato);
        res.json(contactos);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar contactos RRLL', error: error.message });
    }
});

module.exports = router;