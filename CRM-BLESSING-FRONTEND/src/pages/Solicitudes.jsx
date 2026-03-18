import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileCircleCheck, faChevronLeft, faChevronRight,
    faCheck, faXmark, faClock
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './Solicitudes.css';

const ESTADOS = [
    { key: 'pendiente',  label: 'Pendiente',  color: '#fff8e1', text: '#f57f17', icon: faClock },
    { key: 'aprobada',   label: 'Aprobada',   color: '#e8f5e9', text: '#2e7d32', icon: faCheck },
    { key: 'rechazada',  label: 'Rechazada',  color: '#fce8e6', text: '#c62828', icon: faXmark },
];

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const EstadoBadge = ({ estado }) => {
    const e = ESTADOS.find(e => e.key === estado);
    return (
        <span className="sol-estado-badge" style={{ background: e?.color, color: e?.text }}>
            <FontAwesomeIcon icon={e?.icon} /> {e?.label || estado}
        </span>
    );
};

// ── Modal confirmación ───────────────────────────────────────────────────────
const ModalConfirm = ({ solicitud, accion, onClose, onConfirmar }) => (
    <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 420 }}>
            <h2>
                <FontAwesomeIcon icon={accion === 'aprobar' ? faCheck : faXmark}
                    style={{ color: accion === 'aprobar' ? '#2e7d32' : '#c62828', marginRight: 8 }} />
                {accion === 'aprobar' ? 'Aprobar' : 'Rechazar'} Solicitud
            </h2>
            <p style={{ color: '#555', margin: '12px 0 6px' }}>
                {accion === 'aprobar'
                    ? 'La empresa será asignada al asesor y comenzará un nuevo período de 30 días.'
                    : 'La solicitud será rechazada y la empresa quedará disponible nuevamente.'}
            </p>
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 16px', margin: '12px 0 20px' }}>
                <div style={{ fontSize: 12, color: '#999' }}>{solicitud.empresa.ruc}</div>
                <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 15 }}>{solicitud.empresa.razon_social}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Solicitado por: {solicitud.asesor.nombre}</div>
            </div>
            <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                <button
                    className="btn-primary"
                    style={{ background: accion === 'aprobar' ? '#2e7d32' : '#c62828' }}
                    onClick={onConfirmar}
                >
                    Confirmar
                </button>
            </div>
        </div>
    </div>
);

// ── Página principal ─────────────────────────────────────────────────────────
const Solicitudes = () => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const [modalConfirm, setModalConfirm] = useState(null); // { solicitud, accion }
    const [procesando, setProcesando] = useState(false);

    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/solicitudes');
            let data = res.data;

            // Filtros client-side
            if (filtroEstado) data = data.filter(s => s.estado === filtroEstado);
            if (filtroAsesor) data = data.filter(s => s.asesor.id === filtroAsesor || s.asesor.nombre === filtroAsesor);
            if (fechaDesde) data = data.filter(s => new Date(s.createdAt) >= new Date(fechaDesde));
            if (fechaHasta) data = data.filter(s => new Date(s.createdAt) <= new Date(fechaHasta + 'T23:59:59'));

            // Paginación client-side
            const limit = 50;
            const totalItems = data.length;
            const totalPgs = Math.ceil(totalItems / limit) || 1;
            const start = (p - 1) * limit;
            setSolicitudes(data.slice(start, start + limit));
            setTotal(totalItems);
            setTotalPages(totalPgs);
            setPage(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filtroEstado, filtroAsesor, fechaDesde, fechaHasta]);

    useEffect(() => {
        api.get('/users').then(res => setAsesores(res.data.filter(u => u.rol_user === 'asesor'))).catch(console.error);
    }, []);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 300);
    }, [filtroEstado, filtroAsesor, fechaDesde, fechaHasta]);

    const handleAccion = async () => {
        if (!modalConfirm) return;
        setProcesando(true);
        try {
            const { solicitud, accion } = modalConfirm;
            await api.patch(`/solicitudes/${solicitud._id}/${accion}`);
            setModalConfirm(null);
            cargar(page);
        } catch (err) {
            console.error(err);
        } finally {
            setProcesando(false);
        }
    };

    const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

    return (
        <div>
            <div className="page-header">
                <h1>
                    <FontAwesomeIcon icon={faFileCircleCheck} /> Solicitudes
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} registros</span>
                </h1>
                {pendientes > 0 && (
                    <span className="sol-pendientes-badge">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
                )}
            </div>

            {/* Filtros */}
            <div className="search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
                <select className="filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
                <select className="filter-select" value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
                    <option value="">Todos los asesores</option>
                    {asesores.map(a => <option key={a._id} value={a.nombre_user}>{a.nombre_user}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                    Desde: <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    Hasta: <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            {/* Tabla */}
            <div className="table-container">
                {loading ? (
                    <p style={{ padding: 20 }}>Cargando...</p>
                ) : solicitudes.length === 0 ? (
                    <p style={{ padding: 20, color: '#999' }}>No se encontraron solicitudes.</p>
                ) : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha Solicitud</th>
                                    <th>Asesor</th>
                                    <th>RUC</th>
                                    <th>Razón Social</th>
                                    <th>Estado</th>
                                    <th>Revisado por</th>
                                    <th>Fecha Revisión</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitudes.map(s => (
                                    <tr key={s._id}>
                                        <td>{fmt(s.createdAt)}</td>
                                        <td style={{ fontWeight: 600 }}>{s.asesor.nombre}</td>
                                        <td>{s.empresa.ruc}</td>
                                        <td>{s.empresa.razon_social}</td>
                                        <td><EstadoBadge estado={s.estado} /></td>
                                        <td>{s.revisado_por || '—'}</td>
                                        <td>{fmt(s.fecha_revision)}</td>
                                        <td>
                                            {s.estado === 'pendiente' ? (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn-sol aprobar"
                                                        onClick={() => setModalConfirm({ solicitud: s, accion: 'aprobar' })}
                                                    >
                                                        <FontAwesomeIcon icon={faCheck} /> Aprobar
                                                    </button>
                                                    <button
                                                        className="btn-sol rechazar"
                                                        onClick={() => setModalConfirm({ solicitud: s, accion: 'rechazar' })}
                                                    >
                                                        <FontAwesomeIcon icon={faXmark} /> Rechazar
                                                    </button>
                                                </div>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                <span style={{ fontSize: 13, color: '#666' }}>Página {page} de {totalPages} — {total} solicitudes</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                    <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {modalConfirm && (
                <ModalConfirm
                    solicitud={modalConfirm.solicitud}
                    accion={modalConfirm.accion}
                    onClose={() => setModalConfirm(null)}
                    onConfirmar={handleAccion}
                />
            )}
        </div>
    );
};

export default Solicitudes;