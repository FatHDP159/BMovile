import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFunnelDollar, faChevronLeft, faChevronRight, faPen,
    faHistory, faPlus, faBullseye
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './Funnel.css';

const ESTADOS = [
    { key: 'Identificada',        label: 'Identificada',        color: 'estado-identificada' },
    { key: 'Propuesta Entregada', label: 'Propuesta Entregada', color: 'estado-propuesta' },
    { key: 'Negociación',         label: 'Negociación',         color: 'estado-negociacion' },
    { key: 'Negociada Aprobada',  label: 'Negociada Aprobada',  color: 'estado-aprobada' },
    { key: 'Negociada Rechazada', label: 'Negociada Rechazada', color: 'estado-rechazada' },
];

const TABS_FUNNEL = [
    { key: 'Identificada',        label: 'Identificada',    num: 1 },
    { key: 'Propuesta Entregada', label: 'Prop. Entregada', num: 2 },
    { key: 'Negociación',         label: 'Negociación',     num: 3 },
    { key: 'Cerrada',             label: 'Cerrada',         num: 4 },
];

const ESTADOS_OPO_COLORS = {
    'Identificada':        { bg: '#ede7f6', text: '#4527a0' },
    'Propuesta Entregada': { bg: '#fff8e1', text: '#f57f17' },
    'Negociación':         { bg: '#e8f5e9', text: '#2e7d32' },
    'Negociada Aprobada':  { bg: '#e3f2fd', text: '#1565c0' },
    'Negociada Rechazada': { bg: '#fce8e6', text: '#c62828' },
};

const PRODUCTOS = ['Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH', 'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'];
const SEGMENTOS = ['Micro', 'Pyme', 'Mayores', 'Empresas', 'Gobierno'];

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const estadoATab = (estado) => {
    if (estado === 'Negociada Aprobada' || estado === 'Negociada Rechazada') return 'Cerrada';
    return estado || 'Identificada';
};

const EstadoBadge = ({ estado }) => {
    const e = ESTADOS.find(e => e.key === estado);
    return <span className={`estado-badge ${e?.color || ''}`}>{e?.label || estado || '—'}</span>;
};

const EstadoOpoBadge = ({ estado }) => {
    const c = ESTADOS_OPO_COLORS[estado];
    if (!c) return <span>{estado || '—'}</span>;
    return <span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{estado}</span>;
};

const DiasCell = ({ fecha }) => {
    const dias = fecha ? 30 - Math.floor((new Date() - new Date(fecha)) / 86400000) : null;
    if (dias === null) return <span>—</span>;
    if (dias > 0) {
        const clase = dias <= 5 ? 'dias-critico' : dias <= 10 ? 'dias-alerta' : 'dias-ok';
        return <span className={`dias-badge ${clase}`}>{dias}d</span>;
    }
    return <span className="dias-badge dias-limbo">+{Math.abs(dias)}d</span>;
};

// ── Modal Gestionar Oportunidad ───────────────────────────────────────────────
const ModalGestionarOpo = ({ ficha, oportunidad, onClose, onGuardado }) => {
    const tabInicial = estadoATab(oportunidad.estado);
    const idxActual = TABS_FUNNEL.findIndex(t => t.key === tabInicial);
    const [tabActivo, setTabActivo] = useState(tabInicial);
    const [resultadoCierre, setResultadoCierre] = useState(
        oportunidad.estado === 'Negociada Aprobada' ? 'Aprobada' :
        oportunidad.estado === 'Negociada Rechazada' ? 'Rechazada' : ''
    );
    const [form, setForm] = useState({
        titulo: oportunidad.titulo || '',
        producto: oportunidad.producto || '',
        cantidad: oportunidad.cantidad || '',
        cargo_fijo: oportunidad.cargo_fijo || '',
        sustento: oportunidad.sustento || false,
        comentario: oportunidad.comentario || '',
        fecha_cierre_esperada: oportunidad.fecha_cierre_esperada ? new Date(oportunidad.fecha_cierre_esperada).toISOString().split('T')[0] : '',
        entel: oportunidad.operadores?.entel || '',
        claro: oportunidad.operadores?.claro || '',
        movistar: oportunidad.operadores?.movistar || '',
        otros: oportunidad.operadores?.otros || '',
        total: oportunidad.operadores?.total || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        if (!form.producto || !form.cantidad || !form.cargo_fijo) { setError('Producto, cantidad y cargo fijo son obligatorios'); return; }
        if (tabActivo === 'Cerrada' && !resultadoCierre) { setError('Selecciona Aprobada o Rechazada'); return; }
        const estadoFinal = tabActivo === 'Cerrada' ? `Negociada ${resultadoCierre}` : tabActivo;
        setLoading(true);
        try {
            await api.put(`/ficha-gestion/${ficha._id}/oportunidades/${oportunidad._id}`, {
                titulo: form.titulo, producto: form.producto,
                cantidad: Number(form.cantidad), cargo_fijo: Number(form.cargo_fijo),
                sustento: form.sustento, comentario: form.comentario || null,
                fecha_cierre_esperada: form.fecha_cierre_esperada || null,
                estado: estadoFinal,
                operadores: { entel: Number(form.entel) || 0, claro: Number(form.claro) || 0, movistar: Number(form.movistar) || 0, otros: Number(form.otros) || 0, total: Number(form.total) || 0 },
            });
            onGuardado(); onClose();
        } catch { setError('Error al guardar'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>
                <h2><FontAwesomeIcon icon={faBullseye} style={{ marginRight: 8 }} />Gestionar Oportunidad</h2>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{ficha.razon_social} — {ficha.ruc}</p>
                {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}

                <div className="funnel-tabs">
                    {TABS_FUNNEL.map((tab, i) => (
                        <button key={tab.key}
                            className={`funnel-tab ${tabActivo === tab.key ? 'active' : ''} ${i < idxActual ? 'blocked' : ''}`}
                            onClick={() => i >= idxActual && setTabActivo(tab.key)}
                            disabled={i < idxActual}
                        >
                            <span className="tab-num">{tab.num}</span> {tab.label}
                        </button>
                    ))}
                </div>

                {tabActivo === 'Cerrada' && (
                    <div className="negociada-selector">
                        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Resultado:</span>
                        <button className={`btn-negociada aprobada ${resultadoCierre === 'Aprobada' ? 'selected' : ''}`} onClick={() => setResultadoCierre('Aprobada')}>✓ Aprobada</button>
                        <button className={`btn-negociada rechazada ${resultadoCierre === 'Rechazada' ? 'selected' : ''}`} onClick={() => setResultadoCierre('Rechazada')}>✕ Rechazada</button>
                    </div>
                )}

                <div className="funnel-form">
                    <div className="form-field"><label>Título</label>
                        <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div className="form-field"><label>Producto *</label>
                            <select className="form-input" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}>
                                <option value="">-- Seleccionar --</option>
                                {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label>Cantidad *</label>
                            <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                        </div>
                        <div className="form-field"><label>Cargo Fijo *</label>
                            <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm(f => ({ ...f, cargo_fijo: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-field"><label>Fecha cierre esperada</label>
                            <input type="date" className="form-input" value={form.fecha_cierre_esperada} onChange={e => setForm(f => ({ ...f, fecha_cierre_esperada: e.target.value }))} />
                        </div>
                        <div className="form-field" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                <input type="checkbox" checked={form.sustento} onChange={e => setForm(f => ({ ...f, sustento: e.target.checked }))} />
                                Sustento cargado
                            </label>
                        </div>
                    </div>
                    <div className="form-field"><label>Operadores actuales</label>
                        <div className="operadores-grid">
                            {['entel', 'claro', 'movistar', 'otros', 'total'].map(op => (
                                <div key={op} className="operador-field">
                                    <label>{op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                    <input type="number" value={form[op]} onChange={e => setForm(f => ({ ...f, [op]: e.target.value }))} min="0" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="form-field"><label>Comentario</label>
                        <textarea className="form-input" rows={3} value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} style={{ resize: 'vertical' }} />
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Nueva Oportunidad ───────────────────────────────────────────────────
const ModalNuevaOpo = ({ ficha, onClose, onGuardado }) => {
    const [form, setForm] = useState({ titulo: '', producto: '', cantidad: '', cargo_fijo: '', fecha_cierre_esperada: '', sustento: false, comentario: '', entel: '', claro: '', movistar: '', otros: '', total: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        if (!form.producto || !form.cantidad || !form.cargo_fijo) { setError('Producto, cantidad y cargo fijo son obligatorios'); return; }
        setLoading(true);
        try {
            await api.post(`/ficha-gestion/${ficha._id}/oportunidades`, {
                titulo: form.titulo, producto: form.producto,
                cantidad: Number(form.cantidad), cargo_fijo: Number(form.cargo_fijo),
                fecha_cierre_esperada: form.fecha_cierre_esperada || null,
                sustento: form.sustento, comentario: form.comentario || null,
                operadores: { entel: Number(form.entel) || 0, claro: Number(form.claro) || 0, movistar: Number(form.movistar) || 0, otros: Number(form.otros) || 0, total: Number(form.total) || 0 },
            });
            onGuardado(); onClose();
        } catch { setError('Error al agregar oportunidad'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
                <h2><FontAwesomeIcon icon={faPlus} style={{ marginRight: 8 }} />Nueva Oportunidad — {ficha.razon_social}</h2>
                {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}
                <div className="form-field"><label>Título</label>
                    <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Fibra 10 líneas" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-field"><label>Producto *</label>
                        <select className="form-input" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}>
                            <option value="">-- Seleccionar --</option>
                            {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="form-field"><label>Cantidad *</label>
                        <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                    </div>
                    <div className="form-field"><label>Cargo Fijo *</label>
                        <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm(f => ({ ...f, cargo_fijo: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field"><label>Fecha cierre esperada</label>
                        <input type="date" className="form-input" value={form.fecha_cierre_esperada} onChange={e => setForm(f => ({ ...f, fecha_cierre_esperada: e.target.value }))} />
                    </div>
                    <div className="form-field" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={form.sustento} onChange={e => setForm(f => ({ ...f, sustento: e.target.checked }))} />
                            Sustento cargado
                        </label>
                    </div>
                </div>
                <div className="form-field"><label>Operadores actuales</label>
                    <div className="operadores-grid">
                        {['entel', 'claro', 'movistar', 'otros', 'total'].map(op => (
                            <div key={op} className="operador-field">
                                <label>{op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                <input type="number" value={form[op]} onChange={e => setForm(f => ({ ...f, [op]: e.target.value }))} min="0" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="form-field"><label>Comentario</label>
                    <textarea className="form-input" rows={2} value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>{loading ? 'Guardando...' : 'Agregar'}</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal principal de ficha (Editar) ─────────────────────────────────────────
const ModalFicha = ({ ficha: fichaInicial, onClose, onGuardado, esSupervisor }) => {
    const [ficha, setFicha] = useState(fichaInicial);
    const [modalGestionarOpo, setModalGestionarOpo] = useState(null);
    const [modalNuevaOpo, setModalNuevaOpo] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);

    const recargar = async () => {
        try {
            const res = await api.get(`/ficha-gestion/${ficha._id}`);
            setFicha(res.data);
            onGuardado();
        } catch (err) { console.error(err); }
    };

    const opoMasAvanzada = () => {
        if (!ficha.oportunidades?.length) return null;
        const orden = ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'];
        return ficha.oportunidades.reduce((best, opo) =>
            orden.indexOf(opo.estado) > orden.indexOf(best.estado) ? opo : best
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
                {/* Header */}
                <div className="funnel-modal-header">
                    <div>
                        <div className="funnel-modal-ruc">{ficha.ruc}</div>
                        <div className="funnel-modal-empresa">{ficha.razon_social}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                            Segmento: {ficha.segmento || '—'} · Líneas: {ficha.total_lineas || 0}
                            {esSupervisor && ficha.asesor?.id_asesor?.nombre_user && (
                                <span> · Asesor: {ficha.asesor.id_asesor.nombre_user}</span>
                            )}
                        </div>
                    </div>
                    <EstadoBadge estado={opoMasAvanzada()?.estado} />
                </div>

                {/* Botones superiores */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowHistorial(v => !v)}>
                        <FontAwesomeIcon icon={faHistory} style={{ marginRight: 6 }} />
                        {showHistorial ? 'Ocultar historial' : 'Ver historial de oportunidades'}
                    </button>
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => setModalNuevaOpo(true)}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Nueva Oportunidad
                    </button>
                </div>

                {/* Historial de oportunidades */}
                {showHistorial && (
                    <div style={{ marginBottom: 20, background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
                        <h3 style={{ fontSize: 13, marginBottom: 12, color: '#1a1a2e' }}>Historial de Oportunidades</h3>
                        {ficha.oportunidades?.length === 0 ? (
                            <p style={{ color: '#999', fontSize: 13 }}>Sin oportunidades registradas</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {ficha.oportunidades.map((opo, i) => (
                                    <div key={opo._id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px', background: '#fff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{opo.titulo || opo.producto || `Oportunidad ${i + 1}`}</div>
                                            <EstadoOpoBadge estado={opo.estado} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 12, color: '#555' }}>
                                            <div><span style={{ color: '#888' }}>Producto:</span> {opo.producto || '—'}</div>
                                            <div><span style={{ color: '#888' }}>Cantidad:</span> {opo.cantidad || 0}</div>
                                            <div><span style={{ color: '#888' }}>Cargo fijo:</span> S/. {opo.cargo_fijo || 0}</div>
                                            <div><span style={{ color: '#888' }}>Creada:</span> {fmt(opo.fecha_creacion)}</div>
                                            <div><span style={{ color: '#888' }}>Cierre esp.:</span> {fmt(opo.fecha_cierre_esperada)}</div>
                                            <div><span style={{ color: '#888' }}>Ganada:</span> {fmt(opo.fecha_ganada)}</div>
                                        </div>
                                        {opo.comentario && (
                                            <div style={{ fontSize: 12, color: '#555', background: '#f5f5f5', borderRadius: 4, padding: '4px 8px', marginTop: 6 }}>{opo.comentario}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Oportunidades activas con btn Gestionar */}
                <h3 style={{ fontSize: 13, marginBottom: 10, color: '#1a1a2e' }}>
                    Oportunidades activas ({ficha.oportunidades?.filter(o => o.estado !== 'Negociada Aprobada' && o.estado !== 'Negociada Rechazada').length || 0})
                </h3>
                {ficha.oportunidades?.filter(o => o.estado !== 'Negociada Aprobada' && o.estado !== 'Negociada Rechazada').length === 0 ? (
                    <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Sin oportunidades activas</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {ficha.oportunidades.filter(o => o.estado !== 'Negociada Aprobada' && o.estado !== 'Negociada Rechazada').map((opo, i) => (
                            <div key={opo._id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{opo.titulo || opo.producto || `Oportunidad ${i + 1}`}</div>
                                        <EstadoOpoBadge estado={opo.estado} />
                                    </div>
                                    <button className="btn-estado btn-asignar" style={{ fontSize: 11 }} onClick={() => setModalGestionarOpo(opo)}>
                                        <FontAwesomeIcon icon={faPen} /> Gestionar
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 12, color: '#555' }}>
                                    <div><span style={{ color: '#888' }}>Producto:</span> {opo.producto || '—'}</div>
                                    <div><span style={{ color: '#888' }}>Cantidad:</span> {opo.cantidad || 0}</div>
                                    <div><span style={{ color: '#888' }}>Cargo fijo:</span> S/. {opo.cargo_fijo || 0}</div>
                                    <div><span style={{ color: '#888' }}>Sustento:</span> {opo.sustento ? '✅ Sí' : '❌ No'}</div>
                                    <div><span style={{ color: '#888' }}>Cierre esp.:</span> {fmt(opo.fecha_cierre_esperada)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                </div>

                {/* Sub-modales */}
                {modalGestionarOpo && (
                    <ModalGestionarOpo
                        ficha={ficha}
                        oportunidad={modalGestionarOpo}
                        onClose={() => setModalGestionarOpo(null)}
                        onGuardado={() => { setModalGestionarOpo(null); recargar(); }}
                    />
                )}
                {modalNuevaOpo && (
                    <ModalNuevaOpo
                        ficha={ficha}
                        onClose={() => setModalNuevaOpo(false)}
                        onGuardado={() => { setModalNuevaOpo(false); recargar(); }}
                    />
                )}
            </div>
        </div>
    );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Funnel = ({ esSupervisor = false }) => {
    const [fichas, setFichas] = useState([]);
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
    const [modalFicha, setModalFicha] = useState(null);
    const [asesores, setAsesores] = useState([]);
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const searchTimeout = useRef();

    const endpoint = esSupervisor ? '/ficha-gestion/funnel-supervisor' : '/ficha-gestion/funnel';

    useEffect(() => {
        if (esSupervisor) {
            api.get('/users').then(res => setAsesores(res.data.filter(u => u.rol_user === 'asesor'))).catch(console.error);
        }
    }, [esSupervisor]);

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get(endpoint, {
                params: { busqueda, segmento, lineas_min: lineasMin, lineas_max: lineasMax, estados: estadosSel.join(','), asesor: filtroAsesor, page: p, limit: 50 },
            });
            setFichas(res.data.fichas);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, estadosSel, segmento, lineasMin, lineasMax, filtroAsesor]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, estadosSel, segmento, lineasMin, lineasMax, filtroAsesor]);

    const toggleEstado = (key) => setEstadosSel(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]);

    // Oportunidad más avanzada de la ficha
    const opoMasAvanzada = (ficha) => {
        if (!ficha.oportunidades?.length) return null;
        const orden = ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'];
        return ficha.oportunidades.reduce((best, opo) =>
            orden.indexOf(opo.estado) > orden.indexOf(best.estado) ? opo : best
        );
    };

    return (
        <div>
            <div className="page-header">
                <h1>
                    <FontAwesomeIcon icon={faFunnelDollar} /> Funnel
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} empresas</span>
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
                    : fichas.length === 0 ? <p style={{ padding: 20, color: '#999' }}>No se encontraron oportunidades.</p>
                    : (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Último contacto</th>
                                        <th>RUC</th>
                                        <th>Razón Social</th>
                                        {esSupervisor && <th>Asesor</th>}
                                        <th>Segmento</th>
                                        <th>Líneas</th>
                                        <th>Días</th>
                                        <th>Estado oportunidad</th>
                                        <th>Oportunidades</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fichas.map(f => {
                                        const opo = opoMasAvanzada(f);
                                        return (
                                            <tr key={f._id}>
                                                <td>{fmt(f.fechas?.fecha_ultimo_contacto)}</td>
                                                <td style={{ fontWeight: 600, color: '#3949ab' }}>{f.ruc}</td>
                                                <td>{f.razon_social}</td>
                                                {esSupervisor && <td>{f.asesor?.id_asesor?.nombre_user || '—'}</td>}
                                                <td>{f.segmento || '—'}</td>
                                                <td>{f.total_lineas || '—'}</td>
                                                <td><DiasCell fecha={f.fechas?.fecha_ultimo_contacto} /></td>
                                                <td><EstadoBadge estado={opo?.estado} /></td>
                                                <td>
                                                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                                                        {f.oportunidades?.length || 0}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn-estado btn-asignar" onClick={() => setModalFicha(f)}>
                                                        <FontAwesomeIcon icon={faPen} /> Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <span style={{ fontSize: 13, color: '#666' }}>Página {page} de {totalPages} — {total} empresas</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                        <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
            </div>

            {modalFicha && (
                <ModalFicha
                    ficha={modalFicha}
                    esSupervisor={esSupervisor}
                    onClose={() => setModalFicha(null)}
                    onGuardado={() => cargar(page)}
                />
            )}
        </div>
    );
};

export default Funnel;