import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClipboardList, faChevronLeft, faChevronRight, faEye,
    faPhone, faIdCard, faComment
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './GestionesSupervisor.css';

const TIPOS = [
    { key: 'interesado', label: 'Cliente Interesado', color: 'tipo-interesado' },
    { key: 'cliente_claro', label: 'Cliente Claro', color: 'tipo-claro' },
    { key: 'sin_contacto', label: 'Sin Contacto', color: 'tipo-sin-contacto' },
    { key: 'con_deuda', label: 'Con Deuda', color: 'tipo-deuda' },
    { key: 'no_contesta', label: 'No Contesta', color: 'tipo-no-contesta' },
    { key: 'cliente_no_interesado', label: 'Cliente No Interesado', color: 'tipo-no-interesado' },
    { key: 'empresa_con_sustento_valido', label: 'Empresa con Sustento Válido', color: 'tipo-sustento-valido' },
];

const ESTADOS_OPO = [
    { key: 'Identificada', label: 'Identificada', color: '#ede7f6', text: '#4527a0' },
    { key: 'Propuesta Entregada', label: 'Propuesta Entregada', color: '#fff8e1', text: '#f57f17' },
    { key: 'Negociación', label: 'Negociación', color: '#e8f5e9', text: '#2e7d32' },
    { key: 'Negociada Aprobada', label: 'Negociada Aprobada', color: '#e3f2fd', text: '#1565c0' },
    { key: 'Negociada Rechazada', label: 'Negociada Rechazada', color: '#fce8e6', text: '#c62828' },
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
    if (!e) return <span>—</span>;
    return <span className="estado-opo-badge" style={{ background: e.color, color: e.text }}>{e.label}</span>;
};

// ── Modal detalle ─────────────────────────────────────────────────────────────
const ModalDetalle = ({ gestion, onClose }) => (
    <div className="modal-overlay">
        <div className="modal" style={{ width: '90vw', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>Detalle de Gestión</h2>
            <div className="detalle-seccion">
                <div className="detalle-row"><span className="detalle-label">Fecha</span><span>{fmt(gestion.fechas?.fecha_tipificacion)}</span></div>
                <div className="detalle-row"><span className="detalle-label">RUC</span><span>{gestion.ruc}</span></div>
                <div className="detalle-row"><span className="detalle-label">Razón Social</span><span>{gestion.razon_social}</span></div>
                <div className="detalle-row"><span className="detalle-label">Asesor</span><span>{gestion.asesor?.id_asesor?.nombre_user || '—'}</span></div>
                <div className="detalle-row"><span className="detalle-label">Segmento</span><span>{gestion.segmento || '—'}</span></div>
                <div className="detalle-row"><span className="detalle-label">Líneas</span><span>{gestion.total_lineas || '—'}</span></div>
                <div className="detalle-row"><span className="detalle-label">Tipificación</span><span><TipoBadge tipo={gestion.tipo_tipificacion} /></span></div>
            </div>

            {gestion.contacto?.nombre && (
                <>
                    <h3 style={{ margin: '16px 0 8px', fontSize: 13, color: '#1a1a2e' }}>Contacto</h3>
                    <div className="detalle-seccion">
                        <div className="detalle-row"><span className="detalle-label"><FontAwesomeIcon icon={faIdCard} /> Nombre</span><span>{gestion.contacto.nombre}</span></div>
                        {gestion.contacto.dni && <div className="detalle-row"><span className="detalle-label">DNI</span><span>{gestion.contacto.dni}</span></div>}
                        {gestion.contacto.telefono && <div className="detalle-row"><span className="detalle-label"><FontAwesomeIcon icon={faPhone} /> Teléfono</span><span>{gestion.contacto.telefono}</span></div>}
                    </div>
                </>
            )}

            {gestion.tipo_tipificacion === 'interesado' && gestion.oportunidad && (
                <>
                    <h3 style={{ margin: '16px 0 8px', fontSize: 13, color: '#1a1a2e' }}>Oportunidad</h3>
                    <div className="detalle-seccion">
                        <div className="detalle-row"><span className="detalle-label">Estado</span><span><EstadoOpoBadge estado={gestion.oportunidad.estado} /></span></div>
                        {gestion.oportunidad.titulo && <div className="detalle-row"><span className="detalle-label">Título</span><span>{gestion.oportunidad.titulo}</span></div>}
                        {gestion.oportunidad.producto && <div className="detalle-row"><span className="detalle-label">Producto</span><span>{gestion.oportunidad.producto}</span></div>}
                        {gestion.oportunidad.cantidad > 0 && <div className="detalle-row"><span className="detalle-label">Cantidad</span><span>{gestion.oportunidad.cantidad}</span></div>}
                        {gestion.oportunidad.cargo_fijo > 0 && <div className="detalle-row"><span className="detalle-label">Cargo Fijo</span><span>S/. {gestion.oportunidad.cargo_fijo}</span></div>}
                        <div className="detalle-row"><span className="detalle-label">Sustento</span>
                            <span className={`sustento-badge ${gestion.oportunidad.sustento ? 'si' : 'no'}`}>{gestion.oportunidad.sustento ? 'Sí' : 'No'}</span>
                        </div>
                    </div>
                </>
            )}

            {/* Comentario general */}
            {gestion.comentario && (
                <>
                    <h3 style={{ margin: '16px 0 8px', fontSize: 13, color: '#1a1a2e' }}>
                        <FontAwesomeIcon icon={faComment} style={{ marginRight: 6 }} />Comentario
                    </h3>
                    <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#333', lineHeight: 1.6 }}>
                        {gestion.comentario}
                    </div>
                </>
            )}

            <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    </div>
);

// ── Página principal ──────────────────────────────────────────────────────────
const GestionesSupervisor = () => {
    const [gestiones, setGestiones] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [modalDetalle, setModalDetalle] = useState(null);
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/gestiones', {
                params: { busqueda, tipo: filtroTipo, asesor: filtroAsesor, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, page: p, limit: 50 }
            });
            if (Array.isArray(res.data)) {
                let data = res.data;
                if (busqueda) data = data.filter(g => g.ruc?.includes(busqueda) || g.razon_social?.toLowerCase().includes(busqueda.toLowerCase()));
                if (filtroTipo) data = data.filter(g => g.tipo_tipificacion === filtroTipo);
                if (filtroAsesor) data = data.filter(g => g.asesor?.id_asesor?._id === filtroAsesor || g.asesor?.id_asesor?.toString() === filtroAsesor);
                if (fechaDesde) data = data.filter(g => new Date(g.fechas?.fecha_tipificacion) >= new Date(fechaDesde));
                if (fechaHasta) data = data.filter(g => new Date(g.fechas?.fecha_tipificacion) <= new Date(fechaHasta + 'T23:59:59'));
                const limit = 50;
                const totalItems = data.length;
                const totalPgs = Math.ceil(totalItems / limit) || 1;
                const start = (p - 1) * limit;
                setGestiones(data.slice(start, start + limit));
                setTotal(totalItems);
                setTotalPages(totalPgs);
                setPage(p);
            } else {
                setGestiones(res.data.gestiones || []);
                setTotal(res.data.total || 0);
                setTotalPages(res.data.totalPages || 1);
                setPage(p);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, filtroTipo, filtroAsesor, fechaDesde, fechaHasta]);

    useEffect(() => {
        api.get('/users').then(res => setAsesores(res.data.filter(u => u.rol_user === 'asesor'))).catch(console.error);
    }, []);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, filtroTipo, filtroAsesor, fechaDesde, fechaHasta]);

    return (
        <div>
            <div className="page-header">
                <h1><FontAwesomeIcon icon={faClipboardList} /> Gestiones
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} registros</span>
                </h1>
            </div>

            <div className="search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ minWidth: 220 }} />
                <select className="filter-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                    <option value="">Todos los tipos</option>
                    {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select className="filter-select" value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
                    <option value="">Todos los asesores</option>
                    {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre_user}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                    Desde: <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    Hasta: <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            <div className="table-container">
                {loading ? <p style={{ padding: 20 }}>Cargando...</p> : gestiones.length === 0 ? (
                    <p style={{ padding: 20, color: '#999' }}>No se encontraron gestiones.</p>
                ) : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>RUC</th>
                                    <th>Razón Social</th>
                                    <th>Asesor</th>
                                    <th>Segmento</th>
                                    <th>Líneas</th>
                                    <th>Tipo</th>
                                    <th>Oportunidad</th>
                                    <th>Comentario</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gestiones.map(g => (
                                    <tr key={g._id}>
                                        <td>{fmt(g.fechas?.fecha_tipificacion)}</td>
                                        <td style={{ fontWeight: 600 }}>{g.ruc}</td>
                                        <td>{g.razon_social}</td>
                                        <td>{g.asesor?.id_asesor?.nombre_user || '—'}</td>
                                        <td>{g.segmento || '—'}</td>
                                        <td>{g.total_lineas || '—'}</td>
                                        <td><TipoBadge tipo={g.tipo_tipificacion} /></td>
                                        <td>
                                            {g.tipo_tipificacion === 'interesado' && g.oportunidad?.estado
                                                ? <EstadoOpoBadge estado={g.oportunidad.estado} />
                                                : '—'}
                                        </td>
                                        <td>
                                            {g.comentario
                                                ? <span title={g.comentario} style={{ fontSize: 12, color: '#555', cursor: 'help' }}>
                                                    <FontAwesomeIcon icon={faComment} style={{ marginRight: 4, color: '#1D2558' }} />
                                                    {g.comentario.length > 30 ? g.comentario.slice(0, 30) + '...' : g.comentario}
                                                  </span>
                                                : '—'}
                                        </td>
                                        <td>
                                            <button className="btn-estado btn-asignar" onClick={() => setModalDetalle(g)}>
                                                <FontAwesomeIcon icon={faEye} /> Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                <span style={{ fontSize: 13, color: '#666' }}>Página {page} de {totalPages} — {total} gestiones</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                    <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalDetalle && <ModalDetalle gestion={modalDetalle} onClose={() => setModalDetalle(null)} />}
        </div>
    );
};

export default GestionesSupervisor;