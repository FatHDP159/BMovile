import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory, faChevronLeft, faChevronRight, faFilter, faEye,
    faPhone, faIdCard, faBriefcase, faComment, faBullseye, faUsers, faAddressCard
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './BdGeneral.css';

const TIPOS = [
    { key: 'interesado', label: 'Cliente Interesado', color: 'tipo-interesado' },
    { key: 'cliente_claro', label: 'Cliente Claro', color: 'tipo-claro' },
    { key: 'sin_contacto', label: 'Sin Contacto', color: 'tipo-sin-contacto' },
    { key: 'con_deuda', label: 'Con Deuda', color: 'tipo-deuda' },
    { key: 'no_contesta', label: 'No Contesta', color: 'tipo-no-contesta' },
    { key: 'cliente_no_interesado', label: 'Cliente No Interesado', color: 'tipo-no-interesado' },
    { key: 'empresa_con_sustento_valido', label: 'Sustento Válido', color: 'tipo-sustento-valido' },
];

const ESTADOS_OPO = [
    { key: 'Identificada', color: '#ede7f6', text: '#4527a0' },
    { key: 'Propuesta Entregada', color: '#fff8e1', text: '#f57f17' },
    { key: 'Negociación', color: '#e8f5e9', text: '#2e7d32' },
    { key: 'Negociada Aprobada', color: '#e3f2fd', text: '#1565c0' },
    { key: 'Negociada Rechazada', color: '#fce8e6', text: '#c62828' },
];

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const TipoBadge = ({ tipo }) => {
    const t = TIPOS.find(t => t.key === tipo);
    return <span className={`tipo-badge ${t?.color || ''}`}>{t?.label || tipo}</span>;
};

const EstadoOpoBadge = ({ estado }) => {
    const e = ESTADOS_OPO.find(e => e.key === estado);
    if (!e) return null;
    return <span style={{ background: e.color, color: e.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{estado}</span>;
};

// ── Modal Contactos ───────────────────────────────────────────────────────────
export const ModalContactos = ({ ruc, razon_social, onClose }) => {
    const [tab, setTab] = useState('autorizados');
    const [autorizados, setAutorizados] = useState([]);
    const [rrll, setRrll] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            try {
                const [resAuth, resRRLL] = await Promise.all([
                    api.get(`/contactos/autorizados/${ruc}`),
                    api.get(`/contactos/rrll/${ruc}`),
                ]);
                setAutorizados(resAuth.data || []);
                setRrll(resRRLL.data || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        cargar();
    }, [ruc]);

    const renderContacto = (c, i) => (
        <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.nombre}</div>
            {c.cargo && <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}><FontAwesomeIcon icon={faBriefcase} style={{ marginRight: 4 }} />{c.cargo}</div>}
            {(c.dni || c.nr_doc) && <div style={{ fontSize: 12, marginBottom: 4 }}><FontAwesomeIcon icon={faIdCard} style={{ marginRight: 4, color: '#888' }} />{c.dni || c.nr_doc}</div>}
            {c.telefonos?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4, alignItems: 'center' }}>
                    <FontAwesomeIcon icon={faPhone} style={{ color: '#888', fontSize: 11 }} />
                    {c.telefonos.map((t, j) => <span key={j} className="contacto-chip">{t}</span>)}
                </div>
            )}
            {c.correos?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#888' }}>✉</span>
                    {c.correos.map((e, j) => <span key={j} className="contacto-chip">{e}</span>)}
                </div>
            )}
        </div>
    );

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: 4 }}>Contactos</h2>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{razon_social} — {ruc}</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #f0f0f0' }}>
                    <button onClick={() => setTab('autorizados')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'autorizados' ? 700 : 400, borderBottom: tab === 'autorizados' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'autorizados' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faAddressCard} style={{ marginRight: 6 }} />Autorizados ({autorizados.length})
                    </button>
                    <button onClick={() => setTab('rrll')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'rrll' ? 700 : 400, borderBottom: tab === 'rrll' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'rrll' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />RRLL ({rrll.length})
                    </button>
                </div>

                {loading ? (
                    <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>Cargando contactos...</p>
                ) : tab === 'autorizados' ? (
                    autorizados.length === 0
                        ? <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin contactos autorizados</p>
                        : autorizados.map((c, i) => renderContacto(c, i))
                ) : (
                    rrll.length === 0
                        ? <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin contactos RRLL</p>
                        : rrll.map((c, i) => renderContacto(c, i))
                )}

                <div className="modal-actions" style={{ marginTop: 16 }}>
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Ficha ───────────────────────────────────────────────────────────────
const ModalFicha = ({ ficha, onClose }) => {
    const [tab, setTab] = useState('interacciones');

    const opoMasAvanzada = () => {
        if (!ficha.oportunidades?.length) return null;
        const orden = ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'];
        return ficha.oportunidades.reduce((best, opo) =>
            orden.indexOf(opo.estado) > orden.indexOf(best.estado) ? opo : best
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#888' }}>{ficha.ruc}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>{ficha.razon_social}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', fontSize: 12, color: '#555' }}>
                        <span>Asesor: {ficha.asesor?.id_asesor?.nombre_user || '—'}</span>
                        <span>Segmento: {ficha.segmento || '—'}</span>
                        <span>Líneas: {ficha.total_lineas || 0}</span>
                        <span>Inicio: {fmt(ficha.fechas?.fecha_inicio)}</span>
                        <span>Último contacto: {fmt(ficha.fechas?.fecha_ultimo_contacto)}</span>
                    </div>
                    {opoMasAvanzada() && <div style={{ marginTop: 8 }}><EstadoOpoBadge estado={opoMasAvanzada()?.estado} /></div>}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #f0f0f0' }}>
                    <button onClick={() => setTab('interacciones')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'interacciones' ? 700 : 400, borderBottom: tab === 'interacciones' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'interacciones' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faHistory} style={{ marginRight: 6 }} />Interacciones ({ficha.interacciones?.length || 0})
                    </button>
                    <button onClick={() => setTab('oportunidades')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === 'oportunidades' ? 700 : 400, borderBottom: tab === 'oportunidades' ? '2px solid #1D2558' : '2px solid transparent', color: tab === 'oportunidades' ? '#1D2558' : '#666' }}>
                        <FontAwesomeIcon icon={faBullseye} style={{ marginRight: 6 }} />Oportunidades ({ficha.oportunidades?.length || 0})
                    </button>
                </div>

                {tab === 'interacciones' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ficha.interacciones?.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin interacciones</p>
                        ) : [...ficha.interacciones].reverse().map((inter, i) => (
                            <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
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
                                <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>Por: {inter.agregado_por?.nombre || '—'} · {inter.agregado_por?.rol || ''}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'oportunidades' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {ficha.oportunidades?.length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin oportunidades</p>
                        ) : ficha.oportunidades.map((opo, i) => (
                            <div key={opo._id} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 600 }}>{opo.titulo || opo.producto || `Oportunidad ${i + 1}`}</div>
                                    <EstadoOpoBadge estado={opo.estado} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 12, color: '#555' }}>
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

                <div className="modal-actions" style={{ marginTop: 20 }}>
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// ── Página principal ──────────────────────────────────────────────────────────
const Historial = () => {
    const [fichas, setFichas] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [modalFicha, setModalFicha] = useState(null);
    const [modalContactos, setModalContactos] = useState(null); // { ruc, razon_social }
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { busqueda, asesor: filtroAsesor, page: p, limit: 50 };
            if (fechaDesde) params.fecha_desde = fechaDesde;
            if (fechaHasta) params.fecha_hasta = fechaHasta;
            const res = await api.get('/ficha-gestion', { params });
            setFichas(res.data.fichas || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, filtroAsesor, fechaDesde, fechaHasta]);

    useEffect(() => {
        api.get('/users').then(res => setAsesores(res.data.filter(u => u.rol_user === 'asesor'))).catch(console.error);
    }, []);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, filtroAsesor, fechaDesde, fechaHasta]);

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
                    <FontAwesomeIcon icon={faHistory} /> Historial de Gestiones
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} fichas</span>
                </h1>
            </div>

            <div className="search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ minWidth: 220 }} />
                <select className="filter-select" value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
                    <option value="">Todos los asesores</option>
                    {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre_user}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                    <FontAwesomeIcon icon={faFilter} />
                    Desde: <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    Hasta: <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            <div className="table-container">
                {loading ? <p style={{ padding: 20 }}>Cargando...</p> : fichas.length === 0 ? (
                    <p style={{ padding: 20, color: '#999' }}>No se encontraron fichas.</p>
                ) : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>Último contacto</th>
                                    <th>RUC</th>
                                    <th>Razón Social</th>
                                    <th>Asesor</th>
                                    <th>Segmento</th>
                                    <th>Líneas</th>
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
                                            <td>{fmt(f.fechas?.fecha_ultimo_contacto)}</td>
                                            <td>
                                                <button
                                                    onClick={() => setModalContactos({ ruc: f.ruc, razon_social: f.razon_social })}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3949ab', fontWeight: 700, fontSize: 13, padding: 0, textDecoration: 'underline' }}
                                                    title="Ver contactos"
                                                >
                                                    {f.ruc}
                                                </button>
                                            </td>
                                            <td>{f.razon_social}</td>
                                            <td>{f.asesor?.id_asesor?.nombre_user || '—'}</td>
                                            <td>{f.segmento || '—'}</td>
                                            <td>{f.total_lineas || '—'}</td>
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
                                <span style={{ fontSize: 13, color: '#666' }}>Página {page} de {totalPages} — {total} fichas</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                    <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalFicha && <ModalFicha ficha={modalFicha} onClose={() => setModalFicha(null)} />}
            {modalContactos && (
                <ModalContactos
                    ruc={modalContactos.ruc}
                    razon_social={modalContactos.razon_social}
                    onClose={() => setModalContactos(null)}
                />
            )}
        </div>
    );
};

export default Historial;