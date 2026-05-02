import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClipboardList, faChevronLeft, faChevronRight, faPen,
    faPhone, faIdCard, faBriefcase, faComment,
    faHistory, faBullseye
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './MisGestiones.css';

const TIPOS_INTERACCION = [
    { key: 'interesado',                  label: 'Cliente Interesado',    color: 'tipo-interesado' },
    { key: 'sin_contacto',                label: 'Sin Contacto',          color: 'tipo-sin-contacto' },
    { key: 'con_deuda',                   label: 'Con Deuda',             color: 'tipo-deuda' },
    { key: 'no_contesta',                 label: 'No Contesta',           color: 'tipo-no-contesta' },
    { key: 'cliente_claro',               label: 'Cliente Claro',         color: 'tipo-claro' },
    { key: 'cliente_no_interesado',       label: 'No Interesado',         color: 'tipo-no-interesado' },
    { key: 'empresa_con_sustento_valido', label: 'Sustento Válido',       color: 'tipo-sustento-valido' },
];

const ESTADOS_OPO = [
    { key: 'Identificada',        color: '#ede7f6', text: '#4527a0' },
    { key: 'Propuesta Entregada', color: '#fff8e1', text: '#f57f17' },
    { key: 'Negociación',         color: '#e8f5e9', text: '#2e7d32' },
    { key: 'Negociada Aprobada',  color: '#e3f2fd', text: '#1565c0' },
    { key: 'Negociada Rechazada', color: '#fce8e6', text: '#c62828' },
];

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

// ── Modal Editar interacción ──────────────────────────────────────────────────
const ModalEditarInteraccion = ({ interaccion, fichaId, interaccionId, onClose, onGuardado }) => {
    const [tipo, setTipo] = useState(interaccion.tipo);
    const [comentario, setComentario] = useState(interaccion.comentario || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        setLoading(true);
        try {
            await api.put(`/ficha-gestion/${fichaId}/interacciones/${interaccionId}`, {
                tipo,
                comentario: comentario.trim() || null,
            });
            onGuardado();
            onClose();
        } catch { setError('Error al actualizar interacción'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 500 }}>
                <h2>Editar Interacción</h2>
                {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}
                <div className="tipificaciones-grid" style={{ marginBottom: 16 }}>
                    {TIPOS_INTERACCION.map(t => (
                        <button key={t.key} className={`btn-tipificacion ${tipo === t.key ? 'selected' : ''}`} onClick={() => setTipo(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="form-field">
                    <label>Comentario (opcional)</label>
                    <textarea className="form-input" rows={3} value={comentario} onChange={e => setComentario(e.target.value)} style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Ficha ───────────────────────────────────────────────────────────────
const ModalFicha = ({ ficha: fichaInicial, onClose, onGuardado }) => {
    const [ficha, setFicha] = useState(fichaInicial);
    const [tab, setTab] = useState('interacciones');
    const [editandoInteraccion, setEditandoInteraccion] = useState(null);

    const recargar = async () => {
        try {
            const res = await api.get(`/ficha-gestion/${ficha._id}`);
            setFicha(res.data);
            onGuardado();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#888' }}>{ficha.ruc}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>{ficha.razon_social}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', fontSize: 12, color: '#555' }}>
                        <span>Segmento: {ficha.segmento || '—'}</span>
                        <span>Líneas: {ficha.total_lineas || 0}</span>
                        <span>Inicio: {fmt(ficha.fechas?.fecha_inicio)}</span>
                        <span>Último contacto: {fmt(ficha.fechas?.fecha_ultimo_contacto)}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #f0f0f0' }}>
                    <button onClick={() => setTab('interacciones')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'interacciones' ? 700 : 400, borderBottom: tab === 'interacciones' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'interacciones' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faHistory} style={{ marginRight: 6 }} />Interacciones ({ficha.interacciones?.length || 0})
                    </button>
                    <button onClick={() => setTab('oportunidades')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'oportunidades' ? 700 : 400, borderBottom: tab === 'oportunidades' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'oportunidades' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faBullseye} style={{ marginRight: 6 }} />Oportunidades ({ficha.oportunidades?.length || 0})
                    </button>
                </div>

                {/* Tab Interacciones — solo lectura + editar tipo/comentario */}
                {tab === 'interacciones' && (
                    <div>
                        {ficha.interacciones?.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin interacciones registradas</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[...ficha.interacciones].reverse().map((inter, i) => (
                                    <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <TipoBadge tipo={inter.tipo} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 11, color: '#888' }}>{fmt(inter.fecha)}</span>
                                                <button
                                                    className="btn-secondary"
                                                    style={{ fontSize: 11, padding: '2px 8px' }}
                                                    onClick={() => setEditandoInteraccion(inter)}
                                                >
                                                    <FontAwesomeIcon icon={faPen} /> Editar
                                                </button>
                                            </div>
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

                {/* Tab Oportunidades — solo lectura */}
                {tab === 'oportunidades' && (
                    <div>
                        {ficha.oportunidades?.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin oportunidades registradas</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {ficha.oportunidades.map((opo, i) => (
                                    <div key={opo._id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{opo.titulo || opo.producto || `Oportunidad ${i + 1}`}</div>
                                            <EstadoOpoBadge estado={opo.estado} />
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

                {editandoInteraccion && (
                    <ModalEditarInteraccion
                        interaccion={editandoInteraccion}
                        fichaId={ficha._id}
                        interaccionId={editandoInteraccion._id}
                        onClose={() => setEditandoInteraccion(null)}
                        onGuardado={() => { setEditandoInteraccion(null); recargar(); }}
                    />
                )}
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

    const ultimaInteraccion = (ficha) => {
        if (!ficha.interacciones?.length) return null;
        return ficha.interacciones[ficha.interacciones.length - 1];
    };

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
                    onClose={() => setModalFicha(null)}
                    onGuardado={() => recargarFicha(modalFicha._id)}
                />
            )}
        </div>
    );
};

export default MisGestiones;