const xlsx = require('xlsx');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const importarRepository = {

    importarExcel: async (buffer) => {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const filas = xlsx.utils.sheet_to_json(hoja);

        const empresasMap = {};

        for (const fila of filas) {
            const ruc = String(fila['ruc'] || '').trim();
            if (!ruc) continue;

            if (!empresasMap[ruc]) {
                const fechaAsigSF    = fila['fecha_asignacion_salesforce']    ? new Date(fila['fecha_asignacion_salesforce'])    : null;
                const fechaDesasigSF = fila['fecha_desasignacion_salesforce'] ? new Date(fila['fecha_desasignacion_salesforce']) : null;
                const fechaSustento  = fila['fecha_subida_sustento_salesforce'] ? new Date(fila['fecha_subida_sustento_salesforce']) : null;
                const sustento = String(fila['sustento_salesforce'] || '').toLowerCase();

                empresasMap[ruc] = {
                    ruc,
                    razon_social:              fila['razon_social']              || '',
                    distrito:                  fila['distrito']                  || '',
                    rubro_actividad_principal: fila['rubro_actividad_principal'] || '',
                    segmento:                  fila['segmento']                  || '',
                    lineas: {
                        claro:    Number(fila['claro_lineas']    || 0),
                        movistar: Number(fila['movistar_lineas'] || 0),
                        entel:    Number(fila['entel_lineas']    || 0),
                        otros:    Number(fila['otros_lineas']    || 0),
                        total:    Number(fila['total_lineas']    || 0),
                    },
                    salesforce: {
                        consultor:            fila['consultor_salesforce'] || null,
                        fecha_asignada:       fechaAsigSF,
                        fecha_desasignacion:  fechaDesasigSF,
                        sustento_cargado:     sustento === 'si' || sustento === 'sí',
                        fecha_carga_sustento: fechaSustento,
                    },
                    contactos: [],
                };
            }

            const nombre = String(fila['nombre_contacto'] || '').trim();
            if (nombre) {
                // Agrupar teléfonos — leer telefono_contacto_1 hasta _4
                const telefonos = [];
                for (let i = 1; i <= 4; i++) {
                    const tel = String(fila[`telefono_contacto_${i}`] || '').trim();
                    if (tel) telefonos.push(tel);
                }

                // Agrupar correos — leer correo_contacto_1 y _2
                const emails = [];
                for (let i = 1; i <= 2; i++) {
                    const email = String(fila[`correo_contacto_${i}`] || '').trim();
                    if (email) emails.push(email);
                }

                // Verificar si el contacto ya existe (mismo nombre en la misma empresa)
                const contactoExistente = empresasMap[ruc].contactos.find(
                    c => c.nombre.toLowerCase() === nombre.toLowerCase()
                );

                if (contactoExistente) {
                    // Fusionar teléfonos y correos sin duplicar
                    telefonos.forEach(t => { if (!contactoExistente.telefonos.includes(t)) contactoExistente.telefonos.push(t); });
                    emails.forEach(e => { if (!contactoExistente.emails.includes(e)) contactoExistente.emails.push(e); });
                } else {
                    empresasMap[ruc].contactos.push({
                        nombre,
                        dni:       String(fila['dni_contacto']  || '').trim(),
                        cargo:     String(fila['cargo_contacto'] || '').trim(),
                        telefonos,
                        emails,
                    });
                }
            }
        }

        const resultados = { insertados: 0, actualizados: 0, errores: [] };

        for (const empresa of Object.values(empresasMap)) {
            try {
                const existe = await BdGeneral.findOne({ ruc: empresa.ruc });
                if (existe) {
                    await BdGeneral.findOneAndUpdate(
                        { ruc: empresa.ruc },
                        {
                            razon_social:              empresa.razon_social,
                            distrito:                  empresa.distrito,
                            rubro_actividad_principal: empresa.rubro_actividad_principal,
                            segmento:                  empresa.segmento,
                            lineas:                    empresa.lineas,
                            salesforce:                empresa.salesforce,
                            contactos:                 empresa.contactos,
                        }
                    );
                    resultados.actualizados++;
                } else {
                    await BdGeneral.create(empresa);
                    resultados.insertados++;
                }
            } catch (error) {
                resultados.errores.push({ ruc: empresa.ruc, error: error.message });
            }
        }

        return resultados;
    },
};

module.exports = importarRepository;