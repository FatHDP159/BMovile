import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt, faPlus, faChevronLeft, faChevronRight,
    faPhone, faHandshake, faClipboardList, faPaperPlane,
    faRotate, faPen, faTrash, faCheck, faBan, faExclamationTriangle,
    faUser
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Usuarios.css';
import './Calendario.css';

const TIPOS = {
    llamada:            { label: 'Llamada',           icon: faPhone,         color: '#e3f2fd', text: '#1565c0' },
    reunion:            { label: 'Reunión',            icon: faHandshake,     color: '#e8f5e9', text: '#2e7d32' },
    tarea:              { label: 'Tarea',              icon: faClipboardList, color: '#fff8e1', text: '#f57f17' },
    enviar_informacion: { label: 'Enviar información', icon: faPaperPlane,    color: '#f3e5f5', text: '#6a1b9a' },
    seguimiento:        { label: 'Seguimiento',        icon: faRotate,        color: '#fce8e6', text: '#c62828' },
};

const TIPOS_ASESOR = ['llamada', 'reunion', 'enviar_informacion', 'seguimiento'];

const PRIORIDADES = {
    alta:  { label: 'Alta',  color: '#fce8e6', text: '#c62828' },
    media: { label: 'Media', color: '#fff8e1', text: '#f57f17' },
    baja:  { label: 'Baja',  color: '#e8f5e9', text: '#2e7d32' },
};

const RECORDATORIOS = [
    { value: '10min', label: '10 minutos antes' },
    { value: '30min', label: '30 minutos antes' },
    { value: '1hora', label: '1 hora antes' },
    { value: '1dia',  label: '1 día antes' },
];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HORAS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2,'0')}:00`);

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const esHoy = (fecha) => {
    const hoy = new Date();
    const d = new Date(fecha);
    return d.getDate() === hoy.getDate() && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
};

// ── Modal Actividad (solo para actividades propias del supervisor) ────────────
const ModalActividad = ({ actividad, clientes, onClose, onGuardado }) => {
    const [form, setForm] = useState({
        tipo: actividad?.tipo || 'llamada',
        titulo: actividad?.titulo || '',
        descripcion: actividad?.descripcion || '',
        fecha: actividad?.fecha ? new Date(actividad.fecha).toISOString().split('T')[0] : '',
        hora: actividad?.hora || '09:00',
        estado: actividad?.estado || 'pendiente',
        prioridad: actividad?.prioridad || 'media',
        recordatorio: actividad?.recordatorio || '',
        cliente_id: actividad?.cliente?.id_gestion || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        if (!form.titulo.trim() || !form.fecha || !form.hora) {
            setError('Título, fecha y hora son obligatorios'); return;
        }
        setLoading(true);
        try {
            const clienteSel = clientes.find(c => c._id === form.cliente_id);
            const payload = {
                tipo: form.tipo, titulo: form.titulo, descripcion: form.descripcion,
                fecha: form.fecha, hora: form.hora, estado: form.estado,
                prioridad: form.prioridad, recordatorio: form.recordatorio || null,
                cliente: clienteSel ? { id_gestion: clienteSel._id, ruc: clienteSel.ruc, razon_social: clienteSel.razon_social } : {},
            };
            if (actividad?._id) {
                await api.put(`/actividades/supervisor/${actividad._id}`, payload);
            } else {
                await api.post('/actividades/supervisor', payload);
            }
            onGuardado(); onClose();
        } catch (err) {
            setError('Error al guardar actividad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <h2>{actividad?._id ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
                {error && <p style={{ color: 'red', marginBottom: 12, fontSize: 12 }}>{error}</p>}
                <div className="tipo-selector">
                    {Object.entries(TIPOS).map(([key, t]) => (
                        <button key={key}
                            className={`tipo-btn ${form.tipo === key ? 'active' : ''}`}
                            style={form.tipo === key ? { background: t.color, color: t.text, borderColor: t.text } : {}}
                            onClick={() => setForm(f => ({ ...f, tipo: key }))}
                        >
                            <FontAwesomeIcon icon={t.icon} /> {t.label}
                        </button>
                    ))}
                </div>
                <div className="form-field">
                    <label>Cliente (Funnel)</label>
                    <select className="form-input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                        <option value="">-- Sin cliente --</option>
                        {clientes.map(c => <option key={c._id} value={c._id}>{c.razon_social} ({c.ruc})</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label>Título *</label>
                    <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Llamar para confirmar propuesta" />
                </div>
                <div className="form-field">
                    <label>Descripción / Notas</label>
                    <textarea className="form-input" rows={3} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Detalles adicionales..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field">
                        <label>Fecha *</label>
                        <input type="date" className="form-input" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                    </div>
                    <div className="form-field">
                        <label>Hora *</label>
                        <input type="time" className="form-input" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field">
                        <label>Prioridad</label>
                        <select className="form-input" value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                            <option value="alta">Alta</option>
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                        </select>
                    </div>
                    <div className="form-field">
                        <label>Estado</label>
                        <select className="form-input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                            <option value="pendiente">Pendiente</option>
                            <option value="completado">Completado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>
                <div className="form-field">
                    <label>Recordatorio</label>
                    <select className="form-input" value={form.recordatorio} onChange={e => setForm(f => ({ ...f, recordatorio: e.target.value }))}>
                        <option value="">Sin recordatorio</option>
                        {RECORDATORIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Tarjeta de actividad ─────────────────────────────────────────────────────
const ActividadCard = ({ act, esMia, ahora, onEditar, onCambiarEstado, onEliminar, compacto = false }) => {
    const tipo = TIPOS[act.tipo];
    const prio = PRIORIDADES[act.prioridad];
    const dt = new Date(act.fecha);
    const [h, m] = act.hora.split(':');
    dt.setHours(Number(h), Number(m), 0, 0);
    const vencida = act.estado === 'pendiente' && dt < ahora;
    const nombreAsesor = act.asesor?.nombre_user;

    return (
        <div className={`act-card ${compacto ? 'compacto' : ''} ${vencida ? 'vencida' : ''} estado-${act.estado} ${!esMia ? 'act-card-asesor' : ''}`}>
            <div className="act-card-header">
                <span className="act-tipo-badge" style={{ background: tipo.color, color: tipo.text }}>
                    <FontAwesomeIcon icon={tipo.icon} /> {tipo.label}
                </span>
                <span className="act-hora">{act.hora}</span>
            </div>
            <div className="act-titulo">{act.titulo}</div>
            {!esMia && nombreAsesor && (
                <div className="act-asesor-tag">
                    <FontAwesomeIcon icon={faUser} /> {nombreAsesor}
                </div>
            )}
            {act.cliente?.razon_social && !compacto && (
                <div className="act-cliente">{act.cliente.razon_social}</div>
            )}
            <div className="act-footer">
                <span className="act-prio" style={{ background: prio.color, color: prio.text }}>{prio.label}</span>
                {vencida && <span className="act-vencida-badge"><FontAwesomeIcon icon={faExclamationTriangle} /> Vencida</span>}
                {esMia && !compacto && (
                    <div className="act-acciones">
                        {act.estado === 'pendiente' && (
                            <button className="act-btn completar" onClick={() => onCambiarEstado(act._id, 'completado')} title="Completar"><FontAwesomeIcon icon={faCheck} /></button>
                        )}
                        {act.estado === 'pendiente' && (
                            <button className="act-btn cancelar" onClick={() => onCambiarEstado(act._id, 'cancelado')} title="Cancelar"><FontAwesomeIcon icon={faBan} /></button>
                        )}
                        <button className="act-btn editar" onClick={() => onEditar(act)} title="Editar"><FontAwesomeIcon icon={faPen} /></button>
                        <button className="act-btn eliminar" onClick={() => onEliminar(act._id)} title="Eliminar"><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Página principal ─────────────────────────────────────────────────────────
const CalendarioSupervisor = () => {
    const { user } = useAuth();
    const [actividades, setActividades] = useState([]);
    const [actHoy, setActHoy] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const [semanaOffset, setSemanaOffset] = useState(0);
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [modalAct, setModalAct] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [ahora, setAhora] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setAhora(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const getSemana = (offset = 0) => {
        const hoy = new Date();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - hoy.getDay() + 1 + offset * 7);
        lunes.setHours(0, 0, 0, 0);
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59, 999);
        return { lunes, domingo };
    };

    const cargar = useCallback(async () => {
        try {
            const { lunes, domingo } = getSemana(semanaOffset);
            const params = { fecha_inicio: lunes.toISOString(), fecha_fin: domingo.toISOString() };
            if (filtroAsesor) params.asesor_id = filtroAsesor;

            const [semRes, hoyRes, pendRes, funnelRes, asesoresRes] = await Promise.all([
                api.get('/actividades/supervisor/semana', { params }),
                api.get('/actividades/supervisor/hoy'),
                api.get('/actividades/supervisor/pendientes'),
                api.get('/gestiones/funnel-supervisor', { params: { limit: 100 } }),
                api.get('/users'),
            ]);
            setActividades(semRes.data);
            setActHoy(hoyRes.data);
            setPendientes(pendRes.data);
            setClientes(funnelRes.data.gestiones || []);
            setAsesores(asesoresRes.data.filter(u => u.rol_user === 'asesor'));
        } catch (err) { console.error(err); }
    }, [semanaOffset, filtroAsesor]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleCambiarEstado = async (id, estado) => {
        try { await api.put(`/actividades/supervisor/${id}`, { estado }); cargar(); }
        catch (err) { console.error(err); }
    };

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Eliminar esta actividad?')) return;
        try { await api.delete(`/actividades/supervisor/${id}`); cargar(); }
        catch (err) { console.error(err); }
    };

    const { lunes } = getSemana(semanaOffset);
    const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        return d;
    });

    const actsPorDiaHora = (dia, hora) => {
        return actividades.filter(a => {
            const fd = new Date(a.fecha);
            return fd.getDate() === dia.getDate() && fd.getMonth() === dia.getMonth() &&
                fd.getFullYear() === dia.getFullYear() && a.hora.startsWith(hora.split(':')[0]);
        });
    };

    const esMia = (act) => act.asesor?._id === user?.id || act.asesor === user?.id;

    const pendientesVencidas = pendientes.filter(a => {
        const dt = new Date(a.fecha);
        const [h, m] = a.hora.split(':');
        dt.setHours(Number(h), Number(m), 0, 0);
        return dt < ahora;
    });
    const pendientesProximas = pendientes.filter(a => {
        const dt = new Date(a.fecha);
        const [h, m] = a.hora.split(':');
        dt.setHours(Number(h), Number(m), 0, 0);
        return dt >= ahora;
    });

    const hoyStr = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="calendario-page">
            <div className="page-header">
                <h1><FontAwesomeIcon icon={faCalendarAlt} /> Calendario</h1>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select className="filter-select" value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
                        <option value="">Todos los asesores</option>
                        {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre_user}</option>)}
                    </select>
                    <button className="btn-primary" onClick={() => { setModalAct({}); setModalAbierto(true); }}>
                        <FontAwesomeIcon icon={faPlus} /> Nueva Actividad
                    </button>
                </div>
            </div>

            {/* Panel del día */}
            <div className="panel-hoy">
                <div className="panel-hoy-header">
                    <h3>Hoy — {hoyStr}</h3>
                    <div className="panel-hoy-stats">
                        <span className="stat-badge pendiente">{actHoy.filter(a => a.estado === 'pendiente').length} pendientes</span>
                        <span className="stat-badge vencida">{pendientesVencidas.length} vencidas</span>
                        <span className="stat-badge proxima">{pendientesProximas.length} próximas</span>
                    </div>
                </div>
                <div className="panel-hoy-lista">
                    {actHoy.length === 0 ? (
                        <p className="sin-actividades">Sin actividades para hoy</p>
                    ) : (
                        actHoy.map(a => (
                            <ActividadCard key={a._id} act={a} compacto ahora={ahora} esMia={esMia(a)}
                                onEditar={act => { setModalAct(act); setModalAbierto(true); }}
                                onCambiarEstado={handleCambiarEstado}
                                onEliminar={handleEliminar}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Calendario semanal */}
            <div className="cal-container">
                <div className="cal-nav">
                    <button className="btn-secondary" onClick={() => setSemanaOffset(o => o - 1)}><FontAwesomeIcon icon={faChevronLeft} /></button>
                    <span className="cal-semana-label">{fmt(diasSemana[0])} — {fmt(diasSemana[6])}</span>
                    <button className="btn-secondary" onClick={() => setSemanaOffset(o => o + 1)}><FontAwesomeIcon icon={faChevronRight} /></button>
                    {semanaOffset !== 0 && <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => setSemanaOffset(0)}>Hoy</button>}
                </div>
                <div className="cal-grid">
                    <div className="cal-hora-col" />
                    {diasSemana.map((dia, i) => (
                        <div key={i} className={`cal-dia-header ${esHoy(dia) ? 'hoy' : ''}`}>
                            <span className="cal-dia-nombre">{DIAS[dia.getDay()]}</span>
                            <span className="cal-dia-num">{dia.getDate()}</span>
                        </div>
                    ))}
                    {HORAS.map(hora => (
                        <>
                            <div key={`h-${hora}`} className="cal-hora-label">{hora}</div>
                            {diasSemana.map((dia, i) => {
                                const acts = actsPorDiaHora(dia, hora);
                                return (
                                    <div key={`${i}-${hora}`} className={`cal-celda ${esHoy(dia) ? 'hoy' : ''}`}>
                                        {acts.map(a => {
                                            const tipo = TIPOS[a.tipo];
                                            const mia = esMia(a);
                                            return (
                                                <div key={a._id} className="cal-act-bloque"
                                                    style={{ background: tipo.color, borderLeft: `3px solid ${tipo.text}`, opacity: mia ? 1 : 0.7 }}
                                                    onClick={() => mia && (setModalAct(a), setModalAbierto(true))}
                                                    title={`${a.titulo}${!mia ? ` (${a.asesor?.nombre_user})` : ''}`}
                                                >
                                                    <span style={{ color: tipo.text }}><FontAwesomeIcon icon={tipo.icon} /></span>
                                                    <span className="cal-act-titulo">{a.titulo}</span>
                                                    {!mia && <span style={{ fontSize: 9, color: tipo.text, marginLeft: 2 }}>({a.asesor?.nombre_user})</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </>
                    ))}
                </div>
            </div>

            {/* Panel pendientes */}
            <div className="panel-pendientes">
                {pendientesVencidas.length > 0 && (
                    <div className="pendientes-seccion">
                        <h4><FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#c62828', marginRight: 6 }} />Vencidas ({pendientesVencidas.length})</h4>
                        <div className="pendientes-lista">
                            {pendientesVencidas.map(a => (
                                <ActividadCard key={a._id} act={a} ahora={ahora} esMia={esMia(a)}
                                    onEditar={act => { setModalAct(act); setModalAbierto(true); }}
                                    onCambiarEstado={handleCambiarEstado}
                                    onEliminar={handleEliminar}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {pendientesProximas.length > 0 && (
                    <div className="pendientes-seccion">
                        <h4>Próximas ({pendientesProximas.length})</h4>
                        <div className="pendientes-lista">
                            {pendientesProximas.slice(0, 5).map(a => (
                                <ActividadCard key={a._id} act={a} ahora={ahora} esMia={esMia(a)}
                                    onEditar={act => { setModalAct(act); setModalAbierto(true); }}
                                    onCambiarEstado={handleCambiarEstado}
                                    onEliminar={handleEliminar}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {modalAbierto && (
                <ModalActividad
                    actividad={modalAct?._id ? modalAct : null}
                    clientes={clientes}
                    onClose={() => { setModalAbierto(false); setModalAct(null); }}
                    onGuardado={cargar}
                />
            )}
        </div>
    );
};

export default CalendarioSupervisor;