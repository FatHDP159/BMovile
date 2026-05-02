import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClipboardList, faChevronLeft, faChevronRight, faPen,
    faPhone, faIdCard, faBriefcase, faComment
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './MisGestiones.css';

const TIPOS = [
    { key: 'interesado', label: 'Cliente Interesado', color: 'tipo-interesado' },
    { key: 'cliente_claro', label: 'Cliente Claro', color: 'tipo-claro' },
    { key: 'sin_contacto', label: 'Sin Contacto', color: 'tipo-sin-contacto' },
    { key: 'con_deuda', label: 'Con Deuda', color: 'tipo-deuda' },
    { key: 'no_contesta', label: 'No Contesta', color: 'tipo-no-contesta' },
    { key: 'cliente_no_interesado', label: 'Cliente No Interesado', color: 'tipo-no-interesado' },
    { key: 'empresa_con_sustento_valido', label: 'Empresa con Sustento Válido', color: 'tipo-sustento-valido' },
];

const ESTADOS_OPORTUNIDAD = ['Identificada', 'Propuesta Entregada', 'Negociación', 'Negociada Aprobada', 'Negociada Rechazada'];

const PRODUCTOS = ['Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH', 'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'];

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const TipoBadge = ({ tipo }) => {
    const t = TIPOS.find(t => t.key === tipo);
    return <span className={`tipo-badge ${t?.color || ''}`}>{t?.label || tipo}</span>;
};

// ── Modal Contacto ────────────────────────────────────────────────────────────
const ModalContacto = ({ gestion, onClose }) => (
    <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 420 }}>
            <h2>Contacto — {gestion.razon_social}</h2>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>RUC: {gestion.ruc}</p>
            {gestion.contacto?.nombre ? (
                <div className="contacto-detalle">
                    <div className="cd-row">
                        <span className="cd-icon"><FontAwesomeIcon icon={faBriefcase} /></span>
                        <span className="cd-label">Nombre</span>
                        <span className="cd-value">{gestion.contacto.nombre}</span>
                    </div>
                    {gestion.contacto.dni && (
                        <div className="cd-row">
                            <span className="cd-icon"><FontAwesomeIcon icon={faIdCard} /></span>
                            <span className="cd-label">DNI</span>
                            <span className="cd-value">{gestion.contacto.dni}</span>
                        </div>
                    )}
                    {gestion.contacto.telefono && (
                        <div className="cd-row">
                            <span className="cd-icon"><FontAwesomeIcon icon={faPhone} /></span>
                            <span className="cd-label">Teléfono</span>
                            <span className="cd-value">{gestion.contacto.telefono}</span>
                        </div>
                    )}
                </div>
            ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '16px 0' }}>Sin contacto registrado</p>
            )}
            {/* Comentario */}
            {gestion.comentario && (
                <div style={{ marginTop: 16, background: '#f5f5f5', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                        <FontAwesomeIcon icon={faComment} style={{ marginRight: 6 }} />Comentario
                    </div>
                    <div style={{ fontSize: 13, color: '#333' }}>{gestion.comentario}</div>
                </div>
            )}
            <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    </div>
);

// ── Modal Editar ──────────────────────────────────────────────────────────────
const ModalEditar = ({ gestion, onClose, onGuardado }) => {
    const [tipo, setTipo] = useState(gestion.tipo_tipificacion);
    const [form, setForm] = useState({
        comentario: gestion.comentario || '',
        titulo: gestion.oportunidad?.titulo || '',
        producto: gestion.oportunidad?.producto || '',
        cantidad: gestion.oportunidad?.cantidad || '',
        cargo_fijo: gestion.oportunidad?.cargo_fijo || '',
        entel: gestion.oportunidad?.operadores?.entel || '',
        claro: gestion.oportunidad?.operadores?.claro || '',
        movistar: gestion.oportunidad?.operadores?.movistar || '',
        otros: gestion.oportunidad?.operadores?.otros || '',
        total_lineas: gestion.oportunidad?.operadores?.total || '',
        estado: gestion.oportunidad?.estado || 'Identificada',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        setLoading(true);
        try {
            const payload = {
                tipo_tipificacion: tipo,
                comentario: form.comentario.trim() || null,
            };
            if (tipo === 'interesado') {
                payload.oportunidad = {
                    titulo: form.titulo,
                    producto: form.producto,
                    cantidad: Number(form.cantidad),
                    cargo_fijo: Number(form.cargo_fijo),
                    operadores: {
                        entel: Number(form.entel),
                        claro: Number(form.claro),
                        movistar: Number(form.movistar),
                        otros: Number(form.otros),
                        total: Number(form.total_lineas),
                    },
                    estado: form.estado,
                    comentario: form.comentario.trim() || null,
                };
            }
            await api.put(`/gestiones/${gestion._id}`, payload);
            onGuardado();
            onClose();
        } catch {
            setError('Error al actualizar gestión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <h2>Editar Tipificación</h2>
                <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>{gestion.razon_social}</p>
                {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

                <div className="tipificaciones-grid">
                    {TIPOS.map(t => (
                        <button key={t.key} className={`btn-tipificacion ${tipo === t.key ? 'selected' : ''}`} onClick={() => setTipo(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tipo === 'interesado' && (
                    <div className="oportunidad-form">
                        <div className="form-field"><label>Estado de Oportunidad</label>
                            <select className="form-input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                {ESTADOS_OPORTUNIDAD.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label>Título de Oportunidad</label>
                            <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Renovación 20 líneas" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-field"><label>Producto</label>
                                <select className="form-input" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}>
                                    <option value="">-- Seleccionar --</option>
                                    {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="form-field"><label>Cantidad</label>
                                <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} min="1" />
                            </div>
                        </div>
                        <div className="form-field"><label>Cargo Fijo (S/.)</label>
                            <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm({ ...form, cargo_fijo: e.target.value })} />
                        </div>
                        <div className="form-field"><label>Operadores actuales</label>
                            <div className="operadores-grid">
                                {['entel', 'claro', 'movistar', 'otros', 'total_lineas'].map(op => (
                                    <div key={op} className="operador-field">
                                        <label>{op === 'total_lineas' ? 'Total' : op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                        <input type="number" value={form[op]} onChange={e => setForm({ ...form, [op]: e.target.value })} min="0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Comentario para todos los tipos */}
                <div className="form-field" style={{ marginTop: 16 }}>
                    <label>Comentario (opcional)</label>
                    <textarea
                        className="form-input"
                        value={form.comentario}
                        onChange={e => setForm({ ...form, comentario: e.target.value })}
                        placeholder="Añade un comentario sobre esta gestión..."
                        rows={3}
                        style={{ resize: 'vertical' }}
                    />
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

// ── Página principal ──────────────────────────────────────────────────────────
const MisGestiones = () => {
    const [gestiones, setGestiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [modalEditar, setModalEditar] = useState(null);
    const [modalContacto, setModalContacto] = useState(null);
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/gestiones/mis-gestiones', {
                params: { busqueda, tipo: filtroTipo, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, page: p, limit: 50 }
            });
            setGestiones(res.data.gestiones);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, filtroTipo, fechaDesde, fechaHasta]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, filtroTipo, fechaDesde, fechaHasta]);

    return (
        <div>
            <div className="page-header">
                <h1>
                    <FontAwesomeIcon icon={faClipboardList} /> Mis Gestiones
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} registros</span>
                </h1>
            </div>

            <div className="search-bar" style={{ flexWrap: 'wrap' }}>
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <select className="filter-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                    <option value="">Todos los tipos</option>
                    {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555' }}>
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
                                        <td>
                                            <button className="btn-ruc" onClick={() => setModalContacto(g)}>{g.ruc}</button>
                                        </td>
                                        <td>{g.razon_social}</td>
                                        <td>{g.segmento || '—'}</td>
                                        <td>{g.total_lineas || '—'}</td>
                                        <td><TipoBadge tipo={g.tipo_tipificacion} /></td>
                                        <td>
                                            {g.tipo_tipificacion === 'interesado' && g.oportunidad?.titulo
                                                ? <span className="oportunidad-titulo">{g.oportunidad.titulo}</span>
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
                                            <button className="btn-estado btn-asignar" onClick={() => setModalEditar(g)}>
                                                <FontAwesomeIcon icon={faPen} /> Editar
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

            {modalContacto && <ModalContacto gestion={modalContacto} onClose={() => setModalContacto(null)} />}
            {modalEditar && <ModalEditar gestion={modalEditar} onClose={() => setModalEditar(null)} onGuardado={() => cargar(page)} />}
        </div>
    );
};

export default MisGestiones;