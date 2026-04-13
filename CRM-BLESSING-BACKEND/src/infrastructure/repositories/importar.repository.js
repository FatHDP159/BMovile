const xlsx = require('xlsx');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const importarRepository = {

    importarExcel: async (buffer) => {
        const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];

        const filas = xlsx.utils.sheet_to_json(hoja, {
            defval: null,
            blankrows: false,
            raw: false, // convierte todo a string para evitar problemas de tipo
        });

        console.log('📊 Total filas leídas por xlsx:', filas.length);
        if (filas.length > 0) {
            console.log('📝 Primera fila:', JSON.stringify(filas[0]));
            console.log('📝 Segunda fila:', JSON.stringify(filas[1]));
        }

        const empresasMap = {};

        for (const fila of filas) {
            const ruc = fila['ruc'] != null ? String(fila['ruc']).trim() : '';
            if (!ruc || ruc === 'null' || ruc === 'undefined' || ruc === '') continue;

            if (!empresasMap[ruc]) {
                let fechaAsigSF = null, fechaDesasigSF = null, fechaSustento = null;
                try { if (fila['fecha_asignacion_salesforce']) fechaAsigSF = new Date(fila['fecha_asignacion_salesforce']); } catch {}
                try { if (fila['fecha_desasignacion_salesforce']) fechaDesasigSF = new Date(fila['fecha_desasignacion_salesforce']); } catch {}
                try { if (fila['fecha_subida_sustento_salesforce']) fechaSustento = new Date(fila['fecha_subida_sustento_salesforce']); } catch {}

                const sustento = String(fila['sustento_salesforce'] || '').toLowerCase();

                empresasMap[ruc] = {
                    ruc,
                    razon_social:              fila['razon_social']              ? String(fila['razon_social']).trim()           : '',
                    distrito:                  fila['distrito']                  ? String(fila['distrito']).trim()               : '',
                    rubro_actividad_principal: fila['rubro_actividad_principal'] ? String(fila['rubro_actividad_principal']).trim() : '',
                    segmento:                  fila['segmento']                  ? String(fila['segmento']).trim().toLowerCase() : '',
                    lineas: {
                        claro:    Number(fila['claro_lineas']    || 0),
                        movistar: Number(fila['movistar_lineas'] || 0),
                        entel:    Number(fila['entel_lineas']    || 0),
                        otros:    Number(fila['otros_lineas']    || 0),
                        total:    Number(fila['total_lineas']    || 0),
                    },
                    salesforce: {
                        consultor:            fila['consultor_salesforce'] ? String(fila['consultor_salesforce']).trim() : null,
                        fecha_asignada:       fechaAsigSF,
                        fecha_desasignacion:  fechaDesasigSF,
                        sustento_cargado:     sustento === 'si' || sustento === 'sí',
                        fecha_carga_sustento: fechaSustento,
                    },
                    contactos: [],
                };
            }

            const nombre = fila['nombre_contacto'] ? String(fila['nombre_contacto']).trim() : '';
            if (nombre) {
                const telefonos = [];
                for (let i = 1; i <= 4; i++) {
                    const tel = fila[`telefono_contacto_${i}`] ? String(fila[`telefono_contacto_${i}`]).trim() : '';
                    if (tel && tel !== 'null') telefonos.push(tel);
                }
                const emails = [];
                for (let i = 1; i <= 2; i++) {
                    const email = fila[`correo_contacto_${i}`] ? String(fila[`correo_contacto_${i}`]).trim() : '';
                    if (email && email !== 'null') emails.push(email);
                }

                const contactoExistente = empresasMap[ruc].contactos.find(
                    c => c.nombre.toLowerCase() === nombre.toLowerCase()
                );

                if (contactoExistente) {
                    telefonos.forEach(t => { if (!contactoExistente.telefonos.includes(t)) contactoExistente.telefonos.push(t); });
                    emails.forEach(e => { if (!contactoExistente.emails.includes(e)) contactoExistente.emails.push(e); });
                } else {
                    empresasMap[ruc].contactos.push({
                        nombre,
                        dni:   fila['dni_contacto']  ? String(fila['dni_contacto']).trim()  : '',
                        cargo: fila['cargo_contacto'] ? String(fila['cargo_contacto']).trim() : '',
                        telefonos,
                        emails,
                    });
                }
            }
        }

        const totalEmpresas = Object.keys(empresasMap).length;
        console.log('🏢 Total empresas únicas procesadas:', totalEmpresas);

        if (totalEmpresas === 0) {
            return { insertados: 0, actualizados: 0, errores: ['No se encontraron empresas válidas en el archivo'] };
        }

        // bulkWrite en lotes de 500
        const empresas = Object.values(empresasMap);
        const operations = empresas.map(empresa => ({
            updateOne: {
                filter: { ruc: empresa.ruc },
                update: { $set: empresa },
                upsert: true,
            }
        }));

        const BATCH = 500;
        let insertados = 0;
        let actualizados = 0;

        for (let i = 0; i < operations.length; i += BATCH) {
            const lote = operations.slice(i, i + BATCH);
            const result = await BdGeneral.bulkWrite(lote, { ordered: false });
            insertados   += result.upsertedCount  || 0;
            actualizados += result.modifiedCount  || 0;
            console.log(`✅ Lote ${Math.floor(i/BATCH)+1}: ${result.upsertedCount} insertados, ${result.modifiedCount} actualizados`);
        }

        console.log(`🎉 TOTAL: ${insertados} insertados, ${actualizados} actualizados`);
        return { insertados, actualizados, errores: [] };
    },
};

module.exports = importarRepository;