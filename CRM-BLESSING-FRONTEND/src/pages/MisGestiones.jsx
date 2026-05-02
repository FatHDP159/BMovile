import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClipboardList, faChevronLeft, faChevronRight, faEye,
    faPhone, faIdCard, faBriefcase, faComment, faPlus,
    faHistory, faBullseye, faCheckCircle, faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './MisGestiones.css';

const TIPOS_INTERACCION = [
    { key: 'llamada',                    label: 'Llamada',                    color: 'tipo-interesado' },
    { key: 'sin_contacto',               label: 'Sin Contacto',               color: 'tipo-sin-contacto' },
    { key: 'con_deuda',                  label: 'Con Deuda',                  color: 'tipo-deuda' },
    { key: 'no_contesta',                label: 'No Contesta',                color: 'tipo-no-contesta' },
    { key: 'cliente_claro',              label: 'Cliente Claro',              color: 'tipo-claro' },
    { key: 'cliente_no_interesado',      label: 'No Interesado',              color: 'tipo-no-interesado' },
    { key: 'empresa_con_sustento_valido',label: 'Sustento Válido',            color: 'tipo-sustento-valido' },
];

const ESTADOS_OPO = [
    { key: 'Identificada',        color: '#ede7f6', text: '#4527a0' },
    { key: 'Propuesta Entregada', color: '#fff8e1', text: '#f57f17' },
    { key: 'Negociación',         color: '#e8f5e9', text: '#2e7d32' },
    { key: 'Negociada Aprobada',  color: '#e3f2fd', text: '#1565c0' },
    { key: 'Negociada Rechazada', color: '#fce8e6', text: '#c62828' },
];

const TABS_FUNNEL = [
    { key: 'Identificada',        label: 'Identificada',    num: 1 },
    { key: 'Propuesta Entregada', label: 'Prop. Entregada', num: 2 },
    { key: 'Negociación',         label: 'Negociación',     num: 3 },
    { key: 'Cerrada',             label: 'Cerrada',         num: 4 },
];

const PRODUCTOS = ['Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH', 'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'];

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const TipoBadge = ({ tipo }) => {
    const t = TIPOS_INTERACCION.find(t => t.key === tipo);
    return <span className={`tipo-badge ${t?.color || ''}`}>{t?.label || tipo}</span>;
};

const EstadoOpoBadge = ({ estado }) => {
    const e = ESTADOS_OPO.find(e => e.key === estado);
    if (!e) return null;
    return <span style={{ background: e.color, color: e.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{estado}</span>;
};

const estadoATab = (estado) => {
    if (estado === 'Negociada Aprobada' || estado === 'Negociada Rechazada') return 'Cerrada';
    return estado || 'Identificada';
};

// ── Modal Ficha completa ──────────────────────────────────────────────────────
const ModalFicha = ({ ficha, onClose, onGuardado }) => {
    const [tab, setTab] = useState('interacciones');
    const [showFormInteraccion, setShowFormInteraccion] = useState(false);
    const [showFormOportunidad, setShowFormOportunidad] = useState(false);
    const [editandoOpo, setEditandoOpo] = useState(null);
    const [loadingAccion, setLoadingAccion] = useState(false);
    const [error, setError] = useState('');

    // Form nueva interacción
    const [formInter, setFormInter] = useState({ tipo: 'llamada', comentario: '', contacto_nombre: '', contacto_telefono: '', contacto_dni: '' });

    // Form nueva/editar oportunidad
    const [formOpo, setFormOpo] = useState({ titulo: '', producto: '', cantidad: '', cargo_fijo: '', sustento: false, comentario: '', fecha_cierre_esperada: '', entel: '', claro: '', movistar: '', otros: '', total: '', estado: 'Identificada', tabFunnel: 'Identificada', resultadoCierre: '' });

    const abrirEditarOpo = (opo) => {
        setEditandoOpo(opo._id);
        setFormOpo({
            titulo: opo.titulo || '',
            producto: opo.producto || '',
            cantidad: opo.cantidad || '',
            cargo_fijo: opo.cargo_fijo || '',
            sustento: opo.sustento || false,
            comentario: opo.comentario || '',
            fecha_cierre_esperada: opo.fecha_cierre_esperada ? new Date(opo.fecha_cierre_esperada).toISOString().split('T')[0] : '',
            entel: opo.operadores?.entel || '',
            claro: opo.operadores?.claro || '',
            movistar: opo.operadores?.movistar || '',
            otros: opo.operadores?.otros || '',
            total: opo.operadores?.total || '',
            estado: opo.estado || 'Identificada',
            tabFunnel: estadoATab(opo.estado),
            resultadoCierre: opo.estado === 'Negociada Aprobada' ? 'Aprobada' : opo.estado === 'Negociada Rechazada' ? 'Rechazada' : '',
        });
        setShowFormOportunidad(true);
    };

    const handleGuardarInteraccion = async () => {
        if (!formInter.tipo) { setError('Selecciona un tipo'); return; }
        setLoadingAccion(true);
        try {
            await api.post('/ficha-gestion/tipificar', {
                ruc: ficha.ruc,
                tipo: formInter.tipo,
                comentario: formInter.comentario || null,
                contacto: {
                    nombre: formInter.contacto_nombre || null,
                    telefono: formInter.contacto_telefono || null,
                    dni: formInter.contacto_dni || null,
                },
            });
            setShowFormInteraccion(false);
            setFormInter({ tipo: 'llamada', comentario: '', contacto_nombre: '', contacto_telefono: '', contacto_dni: '' });
            onGuardado();
        } catch { setError('Error al guardar interacción'); }
        finally { setLoadingAccion(false); }
    };

    const handleGuardarOportunidad = async () => {
        if (!formOpo.producto || !formOpo.cantidad || !formOpo.cargo_fijo) { setError('Producto, cantidad y cargo fijo son obligatorios'); return; }
        if (formOpo.tabFunnel === 'Cerrada' && !formOpo.resultadoCierre) { setError('Selecciona Aprobada o Rechazada'); return; }

        const estadoFinal = formOpo.tabFunnel === 'Cerrada' ? `Negociada ${formOpo.resultadoCierre}` : formOpo.tabFunnel;

        const payload = {
            titulo: formOpo.titulo,
            producto: formOpo.producto,
            cantidad: Number(formOpo.cantidad),
            cargo_fijo: Number(formOpo.cargo_fijo),
            sustento: formOpo.sustento,
            comentario: formOpo.comentario || null,
            fecha_cierre_esperada: formOpo.fecha_cierre_esperada || null,
            estado: estadoFinal,
            operadores: {
                entel: Number(formOpo.entel) || 0,
                claro: Number(formOpo.claro) || 0,
                movistar: Number(formOpo.movistar) || 0,
                otros: Number(formOpo.otros) || 0,
                total: Number(formOpo.total) || 0,
            },
        };

        setLoadingAccion(true);
        try {
            if (editandoOpo) {
                await api.put(`/ficha-gestion/${ficha._id}/oportunidades/${editandoOpo}`, payload);
            } else {
                await api.post(`/ficha-gestion/${ficha._id}/oportunidades`, payload);
            }
            setShowFormOportunidad(false);
            setEditandoOpo(null);
            setFormOpo({ titulo: '', producto: '', cantidad: '', cargo_fijo: '', sustento: false, comentario: '', fecha_cierre_esperada: '', entel: '', claro: '', movistar: '', otros: '', total: '', estado: 'Identificada', tabFunnel: 'Identificada', resultadoCierre: '' });
            onGuardado();
        } catch { setError('Error al guardar oportunidad'); }
        finally { setLoadingAccion(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#888' }}>{ficha.ruc}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>{ficha.razon_social}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#555' }}>Segmento: {ficha.segmento || '—'}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>Líneas: {ficha.total_lineas || 0}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>Inicio: {fmt(ficha.fechas?.fecha_inicio)}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>Último contacto: {fmt(ficha.fechas?.fecha_ultimo_contacto)}</span>
                    </div>
                </div>

                {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #f0f0f0' }}>
                    <button onClick={() => setTab('interacciones')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'interacciones' ? 700 : 400, borderBottom: tab === 'interacciones' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'interacciones' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faHistory} style={{ marginRight: 6 }} />Interacciones ({ficha.interacciones?.length || 0})
                    </button>
                    <button onClick={() => setTab('oportunidades')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'oportunidades' ? 700 : 400, borderBottom: tab === 'oportunidades' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'oportunidades' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faBullseye} style={{ marginRight: 6 }} />Oportunidades ({ficha.oportunidades?.length || 0})
                    </button>
                </div>

                {/* Tab Interacciones */}
                {tab === 'interacciones' && (
                    <div>
                        <button className="btn-primary" style={{ marginBottom: 12, fontSize: 12 }} onClick={() => setShowFormInteraccion(v => !v)}>
                            <FontAwesomeIcon icon={faPlus} /> Nueva Interacción
                        </button>

                        {showFormInteraccion && (
                            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                <div className="tipificaciones-grid" style={{ marginBottom: 12 }}>
                                    {TIPOS_INTERACCION.map(t => (
                                        <button key={t.key} className={`btn-tipificacion ${formInter.tipo === t.key ? 'selected' : ''}`} onClick={() => setFormInter(f => ({ ...f, tipo: t.key }))}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                                    <div className="form-field"><label>Nombre contacto</label>
                                        <input className="form-input" value={formInter.contacto_nombre} onChange={e => setFormInter(f => ({ ...f, contacto_nombre: e.target.value }))} />
                                    </div>
                                    <div className="form-field"><label>Teléfono</label>
                                        <input className="form-input" value={formInter.contacto_telefono} onChange={e => setFormInter(f => ({ ...f, contacto_telefono: e.target.value }))} />
                                    </div>
                                    <div className="form-field"><label>DNI</label>
                                        <input className="form-input" value={formInter.contacto_dni} onChange={e => setFormInter(f => ({ ...f, contacto_dni: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-field"><label>Comentario</label>
                                    <textarea className="form-input" rows={2} value={formInter.comentario} onChange={e => setFormInter(f => ({ ...f, comentario: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="modal-actions" style={{ marginTop: 8 }}>
                                    <button className="btn-secondary" onClick={() => setShowFormInteraccion(false)}>Cancelar</button>
                                    <button className="btn-primary" onClick={handleGuardarInteraccion} disabled={loadingAccion}>{loadingAccion ? 'Guardando...' : 'Guardar'}</button>
                                </div>
                            </div>
                        )}

                        {ficha.interacciones?.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin interacciones registradas</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[...ficha.interacciones].reverse().map((inter, i) => (
                                    <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <TipoBadge tipo={inter.tipo} />
                                            <span style={{ fontSize: 11, color: '#888' }}>{fmt(inter.fecha)}</span>
                                        </div>
                                        {inter.contacto?.nombre && (
                                            <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                                                <FontAwesomeIcon icon={faBriefcase} style={{ marginRight: 4 }} />{inter.contacto.nombre}
                                                {inter.contacto.telefono && <><FontAwesomeIcon icon={faPhone} style={{ marginLeft: 8, marginRight: 4 }} />{inter.contacto.telefono}</>}
                                                {inter.contacto.dni && <><FontAwesomeIcon icon={faIdCard} style={{ marginLeft: 8, marginRight: 4 }} />{inter.contacto.dni}</>}
                                            </div>
                                        )}
                                        {inter.comentario && (
                                            <div style={{ fontSize: 12, color: '#444', background: '#f5f5f5', borderRadius: 6, padding: '6px 10px', marginTop: 4 }}>
                                                <FontAwesomeIcon icon={faComment} style={{ marginRight: 4, color: '#888' }} />{inter.comentario}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>Por: {inter.agregado_por?.nombre || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Oportunidades */}
                {tab === 'oportunidades' && (
                    <div>
                        <button className="btn-primary" style={{ marginBottom: 12, fontSize: 12 }} onClick={() => { setEditandoOpo(null); setShowFormOportunidad(v => !v); setFormOpo({ titulo: '', producto: '', cantidad: '', cargo_fijo: '', sustento: false, comentario: '', fecha_cierre_esperada: '', entel: '', claro: '', movistar: '', otros: '', total: '', estado: 'Identificada', tabFunnel: 'Identificada', resultadoCierre: '' }); }}>
                            <FontAwesomeIcon icon={faPlus} /> Nueva Oportunidad
                        </button>

                        {showFormOportunidad && (
                            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                {/* Tabs funnel */}
                                <div className="funnel-tabs" style={{ marginBottom: 12 }}>
                                    {TABS_FUNNEL.map((t, i) => {
                                        const idxActual = TABS_FUNNEL.findIndex(tt => tt.key === estadoATab(editandoOpo ? formOpo.estado : 'Identificada'));
                                        const bloqueado = !editandoOpo && i > 0;
                                        return (
                                            <button key={t.key}
                                                className={`funnel-tab ${formOpo.tabFunnel === t.key ? 'active' : ''} ${bloqueado ? 'blocked' : ''}`}
                                                onClick={() => !bloqueado && setFormOpo(f => ({ ...f, tabFunnel: t.key }))}
                                                disabled={bloqueado}
                                            >
                                                <span className="tab-num">{t.num}</span> {t.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {formOpo.tabFunnel === 'Cerrada' && (
                                    <div className="negociada-selector" style={{ marginBottom: 12 }}>
                                        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Resultado:</span>
                                        <button className={`btn-negociada aprobada ${formOpo.resultadoCierre === 'Aprobada' ? 'selected' : ''}`} onClick={() => setFormOpo(f => ({ ...f, resultadoCierre: 'Aprobada' }))}>✓ Aprobada</button>
                                        <button className={`btn-negociada rechazada ${formOpo.resultadoCierre === 'Rechazada' ? 'selected' : ''}`} onClick={() => setFormOpo(f => ({ ...f, resultadoCierre: 'Rechazada' }))}>✕ Rechazada</button>
                                    </div>
                                )}

                                <div className="form-field"><label>Título</label>
                                    <input className="form-input" value={formOpo.titulo} onChange={e => setFormOpo(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Renovación 20 líneas" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                    <div className="form-field"><label>Producto *</label>
                                        <select className="form-input" value={formOpo.producto} onChange={e => setFormOpo(f => ({ ...f, producto: e.target.value }))}>
                                            <option value="">-- Seleccionar --</option>
                                            {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-field"><label>Cantidad *</label>
                                        <input type="number" className="form-input" value={formOpo.cantidad} onChange={e => setFormOpo(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                                    </div>
                                    <div className="form-field"><label>Cargo Fijo *</label>
                                        <input type="number" className="form-input" value={formOpo.cargo_fijo} onChange={e => setFormOpo(f => ({ ...f, cargo_fijo: e.target.value }))} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div className="form-field"><label>Fecha cierre esperada</label>
                                        <input type="date" className="form-input" value={formOpo.fecha_cierre_esperada} onChange={e => setFormOpo(f => ({ ...f, fecha_cierre_esperada: e.target.value }))} />
                                    </div>
                                    <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formOpo.sustento} onChange={e => setFormOpo(f => ({ ...f, sustento: e.target.checked }))} />
                                            Sustento cargado
                                        </label>
                                    </div>
                                </div>
                                <div className="form-field"><label>Operadores actuales</label>
                                    <div className="operadores-grid">
                                        {['entel', 'claro', 'movistar', 'otros', 'total'].map(op => (
                                            <div key={op} className="operador-field">
                                                <label>{op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                                <input type="number" value={formOpo[op]} onChange={e => setFormOpo(f => ({ ...f, [op]: e.target.value }))} min="0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-field"><label>Comentario</label>
                                    <textarea className="form-input" rows={2} value={formOpo.comentario} onChange={e => setFormOpo(f => ({ ...f, comentario: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="modal-actions" style={{ marginTop: 8 }}>
                                    <button className="btn-secondary" onClick={() => { setShowFormOportunidad(false); setEditandoOpo(null); }}>Cancelar</button>
                                    <button className="btn-primary" onClick={handleGuardarOportunidad} disabled={loadingAccion}>{loadingAccion ? 'Guardando...' : editandoOpo ? 'Actualizar' : 'Agregar'}</button>
                                </div>
                            </div>
                        )}

                        {ficha.oportunidades?.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin oportunidades registradas</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {ficha.oportunidades.map((opo, i) => (
                                    <div key={opo._id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{opo.titulo || `Oportunidad ${i + 1}`}</div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <EstadoOpoBadge estado={opo.estado} />
                                                <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => abrirEditarOpo(opo)}>Editar</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#555' }}>
                                            <div><span style={{ color: '#888' }}>Producto:</span> {opo.producto || '—'}</div>
                                            <div><span style={{ color: '#888' }}>Cantidad:</span> {opo.cantidad || 0}</div>
                                            <div><span style={{ color: '#888' }}>Cargo fijo:</span> S/. {opo.cargo_fijo || 0}</div>
                                            <div><span style={{ color: '#888' }}>Sustento:</span> {opo.sustento ? '✅ Sí' : '❌ No'}</div>
                                            <div><span style={{ color: '#888' }}>Cierre esp.:</span> {fmt(opo.fecha_cierre_esperada)}</div>
                                            <div><span style={{ color: '#888' }}>Ganada:</span> {fmt(opo.fecha_ganada)}</div>
                                        </div>
                                        {opo.comentario && (
                                            <div style={{ fontSize: 12, color: '#444', background: '#f5f5f5', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
                                                <FontAwesomeIcon icon={faComment} style={{ marginRight: 4, color: '#888' }} />{opo.comentario}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="modal-actions" style={{ marginTop: 20 }}>
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// ── Página principal ──────────────────────────────────────────────────────────
const MisGestiones = () => {
    const [fichas, setFichas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [modalFicha, setModalFicha] = useState(null);
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/ficha-gestion/mis-fichas', {
                params: { busqueda, estado_general: estadoFiltro, page: p, limit: 50 }
            });
            setFichas(res.data.fichas);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, estadoFiltro]);

    // Recargar ficha individual después de guardar
    const recargarFicha = async (fichaId) => {
        try {
            const res = await api.get(`/ficha-gestion/${fichaId}`);
            setModalFicha(res.data);
            cargar(page);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, estadoFiltro]);

    // Última interacción de la ficha
    const ultimaInteraccion = (ficha) => {
        if (!ficha.interacciones?.length) return null;
        return ficha.interacciones[ficha.interacciones.length - 1];
    };

    // Oportunidad más avanzada
    const opoMasAvanzada = (ficha) => {
        if (!ficha.oportunidades?.length) return null;
        const orden = ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'];
        return ficha.oportunidades.reduce((best, opo) => {
            return orden.indexOf(opo.estado) > orden.indexOf(best.estado) ? opo : best;
        });
    };

    return (
        <div>
            <div className="page-header">
                <h1>
                    <FontAwesomeIcon icon={faClipboardList} /> Mis Gestiones
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} empresas</span>
                </h1>
            </div>

            <div className="search-bar" style={{ flexWrap: 'wrap' }}>
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <select className="filter-select" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="cerrado_ganado">Cerrado Ganado</option>
                    <option value="cerrado_perdido">Cerrado Perdido</option>
                    <option value="descartado">Descartado</option>
                </select>
            </div>

            <div className="table-container">
                {loading ? <p style={{ padding: 20 }}>Cargando...</p> : fichas.length === 0 ? (
                    <p style={{ padding: 20, color: '#999' }}>No se encontraron gestiones.</p>
                ) : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>RUC</th>
                                    <th>Razón Social</th>
                                    <th>Segmento</th>
                                    <th>Líneas</th>
                                    <th>Último contacto</th>
                                    <th>Última interacción</th>
                                    <th>Interacciones</th>
                                    <th>Oportunidades</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fichas.map(f => {
                                    const ultima = ultimaInteraccion(f);
                                    const opo = opoMasAvanzada(f);
                                    return (
                                        <tr key={f._id}>
                                            <td style={{ fontWeight: 600, color: '#3949ab' }}>{f.ruc}</td>
                                            <td>{f.razon_social}</td>
                                            <td>{f.segmento || '—'}</td>
                                            <td>{f.total_lineas || '—'}</td>
                                            <td>{fmt(f.fechas?.fecha_ultimo_contacto)}</td>
                                            <td>{ultima ? <TipoBadge tipo={ultima.tipo} /> : '—'}</td>
                                            <td>
                                                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                                                    {f.interacciones?.length || 0}
                                                </span>
                                            </td>
                                            <td>
                                                {f.oportunidades?.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        <EstadoOpoBadge estado={opo?.estado} />
                                                        {f.oportunidades.length > 1 && (
                                                            <span style={{ fontSize: 10, color: '#888' }}>{f.oportunidades.length} oportunidades</span>
                                                        )}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <button className="btn-estado btn-asignar" onClick={() => setModalFicha(f)}>
                                                    <FontAwesomeIcon icon={faEye} /> Ver
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
                    onClose={() => setModalFicha(null)}
                    onGuardado={() => recargarFicha(modalFicha._id)}
                />
            )}
        </div>
    );
};

export default MisGestiones;