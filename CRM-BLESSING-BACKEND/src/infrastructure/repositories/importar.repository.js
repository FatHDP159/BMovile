const xlsx = require('xlsx');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const importarRepository = {

    importarExcel: async (buffer) => {
        const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];

        const filas = xlsx.utils.sheet_to_json(hoja, {
            defval: null,
            blankrows: false,
            raw: false,
        });

        console.log('📊 Total filas leídas por xlsx:', filas.length);

        const empresasMap = {};

        for (const fila of filas) {
            const ruc = fila['ruc'] != null ? String(fila['ruc']).trim() : '';
            if (!ruc || ruc === 'null' || ruc === 'undefined' || ruc === '') continue;

            if (!empresasMap[ruc]) {
                let fechaAsigSF = null, fechaDesasigSF = null, fechaSustento = null;
                try {
                    const v = fila['fecha_asignacion_salesforce'];
                    if (v && v !== 'N/A' && v !== 'null') { const d = new Date(v); if (!isNaN(d)) fechaAsigSF = d; }
                } catch {}
                try {
                    const v = fila['fecha_desasignacion_salesforce'];
                    if (v && v !== 'N/A' && v !== 'null') { const d = new Date(v); if (!isNaN(d)) fechaDesasigSF = d; }
                } catch {}
                try {
                    const v = fila['fecha_subida_sustento_salesforce'];
                    if (v && v !== 'N/A' && v !== 'null') { const d = new Date(v); if (!isNaN(d)) fechaSustento = d; }
                } catch {}

                const sustento = String(fila['sustento_salesforce'] || '').toLowerCase();
                const consultor = fila['consultor_salesforce'] ? String(fila['consultor_salesforce']).trim() : null;

                empresasMap[ruc] = {
                    ruc,
                    razon_social:              fila['razon_social']              ? String(fila['razon_social']).trim()              : '',
                    distrito:                  fila['distrito']                  ? String(fila['distrito']).trim()                  : '',
                    rubro_actividad_principal: fila['rubro_actividad_principal'] ? String(fila['rubro_actividad_principal']).trim() : '',
                    segmento:                  fila['segmento']                  ? String(fila['segmento']).trim().toLowerCase()    : '',
                    lineas: {
                        claro:    isNaN(Number(fila['claro_lineas']))    ? 0 : Number(fila['claro_lineas']),
                        movistar: isNaN(Number(fila['movistar_lineas'])) ? 0 : Number(fila['movistar_lineas']),
                        entel:    isNaN(Number(fila['entel_lineas']))    ? 0 : Number(fila['entel_lineas']),
                        otros:    isNaN(Number(fila['otros_lineas']))    ? 0 : Number(fila['otros_lineas']),
                        total:    isNaN(Number(fila['total_lineas']))    ? 0 : Number(fila['total_lineas']),
                    },
                    salesforce: {
                        consultor:            consultor === 'N/A' ? null : consultor,
                        fecha_asignada:       fechaAsigSF,
                        fecha_desasignacion:  fechaDesasigSF,
                        sustento_cargado:     sustento === 'si' || sustento === 'sí',
                        fecha_carga_sustento: fechaSustento,
                    },
                    contactos: [],
                };
            }

            const nombre = fila['nombre_contacto'] ? String(fila['nombre_contacto']).trim() : '';
            if (nombre && nombre !== 'null') {
                const telefonos = [];
                for (let i = 1; i <= 4; i++) {
                    const tel = fila[`telefono_contacto_${i}`] ? String(fila[`telefono_contacto_${i}`]).trim() : '';
                    if (tel && tel !== 'null' && tel !== '0') telefonos.push(tel);
                }
                const emails = [];
                for (let i = 1; i <= 2; i++) {
                    const email = fila[`correo_contacto_${i}`] ? String(fila[`correo_contacto_${i}`]).trim() : '';
                    if (email && email !== 'null' && email !== '0') emails.push(email);
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
            return { insertados: 0, actualizados: 0, errores: ['No se encontraron empresas válidas'] };
        }

        const empresas = Object.values(empresasMap);
        const BATCH = 500;
        let insertados = 0;
        let actualizados = 0;
        let errores = [];

        for (let i = 0; i < empresas.length; i += BATCH) {
            const lote = empresas.slice(i, i + BATCH);
            try {
                // Usar insertMany para nuevos + updateMany para existentes
                const rucsLote = lote.map(e => e.ruc);
                const existentes = await BdGeneral.find({ ruc: { $in: rucsLote } }).select('ruc');
                const rucsExistentes = new Set(existentes.map(e => e.ruc));

                const nuevos = lote.filter(e => !rucsExistentes.has(e.ruc));
                const aActualizar = lote.filter(e => rucsExistentes.has(e.ruc));

                // Insertar nuevos
                if (nuevos.length > 0) {
                    await BdGeneral.insertMany(nuevos, { ordered: false });
                    insertados += nuevos.length;
                }

                // Actualizar existentes
                for (const empresa of aActualizar) {
                    await BdGeneral.updateOne({ ruc: empresa.ruc }, { $set: empresa });
                }
                actualizados += aActualizar.length;

                console.log(`✅ Lote ${Math.floor(i/BATCH)+1}: ${nuevos.length} insertados, ${aActualizar.length} actualizados`);
            } catch (err) {
                console.error(`❌ Error en lote ${Math.floor(i/BATCH)+1}:`, err.message);
                errores.push(err.message);
            }
        }

        console.log(`🎉 TOTAL: ${insertados} insertados, ${actualizados} actualizados`);
        return { insertados, actualizados, errores };
    },
};

module.exports = importarRepository;