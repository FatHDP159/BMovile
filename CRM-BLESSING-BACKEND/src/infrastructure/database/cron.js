const cron = require('node-cron');
const BdGeneral = require('../../domain/db_general/db_general.models.js');

const iniciarCron = () => {
    // Se ejecuta todos los días a medianoche
    cron.schedule('0 0 * * *', async () => {
        try {
            const ahora = new Date();

            // Buscar empresas cuya fecha_desasignacion ya pasó y siguen asignadas
            const empresas = await BdGeneral.find({
                estado_base: 'trabajada',
                'asignacion.fecha_desasignacion': { $lte: ahora },
                'asignacion.id_asesor': { $ne: null },
            });

            for (const empresa of empresas) {
                empresa.asignacion.id_asesor = null;
                empresa.estado_base = 'disponible';
                await empresa.save();
                console.log(`✅ Empresa desasignada automáticamente: ${empresa.razon_social}`);
            }

            console.log(`🕐 Cron ejecutado: ${empresas.length} empresas desasignadas`);
        } catch (error) {
            console.error('❌ Error en cron:', error.message);
        }
    });

    console.log('⏰ Cron job iniciado - revisión diaria a medianoche');
};

module.exports = iniciarCron;