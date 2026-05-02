import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory, faUpload, faSpinner, faChevronLeft, faChevronRight,
    faFilter
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
    { key: 'empresa_con_sustento_valido', label: 'Empresa con Sustento Válido', color: 'tipo-sustento-valido' },
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

const Historial = () => {
    const [gestiones, setGestiones] = useState([]);
    const [asesores, setAsesores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importando, setImportando] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const fileRef = useRef();
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
                const totalPgs = Math.ceil(data.length / limit) || 1;
                setGestiones(data.slice((p - 1) * limit, p * limit));
                setTotal(data.length);
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

    const handleImportar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportando(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('archivo', file);
        try {
            const res = await api.post('/historial/importar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(res.data);
            cargar(1);
        } catch (err) {
            console.error(err);
            setImportResult({ error: 'Error al importar' });
        } finally {
            setImportando(false);
            fileRef.current.value = '';
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>
                    <FontAwesomeIcon icon={faHistory} /> Historial de Gestiones
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} registros</span>
                </h1>
                <div className="import-section">
                    {importResult && !importResult.error && (
                        <span className="import-result">
                            ✅ {importResult.insertados} insertados / {importResult.errores?.length || 0} errores
                        </span>
                    )}
                    {importResult?.error && (
                        <span style={{ color: '#c62828', fontSize: 13 }}>❌ {importResult.error}</span>
                    )}
                    <button className="btn-import" onClick={() => fileRef.current.click()}>
                        <FontAwesomeIcon icon={faUpload} /> Importar Historial
                    </button>
                    <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleImportar} />
                </div>
            </div>

            {/* Filtros */}
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
                    <FontAwesomeIcon icon={faFilter} />
                    Desde: <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    Hasta: <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            {/* Tabla */}
            <div className="table-container">
                {loading ? (
                    <p style={{ padding: 20 }}>Cargando...</p>
                ) : gestiones.length === 0 ? (
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
                                    <th>Producto</th>
                                    <th>Estado Oportunidad</th>
                                    <th>Comentario</th>
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
                                        <td>{g.oportunidad?.producto || '—'}</td>
                                        <td>
                                            {g.oportunidad?.estado
                                                ? <span style={{ fontSize: 11, fontWeight: 600, color: '#3949ab' }}>{g.oportunidad.estado}</span>
                                                : '—'}
                                        </td>
                                        <td style={{ maxWidth: 200, fontSize: 11, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {g.comentario || g.oportunidad?.comentario || '—'}
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

            {/* Modal importando */}
            {importando && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 44, color: '#1D2558', marginBottom: 16 }} />
                        <h2 style={{ marginBottom: 10 }}>Importando historial</h2>
                        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Por favor espera...</p>
                        <div className="import-progress-bar"><div className="import-progress-fill" /></div>
                        <p style={{ color: '#bbb', fontSize: 11, marginTop: 12 }}>No cierres esta ventana</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Historial;