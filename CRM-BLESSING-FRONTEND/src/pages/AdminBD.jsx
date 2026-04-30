import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDatabase, faUpload, faSpinner, faChevronLeft, faChevronRight,
    faFileExcel, faFilter, faBuilding, faSatelliteDish, faHandshake,
    faAddressBook, faUsers, faDownload
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './BdGeneral.css';

const TABS_IMPORTAR = [
    { key: 'sunat', label: 'SUNAT', icon: faBuilding, color: '#1565c0', columnas: ['ruc', 'razon_social', 'estado', 'condicion', 'direccion', 'actividad'] },
    { key: 'osiptel', label: 'OSIPTEL', icon: faSatelliteDish, color: '#2e7d32', columnas: ['ruc', 'claro', 'movistar', 'entel', 'otros'] },
    { key: 'salesforce', label: 'SALESFORCE', icon: faHandshake, color: '#6a1b9a', columnas: ['ruc', 'segmento', 'facturacion', 'grupo_economico', 'estatus', 'consultor', 'fecha_asignacion', 'tipo_cliente', 'sustento', 'fecha_sustento', 'detalle_servicios', 'oportunidad_ganada', 'fecha_oportunidad'] },
    {
        key: 'contactos-autorizados', label: 'Contactos Auth.', icon: faAddressBook, color: '#e65100',
        columnas: ['ruc', 'nombre', 'cargo', 'dni', 'tel_1', 'tel_2', 'tel_3', 'tel_4', 'tel_5', 'correo_1', 'correo_2', 'correo_3']
    },
    {
        key: 'contactos-rrll', label: 'Contactos RRLL', icon: faUsers, color: '#00695c',
        columnas: ['ruc', 'nombre', 'cargo', 'tipo_doc', 'nr_doc', 'tel_1', 'tel_2', 'tel_3', 'tel_4', 'tel_5', 'correo_1', 'correo_2', 'correo_3']
    },
];

const fmt = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE');
};

const AdminBD = () => {
    const [tabActivo, setTabActivo] = useState('ver');
    const [tabImport, setTabImport] = useState('sunat');
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroSegmento, setFiltroSegmento] = useState('');
    const [filtroEstatus, setFiltroEstatus] = useState('');
    const [filtroConsultor, setFiltroConsultor] = useState('');
    const [filtroOperador, setFiltroOperador] = useState('');
    const [filtroLineasMin, setFiltroLineasMin] = useState('');
    const [filtroLineasMax, setFiltroLineasMax] = useState('');

    // Importación
    const [importando, setImportando] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileRefs = useRef({});
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/admin-bd/buscar', {
                params: {
                    busqueda, estado: filtroEstado, segmento: filtroSegmento,
                    estatus_sf: filtroEstatus, consultor_sf: filtroConsultor,
                    operador: filtroOperador, lineas_min: filtroLineasMin,
                    lineas_max: filtroLineasMax, page: p, limit: 50,
                }
            });
            setEmpresas(res.data.empresas);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, filtroEstado, filtroSegmento, filtroEstatus, filtroConsultor, filtroOperador, filtroLineasMin, filtroLineasMax]);

    useEffect(() => {
        if (tabActivo !== 'ver') return;
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, filtroEstado, filtroSegmento, filtroEstatus, filtroConsultor, filtroOperador, filtroLineasMin, filtroLineasMax, tabActivo]);

    const handleImportar = async (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportando(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('archivo', file);

        // Endpoints por tipo
        const endpoints = {
            'sunat': '/admin-bd/importar/sunat',
            'osiptel': '/admin-bd/importar/osiptel',
            'salesforce': '/admin-bd/importar/salesforce',
            'contactos-autorizados': '/contactos/autorizados/importar',
            'contactos-rrll': '/contactos/rrll/importar',
        };

        try {
            const res = await api.post(endpoints[tipo], formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult({ tipo, ...res.data });
        } catch (err) {
            console.error(err);
            setImportResult({ tipo, error: 'Error al importar' });
        } finally {
            setImportando(false);
            if (fileRefs.current[tipo]) fileRefs.current[tipo].value = '';
        }
    };

    const handleExportar = async () => {
        try {
            const res = await api.get('/admin-bd/exportar', {
                params: {
                    estado: filtroEstado, segmento: filtroSegmento,
                    estatus_sf: filtroEstatus, consultor_sf: filtroConsultor,
                    operador: filtroOperador, lineas_min: filtroLineasMin,
                    lineas_max: filtroLineasMax,
                }
            });
            const datos = res.data.empresas;
            const filas = [['RUC', 'Razón Social', 'Estado SUNAT', 'Dirección', 'Actividad', 'Segmento SF', 'Estatus SF', 'Consultor SF', 'Claro', 'Movistar', 'Entel', 'Otros', 'Total', 'Estado CRM', 'Asesor']];
            datos.forEach(e => filas.push([
                e.ruc, e.sunat?.razon_social || '', e.sunat?.estado || '', e.sunat?.direccion || '',
                e.sunat?.actividad || '', e.salesforce?.segmento || '', e.salesforce?.estatus || '',
                e.salesforce?.consultor || '', e.osiptel?.claro || 0, e.osiptel?.movistar || 0,
                e.osiptel?.entel || 0, e.osiptel?.otros || 0, e.osiptel?.total || 0,
                e.estado_base || '', e.asignacion?.id_asesor?.nombre_user || ''
            ]));
            const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = `admin_bd_${new Date().toISOString().split('T')[0]}.csv`; link.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error(err); }
    };

    const tabImportActivo = TABS_IMPORTAR.find(t => t.key === tabImport);

    return (
        <div>
            <div className="page-header">
                <h1><FontAwesomeIcon icon={faDatabase} /> Administración BD
                    {tabActivo === 'ver' && <span style={{ fontSize: 14, color: '#666', marginLeft: 12, fontWeight: 'normal' }}>{total} empresas</span>}
                </h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`gran-btn ${tabActivo === 'ver' ? 'active' : ''}`} onClick={() => setTabActivo('ver')}>
                        <FontAwesomeIcon icon={faFilter} /> Ver Base
                    </button>
                    <button className={`gran-btn ${tabActivo === 'importar' ? 'active' : ''}`} onClick={() => setTabActivo('importar')}>
                        <FontAwesomeIcon icon={faUpload} /> Importar
                    </button>
                </div>
            </div>

            {/* ── TAB VER ─────────────────────────────────────────────────── */}
            {tabActivo === 'ver' && (
                <>
                    {/* Filtros */}
                    <div className="search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
                        <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ minWidth: 220 }} />
                        <select className="filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                            <option value="">Todos los estados CRM</option>
                            <option value="disponible">Disponible</option>
                            <option value="asignada">Asignada</option>
                            <option value="trabajada">Trabajada</option>
                            <option value="descartada">Descartada</option>
                        </select>
                        <input className="search-input" placeholder="Segmento SF..." value={filtroSegmento} onChange={e => setFiltroSegmento(e.target.value)} style={{ maxWidth: 150 }} />
                        <input className="search-input" placeholder="Estatus SF..." value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} style={{ maxWidth: 150 }} />
                        <input className="search-input" placeholder="Consultor SF..." value={filtroConsultor} onChange={e => setFiltroConsultor(e.target.value)} style={{ maxWidth: 150 }} />
                        <select className="filter-select" value={filtroOperador} onChange={e => setFiltroOperador(e.target.value)}>
                            <option value="">Todos los operadores</option>
                            <option value="claro">Claro</option>
                            <option value="movistar">Movistar</option>
                            <option value="entel">Entel</option>
                            <option value="otros">Otros</option>
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
                            Líneas:
                            <input type="number" className="filter-select" placeholder="Mín" value={filtroLineasMin} onChange={e => setFiltroLineasMin(e.target.value)} style={{ width: 70 }} />
                            —
                            <input type="number" className="filter-select" placeholder="Máx" value={filtroLineasMax} onChange={e => setFiltroLineasMax(e.target.value)} style={{ width: 70 }} />
                        </div>
                        <button className="btn-export" onClick={handleExportar}>
                            <FontAwesomeIcon icon={faDownload} /> Exportar
                        </button>
                    </div>

                    {/* Tabla */}
                    <div className="table-container">
                        {loading ? <p style={{ padding: 20 }}>Cargando...</p> : empresas.length === 0 ? (
                            <p style={{ padding: 20, color: '#999' }}>No se encontraron empresas.</p>
                        ) : (
                            <>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>RUC</th>
                                            <th>Razón Social</th>
                                            <th>Estado SUNAT</th>
                                            <th>Segmento SF</th>
                                            <th>Estatus SF</th>
                                            <th>Consultor SF</th>
                                            <th>Claro</th>
                                            <th>Movistar</th>
                                            <th>Entel</th>
                                            <th>Total</th>
                                            <th>Estado CRM</th>
                                            <th>Asesor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {empresas.map(e => (
                                            <tr key={e._id}>
                                                <td style={{ fontWeight: 600 }}>{e.ruc}</td>
                                                <td>{e.sunat?.razon_social || '—'}</td>
                                                <td>{e.sunat?.estado || '—'}</td>
                                                <td>{e.salesforce?.segmento || '—'}</td>
                                                <td>{e.salesforce?.estatus || '—'}</td>
                                                <td>{e.salesforce?.consultor || '—'}</td>
                                                <td>{e.osiptel?.claro || 0}</td>
                                                <td>{e.osiptel?.movistar || 0}</td>
                                                <td>{e.osiptel?.entel || 0}</td>
                                                <td style={{ fontWeight: 600 }}>{e.osiptel?.total || 0}</td>
                                                <td><span className={`badge badge-${e.estado_base}`}>{e.estado_base}</span></td>
                                                <td>{e.asignacion?.id_asesor?.nombre_user || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <span style={{ fontSize: 13, color: '#666' }}>Página {page} de {totalPages} — {total} empresas</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                        <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* ── TAB IMPORTAR ─────────────────────────────────────────────── */}
            {tabActivo === 'importar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Selector de tabla */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {TABS_IMPORTAR.map(t => (
                            <button key={t.key}
                                className={`gran-btn ${tabImport === t.key ? 'active' : ''}`}
                                style={tabImport === t.key ? { background: t.color, borderColor: t.color, color: '#fff' } : {}}
                                onClick={() => { setTabImport(t.key); setImportResult(null); }}
                            >
                                <FontAwesomeIcon icon={t.icon} style={{ marginRight: 6 }} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Panel importación */}
                    <div className="table-container" style={{ padding: 28 }}>
                        <h2 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FontAwesomeIcon icon={tabImportActivo.icon} style={{ color: tabImportActivo.color }} />
                            Importar {tabImportActivo.label}
                        </h2>
                        <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
                            El Excel debe tener las siguientes columnas:
                        </p>

                        {/* Columnas requeridas */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                            {tabImportActivo.columnas.map(col => (
                                <span key={col} style={{
                                    background: col === 'ruc' ? tabImportActivo.color + '20' : '#f5f5f5',
                                    color: col === 'ruc' ? tabImportActivo.color : '#555',
                                    border: `1px solid ${col === 'ruc' ? tabImportActivo.color : '#e0e0e0'}`,
                                    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: col === 'ruc' ? 700 : 400
                                }}>
                                    {col}
                                </span>
                            ))}
                        </div>

                        {/* Resultado importación */}
                        {importResult && importResult.tipo === tabImport && (
                            <div style={{
                                padding: '12px 16px', borderRadius: 8, marginBottom: 20,
                                background: importResult.error ? '#fce8e6' : '#e8f5e9',
                                color: importResult.error ? '#c62828' : '#2e7d32',
                                fontSize: 13
                            }}>
                                {importResult.error ? `❌ ${importResult.error}` : (
                                    <>✅ {importResult.message} —
                                        {importResult.insertados !== undefined && ` ${importResult.insertados} insertados,`}
                                        {importResult.actualizados !== undefined && ` ${importResult.actualizados} actualizados`}
                                        {importResult.procesados !== undefined && ` ${importResult.procesados} procesados`}
                                        {importResult.errores?.length > 0 && ` · ${importResult.errores.length} errores`}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Botones */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                className="btn-import"
                                style={{ background: tabImportActivo.color }}
                                onClick={() => fileRefs.current[tabImport]?.click()}
                            >
                                <FontAwesomeIcon icon={faUpload} /> Seleccionar Excel — {tabImportActivo.label}
                            </button>
                            <button
                                className="btn-export"
                                onClick={async () => {
                                    const archivos = {
                                        'sunat': 'plantilla_sunat.xlsx',
                                        'osiptel': 'plantilla_osiptel.xlsx',
                                        'salesforce': 'plantilla_salesforce.xlsx',
                                        'contactos-autorizados': 'plantilla_contactos_autorizados.xlsx',
                                        'contactos-rrll': 'plantilla_contactos_rrll.xlsx',
                                    };
                                    const archivo = archivos[tabImport];
                                    try {
                                        const res = await fetch(`/${archivo}`);
                                        if (!res.ok) throw new Error();
                                        const blob = await res.blob();
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url; a.download = archivo; a.click();
                                        URL.revokeObjectURL(url);
                                    } catch {
                                        alert(`Coloca el archivo "${archivo}" en la carpeta public del frontend.`);
                                    }
                                }}
                            >
                                <FontAwesomeIcon icon={faDownload} /> Descargar Plantilla
                            </button>
                        </div>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            ref={el => fileRefs.current[tabImport] = el}
                            onChange={e => handleImportar(e, tabImport)}
                        />
                    </div>
                </div>
            )}

            {/* Modal importando */}
            {importando && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 44, color: tabImportActivo?.color || '#1D2558', marginBottom: 16 }} />
                        <h2 style={{ marginBottom: 10 }}>Importando {tabImportActivo?.label}</h2>
                        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Por favor espera...</p>
                        <div className="import-progress-bar"><div className="import-progress-fill" /></div>
                        <p style={{ color: '#bbb', fontSize: 11, marginTop: 12 }}>No cierres esta ventana</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBD;