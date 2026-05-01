const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');
const BdGeneral = require('../../domain/db_general/db_general.models.js');
const EmpresaV2 = require('../../domain/empresaV2/empresaV2.model.js');
const ContactoRRLL = require('../../domain/contactos/contactoRRLL.model.js');
const ContactoRRLLDato = require('../../domain/contactos/contactoRRLLDato.model.js');

// POST - Migración única bdgenerals → empresas_v2
router.post('/migrar', verifyToken, verifyRole('sistemas'), async (req, res) => {
    try {
        console.log('🚀 Iniciando migración...');

        const empresasBD = await BdGeneral.find({});
        console.log(`📦 Total empresas en bdgenerals: ${empresasBD.length}`);

        let creadas = 0, actualizadas = 0, contactosMigrados = 0, errores = [];

        for (const emp of empresasBD) {
            try {
                const ruc = String(emp.ruc).trim();

                // 1. Buscar en empresas_v2
                let empresaV2 = await EmpresaV2.findOne({ ruc });

                if (!empresaV2) {
                    // Crear empresa nueva con datos básicos de bdgenerals
                    empresaV2 = await EmpresaV2.create({
                        ruc,
                        sunat: {
                            razon_social: emp.razon_social || null,
                            direccion:    emp.distrito || null,
                            actividad:    emp.rubro_actividad_principal || null,
                        },
                        osiptel: {
                            claro:    emp.lineas?.claro    || 0,
                            movistar: emp.lineas?.movistar || 0,
                            entel:    emp.lineas?.entel    || 0,
                            otros:    emp.lineas?.otros    || 0,
                            total:    emp.lineas?.total    || 0,
                        },
                        salesforce: {
                            segmento:         emp.segmento || null,
                            consultor:        emp.salesforce?.consultor || null,
                            fecha_asignacion: emp.salesforce?.fecha_asignada || null,
                            sustento:         emp.salesforce?.sustento_cargado || false,
                            fecha_sustento:   emp.salesforce?.fecha_carga_sustento || null,
                        },
                        estado_base: emp.estado_base || 'disponible',
                    });
                    creadas++;
                } else {
                    // Solo actualizar estado_base si está en bdgenerals
                    await EmpresaV2.updateOne({ ruc }, {
                        $set: { estado_base: emp.estado_base || 'disponible' }
                    });
                    actualizadas++;
                }

                // 2. Migrar contactos → contactos_rrll
                if (emp.contactos && emp.contactos.length > 0) {
                    for (const c of emp.contactos) {
                        if (!c.nombre) continue;
                        try {
                            // Upsert contacto RRLL por ruc + nombre
                            const contacto = await ContactoRRLL.findOneAndUpdate(
                                { ruc, nombre: c.nombre },
                                { $setOnInsert: { ruc, nombre: c.nombre, cargo: c.cargo || null } },
                                { upsert: true, new: true }
                            );

                            // Migrar teléfonos
                            if (c.telefonos && c.telefonos.length > 0) {
                                for (const tel of c.telefonos) {
                                    if (!tel) continue;
                                    await ContactoRRLLDato.updateOne(
                                        { id_contacto: contacto._id, tipo: 'telefono', valor: String(tel).trim() },
                                        { $setOnInsert: { id_contacto: contacto._id, ruc, tipo: 'telefono', valor: String(tel).trim() } },
                                        { upsert: true }
                                    );
                                }
                            }

                            // Migrar correos
                            if (c.emails && c.emails.length > 0) {
                                for (const email of c.emails) {
                                    if (!email) continue;
                                    await ContactoRRLLDato.updateOne(
                                        { id_contacto: contacto._id, tipo: 'correo', valor: String(email).trim() },
                                        { $setOnInsert: { id_contacto: contacto._id, ruc, tipo: 'correo', valor: String(email).trim() } },
                                        { upsert: true }
                                    );
                                }
                            }

                            contactosMigrados++;
                        } catch (err) {
                            errores.push({ ruc, contacto: c.nombre, error: err.message });
                        }
                    }
                }

            } catch (err) {
                errores.push({ ruc: emp.ruc, error: err.message });
            }
        }

        console.log(`✅ Migración completada: ${creadas} creadas, ${actualizadas} actualizadas, ${contactosMigrados} contactos migrados`);

        res.json({
            message: 'Migración completada',
            creadas,
            actualizadas,
            contactosMigrados,
            errores: errores.slice(0, 20),
        });

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        res.status(500).json({ message: 'Error en migración', error: error.message });
    }
});

module.exports = router;