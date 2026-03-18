import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFunnelDollar, faChevronLeft, faChevronRight, faPen
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './Funnel.css';

const ESTADOS = [
    { key: 'Identificada',          label: 'Identificada',          color: 'estado-identificada' },
    { key: 'Propuesta Entregada',   label: 'Propuesta Entregada',   color: 'estado-propuesta' },
    { key: 'Negociación',           label: 'Negociación',           color: 'estado-negociacion' },
    { key: 'Negociada Aprobada',    label: 'Negociada Aprobada',    color: 'estado-aprobada' },
    { key: 'Negociada Rechazada',   label: 'Negociada Rechazada',   color: 'estado-rechazada' },
];

const ORDEN_ESTADOS = ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'];
const PRODUCTOS = ['Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH', 'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'];
const SEGMENTOS = ['Micro', 'Pequeña Empresa', 'Mediana Empresa', 'Gran Empresa', 'Pyme'];

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const DiasCell = ({ fechaTipificacion }) => {
    const dias = fechaTipificacion ? 30 - Math.floor((new Date() - new Date(fechaTipificacion)) / 86400000) : null;
    if (dias === null) return <span>—</span>;
    if (dias > 0) {
        const clase = dias <= 5 ? 'dias-critico' : dias <= 10 ? 'dias-alerta' : 'dias-ok';
        return <span className={`dias-badge ${clase}`}>{dias}d</span>;
    }
    return <span className="dias-badge dias-limbo">+{Math.abs(dias)}d</span>;
};

const EstadoBadge = ({ estado }) => {
    const e = ESTADOS.find(e => e.key === estado);
    return <span className={`estado-badge ${e?.color || ''}`}>{e?.label || estado}</span>;
};

// ── Modal Gestión ────────────────────────────────────────────────────────────
const ModalGestion = ({ gestion, onClose, onGuardado }) => {
    const estadoActual = gestion.oportunidad?.estado || 'Identificada';
    const idxActual = ORDEN_ESTADOS.indexOf(estadoActual);
    const tabInicial = ['Negociada Aprobada','Negociada Rechazada'].includes(estadoActual) ? 'Negociación' : estadoActual;
    const [tabActivo, setTabActivo] = useState(tabInicial);
    const [negociadaRes, setNegociadaRes] = useState(
        estadoActual === 'Negociada Aprobada' ? 'Aprobada' :
        estadoActual === 'Negociada Rechazada' ? 'Rechazada' : ''
    );
    const [form, setForm] = useState({
        titulo: gestion.oportunidad?.titulo || '',
        producto: gestion.oportunidad?.producto || '',
        cantidad: gestion.oportunidad?.cantidad || '',
        cargo_fijo: gestion.oportunidad?.cargo_fijo || '',
        contacto_nombre: gestion.contacto?.nombre || '',
        contacto_telefono: gestion.contacto?.telefono || '',
        sustento: gestion.oportunidad?.sustento || false,
        comentario: gestion.oportunidad?.comentario || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const tabsVisibles = ['Identificada', 'Propuesta Entregada', 'Negociación'];

    const handleGuardar = async () => {
        if (!form.producto || !form.cantidad || !form.cargo_fijo) {
            setError('Producto, Cantidad y Cargo Fijo son obligatorios'); return;
        }
        if (tabActivo === 'Negociación' && !negociadaRes) {
            setError('Debes seleccionar Aprobada o Rechazada'); return;
        }
        const estadoFinal = tabActivo === 'Negociación' ? `Negociada ${negociadaRes}` : tabActivo;
        setLoading(true);
        try {
            await api.put(`/gestiones/${gestion._id}`, {
                contacto: { nombre: form.contacto_nombre, telefono: form.contacto_telefono, dni: gestion.contacto?.dni || '' },
                oportunidad: {
                    titulo: form.titulo, producto: form.producto,
                    cantidad: Number(form.cantidad), cargo_fijo: Number(form.cargo_fijo),
                    operadores: gestion.oportunidad?.operadores || {},
                    estado: estadoFinal, sustento: form.sustento, comentario: form.comentario,
                },
            });
            onGuardado(); onClose();
        } catch (err) {
            setError('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <div className="funnel-modal-header">
                    <div>
                        <div className="funnel-modal-ruc">{gestion.ruc}</div>
                        <div className="funnel-modal-empresa">{gestion.razon_social}</div>
                    </div>
                    <EstadoBadge estado={estadoActual} />
                </div>

                {error && <p style={{ color: 'red', margin: '8px 0', fontSize: 12 }}>{error}</p>}

                <div className="funnel-tabs">
                    {tabsVisibles.map((tab, i) => {
                        const idxTab = ORDEN_ESTADOS.indexOf(tab);
                        const bloqueado = idxTab < idxActual && !['Negociada Aprobada','Negociada Rechazada'].includes(estadoActual);
                        const activo = tabActivo === tab;
                        return (
                            <button key={tab}
                                className={`funnel-tab ${activo ? 'active' : ''} ${bloqueado ? 'blocked' : ''}`}
                                onClick={() => !bloqueado && setTabActivo(tab)}
                                disabled={bloqueado}
                            >
                                <span className="tab-num">{i + 1}</span> {tab}
                            </button>
                        );
                    })}
                </div>

                {tabActivo === 'Negociación' && (
                    <div className="negociada-selector">
                        <span style={{ fontSize: 12, color: '#666' }}>Resultado:</span>
                        <button className={`btn-negociada aprobada ${negociadaRes === 'Aprobada' ? 'selected' : ''}`} onClick={() => setNegociadaRes('Aprobada')}>✓ Aprobada</button>
                        <button className={`btn-negociada rechazada ${negociadaRes === 'Rechazada' ? 'selected' : ''}`} onClick={() => setNegociadaRes('Rechazada')}>✕ Rechazada</button>
                    </div>
                )}

                <div className="funnel-form">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-field">
                            <label>Nombre Contacto</label>
                            <input className="form-input" value={form.contacto_nombre} onChange={e => setForm(f => ({ ...f, contacto_nombre: e.target.value }))} />
                        </div>
                        <div className="form-field">
                            <label>Teléfono Contacto</label>
                            <input className="form-input" value={form.contacto_telefono} onChange={e => setForm(f => ({ ...f, contacto_telefono: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-field">
                        <label>Título de Oportunidad</label>
                        <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Renovación 20 líneas" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div className="form-field">
                            <label>Producto *</label>
                            <select className="form-input" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}>
                                <option value="">-- Seleccionar --</option>
                                {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Cantidad *</label>
                            <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                        </div>
                        <div className="form-field">
                            <label>Cargo Fijo (S/.) *</label>
                            <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm(f => ({ ...f, cargo_fijo: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
                        <span style={{ fontSize: 13, color: '#555' }}>Sustento:</span>
                        <label className="toggle-label">
                            <input type="checkbox" checked={form.sustento} onChange={e => setForm(f => ({ ...f, sustento: e.target.checked }))} />
                            <span className="toggle-slider"></span>
                            <span className={`toggle-text ${form.sustento ? 'si' : 'no'}`}>{form.sustento ? 'Sí' : 'No'}</span>
                        </label>
                    </div>
                    <div className="form-field">
                        <label>Comentario de Gestión</label>
                        <textarea className="form-input" rows={3} value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} placeholder="Bitácora del asesor..." style={{ resize: 'vertical' }} />
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Estado'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Página principal ─────────────────────────────────────────────────────────
const Funnel = ({ esSupervisor = false }) => {
    const [gestiones, setGestiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [estadosSel, setEstadosSel] = useState([]);
    const [segmento, setSegmento] = useState('');
    const [lineasMin, setLineasMin] = useState('');
    const [lineasMax, setLineasMax] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [modalGestion, setModalGestion] = useState(null);
    const [asesores, setAsesores] = useState([]);
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const searchTimeout = useRef();

    const endpoint = esSupervisor ? '/gestiones/funnel-supervisor' : '/gestiones/funnel';

    useEffect(() => {
        if (esSupervisor) {
            api.get('/users').then(res => setAsesores(res.data.filter(u => u.rol_user === 'asesor'))).catch(console.error);
        }
    }, [esSupervisor]);

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get(endpoint, {
                params: { busqueda, segmento, lineas_min: lineasMin, lineas_max: lineasMax, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, estados: estadosSel, asesor: filtroAsesor, page: p, limit: 50 },
            });
            setGestiones(res.data.gestiones);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, estadosSel, segmento, lineasMin, lineasMax, fechaDesde, fechaHasta, filtroAsesor]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, estadosSel, segmento, lineasMin, lineasMax, fechaDesde, fechaHasta, filtroAsesor]);

    const toggleEstado = (key) => setEstadosSel(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]);

    return (
        <div>
            <div className="page-header">
                <h1>
                    <FontAwesomeIcon icon={faFunnelDollar} /> Funnel
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} oportunidades</span>
                </h1>
            </div>

            <div className="search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ minWidth: 220 }} />
                <select className="filter-select" value={segmento} onChange={e => setSegmento(e.target.value)}>
                    <option value="">Todos los segmentos</option>
                    {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {esSupervisor && (
                    <select className="filter-select" value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
                        <option value="">Todos los asesores</option>
                        {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre_user}</option>)}
                    </select>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                    Líneas:
                    <input type="number" className="filter-select" placeholder="Mín" value={lineasMin} onChange={e => setLineasMin(e.target.value)} style={{ width: 70 }} />
                    —
                    <input type="number" className="filter-select" placeholder="Máx" value={lineasMax} onChange={e => setLineasMax(e.target.value)} style={{ width: 70 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                    Desde: <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    Hasta: <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            <div className="estados-filter">
                {ESTADOS.map(e => (
                    <button key={e.key} className={`estado-filter-btn ${estadosSel.includes(e.key) ? 'active' : ''} ${e.color}`} onClick={() => toggleEstado(e.key)}>
                        {e.label}
                    </button>
                ))}
                {estadosSel.length > 0 && (
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEstadosSel([])}>Limpiar</button>
                )}
            </div>

            <div className="table-container">
                {loading ? <p style={{ padding: 20 }}>Cargando...</p>
                : gestiones.length === 0 ? <p style={{ padding: 20, color: '#999' }}>No se encontraron oportunidades.</p>
                : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>RUC</th>
                                    <th>Razón Social</th>
                                    {esSupervisor && <th>Asesor</th>}
                                    <th>Segmento</th>
                                    <th>Líneas</th>
                                    <th>Días</th>
                                    <th>Estado</th>
                                    <th>Sustento</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gestiones.map(g => (
                                    <tr key={g._id}>
                                        <td>{fmt(g.fechas?.fecha_tipificacion)}</td>
                                        <td style={{ fontWeight: 600, color: '#3949ab' }}>{g.ruc}</td>
                                        <td>{g.razon_social}</td>
                                        {esSupervisor && <td>{g.asesor?.id_asesor?.nombre_user || '—'}</td>}
                                        <td>{g.segmento || '—'}</td>
                                        <td>{g.total_lineas || '—'}</td>
                                        <td><DiasCell fechaTipificacion={g.fechas?.fecha_tipificacion} /></td>
                                        <td><EstadoBadge estado={g.oportunidad?.estado} /></td>
                                        <td><span className={`sustento-badge ${g.oportunidad?.sustento ? 'si' : 'no'}`}>{g.oportunidad?.sustento ? 'Sí' : 'No'}</span></td>
                                        <td>
                                            <button className="btn-estado btn-asignar" onClick={() => setModalGestion(g)}>
                                                <FontAwesomeIcon icon={faPen} /> Gestionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                <span style={{ fontSize: 13, color: '#666' }}>Página {page} de {totalPages} — {total} oportunidades</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                    <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalGestion && <ModalGestion gestion={modalGestion} onClose={() => setModalGestion(null)} onGuardado={() => cargar(page)} />}
        </div>
    );
};

export default Funnel;