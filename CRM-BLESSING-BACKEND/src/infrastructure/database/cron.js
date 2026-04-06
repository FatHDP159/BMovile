const cron = require('node-cron');
const BdGeneral  = require('../../domain/db_general/db_general.models.js');
const Actividad  = require('../../domain/actividades/actividades.model.js');
const Gestion    = require('../../domain/gestiones/gestiones.model.js');
const Solicitud  = require('../../domain/solicitudes/solicitudes.model.js');
const User       = require('../../domain/users/user.model.js');
const Notificacion = require('../../domain/notificaciones/notificaciones.model.js');

// ── Helper: crear notificación sin duplicados ────────────────────────────
const crearNotif = async ({ usuario, tipo, titulo, mensaje, link = null, referencia_id = null }) => {
    try {
        const existe = await Notificacion.findOne({ usuario, tipo, referencia_id, leida: false });
        if (existe) return;
        await Notificacion.create({ usuario, tipo, titulo, mensaje, link, referencia_id });
    } catch (err) {
        console.error('Error creando notificación:', err.message);
    }
};

const iniciarCron = () => {

    // ── Cada 10 minutos: actividades próximas a vencer ───────────────────
    cron.schedule('*/10 * * * *', async () => {
        try {
            const ahora = new Date();

            const rangosRecordatorio = {
                '10min': 10,
                '30min': 30,
                '1hora': 60,
                '1dia':  1440,
            };

            for (const [clave, minutos] of Object.entries(rangosRecordatorio)) {
                const desde = new Date(ahora.getTime() + minutos * 60000 - 5 * 60000);
                const hasta = new Date(ahora.getTime() + minutos * 60000 + 5 * 60000);

                const actividades = await Actividad.find({
                    estado: 'pendiente',
                    recordatorio: clave,
                }).populate('asesor', 'nombre_user');

                for (const act of actividades) {
                    const fechaAct = new Date(act.fecha);
                    const [h, m] = act.hora.split(':');
                    fechaAct.setHours(Number(h), Number(m), 0, 0);

                    if (fechaAct >= desde && fechaAct <= hasta) {
                        await crearNotif({
                            usuario: act.asesor._id || act.asesor,
                            tipo: 'actividad_proxima',
                            titulo: 'Actividad próxima',
                            mensaje: `"${act.titulo}" vence en ${minutos < 60 ? minutos + ' minutos' : minutos / 60 + ' hora(s)'}`,
                            link: '/calendario',
                            referencia_id: act._id.toString(),
                        });
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error cron actividades próximas:', err.message);
        }
    });

    // ── Cada 30 minutos: actividades vencidas ────────────────────────────
    cron.schedule('*/30 * * * *', async () => {
        try {
            const ahora = new Date();

            const actividades = await Actividad.find({ estado: 'pendiente' });

            for (const act of actividades) {
                const fechaAct = new Date(act.fecha);
                const [h, m] = act.hora.split(':');
                fechaAct.setHours(Number(h), Number(m), 0, 0);

                if (fechaAct < ahora) {
                    const asesorId = act.asesor?._id || act.asesor;
                    await crearNotif({
                        usuario: asesorId,
                        tipo: 'actividad_vencida',
                        titulo: 'Actividad vencida',
                        mensaje: `"${act.titulo}" venció sin completarse`,
                        link: '/calendario',
                        referencia_id: act._id.toString(),
                    });

                    // Notificar al supervisor también
                    const supervisores = await User.find({ rol_user: 'supervisor', estado_user: 'activo' });
                    for (const sup of supervisores) {
                        await crearNotif({
                            usuario: sup._id,
                            tipo: 'actividad_vencida',
                            titulo: 'Actividad vencida del equipo',
                            mensaje: `La actividad "${act.titulo}" venció sin completarse`,
                            link: '/calendario-supervisor',
                            referencia_id: act._id.toString(),
                        });
                    }
                }
            }
        } catch (err) {
            console.error('❌ Error cron actividades vencidas:', err.message);
        }
    });

    // ── Cada hora: oportunidades sin movimiento (+7 días) ────────────────
    cron.schedule('0 * * * *', async () => {
        try {
            const hace7dias = new Date();
            hace7dias.setDate(hace7dias.getDate() - 7);

            const gestiones = await Gestion.find({
                'oportunidad.estado': { $in: ['Identificada', 'Propuesta Entregada', 'Negociación'] },
                updatedAt: { $lte: hace7dias },
            }).populate('asesor.id_asesor', 'nombre_user');

            const supervisores = await User.find({ rol_user: { $in: ['supervisor', 'sistemas'] }, estado_user: 'activo' });

            for (const g of gestiones) {
                for (const sup of supervisores) {
                    await crearNotif({
                        usuario: sup._id,
                        tipo: 'oportunidad_sin_movimiento',
                        titulo: 'Oportunidad sin movimiento',
                        mensaje: `La oportunidad "${g.oportunidad?.titulo || g.empresa?.razon_social}" lleva más de 7 días sin cambios`,
                        link: sup.rol_user === 'sistemas' ? '/gestiones-supervisor' : '/funnel-supervisor',
                        referencia_id: g._id.toString(),
                    });
                }
            }
        } catch (err) {
            console.error('❌ Error cron oportunidades sin movimiento:', err.message);
        }
    });

    // ── Diario a medianoche: empresas desasignadas + notificación ────────
    cron.schedule('0 0 * * *', async () => {
        try {
            const ahora = new Date();

            const empresas = await BdGeneral.find({
                estado_base: 'trabajada',
                'asignacion.fecha_desasignacion': { $lte: ahora },
                'asignacion.id_asesor': { $ne: null },
            }).populate('asignacion.id_asesor', 'nombre_user');

            for (const empresa of empresas) {
                const asesorId = empresa.asignacion?.id_asesor?._id || empresa.asignacion?.id_asesor;

                // Notificar al asesor
                if (asesorId) {
                    await crearNotif({
                        usuario: asesorId,
                        tipo: 'empresa_desasignada',
                        titulo: 'Empresa desasignada',
                        mensaje: `La empresa "${empresa.razon_social}" fue desasignada automáticamente por vencimiento del período`,
                        link: '/mi-cartera',
                        referencia_id: empresa._id.toString(),
                    });
                }

                // Desasignar
                empresa.asignacion.id_asesor = null;
                empresa.estado_base = 'disponible';
                await empresa.save();
                console.log(`✅ Empresa desasignada automáticamente: ${empresa.razon_social}`);
            }

            console.log(`🕐 Cron diario ejecutado: ${empresas.length} empresas desasignadas`);
        } catch (err) {
            console.error('❌ Error en cron diario:', err.message);
        }
    });

    console.log('⏰ Cron jobs iniciados');
};

module.exports = iniciarCron;