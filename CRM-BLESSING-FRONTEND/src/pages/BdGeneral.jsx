import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDatabase, faUpload, faUserPlus, faUserMinus,
    faTrash, faUsers, faAddressBook, faChevronLeft, faChevronRight,
    faFileExcel, faSpinner, faUserXmark, faListCheck
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Usuarios.css';
import './BdGeneral.css';

const BdGeneral = () => {
    const { user } = useAuth();
    const [empresas, setEmpresas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroSegmento, setFiltroSegmento] = useState('');
    const [filtroOperador, setFiltroOperador] = useState('');
    const [filtroConsultor, setFiltroConsultor] = useState('');
    const [filtroFechaAsig, setFiltroFechaAsig] = useState('');
    const [filtroFechaDesasig, setFiltroFechaDesasig] = useState('');
    const [importResult, setImportResult] = useState(null);
    const [importando, setImportando] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [showModalAsignar, setShowModalAsignar] = useState(false);
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
    const [asesorSeleccionado, setAsesorSeleccionado] = useState('');

    const [showModalMasivo, setShowModalMasivo] = useState(false);
    const [formMasivo, setFormMasivo] = useState({
        id_asesor: '', cantidad: '', segmento: '', operador: '', lineas_min: '', lineas_max: ''
    });

    const [showModalDesasignar, setShowModalDesasignar] = useState(false);
    const [formDesasignar, setFormDesasignar] = useState({
        id_asesor: '', segmento: '', operador: '', lineas_min: '', lineas_max: ''
    });
    const [desasignando, setDesasignando] = useState(false);

    const [asignandoLista, setAsignandoLista] = useState(false);
    const [listaResult, setListaResult] = useState(null);

    const [showModalContactos, setShowModalContactos] = useState(false);
    const [contactosEmpresa, setContactosEmpresa] = useState(null);

    const fileRef = useRef();
    const fileListaRef = useRef();
    const searchTimeout = useRef();

    const cargarEmpresas = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/bd-general/buscar', {
                params: {
                    busqueda, estado: filtroEstado, segmento: filtroSegmento,
                    operador: filtroOperador, consultor: filtroConsultor,
                    fecha_asignacion_sf: filtroFechaAsig, fecha_desasignacion_sf: filtroFechaDesasig,
                    page: p, limit: 50,
                },
            });
            setEmpresas(res.data.empresas);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, filtroEstado, filtroSegmento, filtroOperador, filtroConsultor, filtroFechaAsig, filtroFechaDesasig]);

    const cargarAsesores = async () => {
        try {
            const res = await api.get('/users');
            setUsuarios(res.data.filter(u => u.rol_user === 'asesor' && u.estado_user === 'activo'));
        } catch (err) { console.error(err); }
    };

    useEffect(() => { cargarAsesores(); }, []);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => { cargarEmpresas(1); }, 400);
    }, [busqueda, filtroEstado, filtroSegmento, filtroOperador, filtroConsultor, filtroFechaAsig, filtroFechaDesasig]);

    const handleImportar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportando(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('archivo', file);
        try {
            const res = await api.post('/importar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportResult(res.data);
            cargarEmpresas(1);
        } catch (err) { console.error(err); }
        finally { setImportando(false); fileRef.current.value = ''; }
    };

    const handleAsignarLista = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAsignandoLista(true);
        setListaResult(null);
        const formData = new FormData();
        formData.append('archivo', file);
        try {
            const res = await api.post('/bd-general/asignar-lista', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setListaResult(res.data);
            cargarEmpresas(1);
        } catch (err) { console.error(err); }
        finally { setAsignandoLista(false); fileListaRef.current.value = ''; }
    };

    const handleAsignar = async () => {
        try {
            await api.patch(`/bd-general/${empresaSeleccionada._id}/asignar`, { id_asesor: asesorSeleccionado });
            setShowModalAsignar(false); setEmpresaSeleccionada(null); setAsesorSeleccionado('');
            cargarEmpresas(page);
        } catch (err) { console.error(err); }
    };

    const handleDesasignar = async (id) => {
        if (!window.confirm('¿Desasignar esta empresa?')) return;
        try { await api.patch(`/bd-general/${id}/desasignar`); cargarEmpresas(page); }
        catch (err) { console.error(err); }
    };

    const handleDesasignarTodo = async (id_asesor, nombre) => {
        if (!window.confirm(`¿Desasignar todas las empresas de ${nombre}?`)) return;
        try { await api.patch(`/bd-general/desasignar-todo/${id_asesor}`); cargarEmpresas(page); }
        catch (err) { console.error(err); }
    };

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Eliminar esta empresa y sus gestiones? Esta acción no se puede deshacer.')) return;
        try { await api.delete(`/bd-general/${id}`); cargarEmpresas(page); }
        catch (err) { console.error(err); }
    };

    const handleAsignarMasivo = async () => {
        try {
            const res = await api.post('/bd-general/asignar-masivo', formMasivo);
            alert(res.data.message);
            setShowModalMasivo(false);
            setFormMasivo({ id_asesor: '', cantidad: '', segmento: '', operador: '', lineas_min: '', lineas_max: '' });
            cargarEmpresas(1);
        } catch (err) { console.error(err); }
    };

    const handleDesasignarMasivo = async () => {
        if (!formDesasignar.id_asesor) return;
        setDesasignando(true);
        try {
            const res = await api.post('/bd-general/desasignar-masivo', formDesasignar);
            alert(res.data.message);
            setShowModalDesasignar(false);
            setFormDesasignar({ id_asesor: '', segmento: '', operador: '', lineas_min: '', lineas_max: '' });
            cargarEmpresas(1);
        } catch (err) { console.error(err); }
        finally { setDesasignando(false); }
    };

    const handleExportar = async () => {
        try {
            const res = await api.get('/bd-general/buscar', {
                params: { busqueda, estado: filtroEstado, segmento: filtroSegmento, operador: filtroOperador, consultor: filtroConsultor, fecha_asignacion_sf: filtroFechaAsig, fecha_desasignacion_sf: filtroFechaDesasig, page: 1, limit: 99999 },
            });
            const datos = res.data.empresas;
            const filas = [['RUC', 'Razón Social', 'Distrito', 'Segmento', 'Total Líneas', 'Claro', 'Movistar', 'Entel', 'Otros', 'Consultor SF', 'Fecha Asig. SF', 'Fecha Desasig. SF', 'Estado', 'Asesor Asignado', 'Contacto Nombre', 'Contacto DNI', 'Contacto Cargo', 'Teléfonos', 'Correos']];
            datos.forEach(e => {
                const contacto = e.contactos?.[0] || {};
                filas.push([e.ruc, e.razon_social, e.distrito || '', e.segmento || '', e.lineas?.total || 0, e.lineas?.claro || 0, e.lineas?.movistar || 0, e.lineas?.entel || 0, e.lineas?.otros || 0, e.salesforce?.consultor || '', e.salesforce?.fecha_asignada ? new Date(e.salesforce.fecha_asignada).toLocaleDateString('es-PE') : '', e.salesforce?.fecha_desasignacion ? new Date(e.salesforce.fecha_desasignacion).toLocaleDateString('es-PE') : '', e.estado_base || '', e.asignacion?.id_asesor?.nombre_user || '', contacto.nombre || '', contacto.dni || '', contacto.cargo || '', contacto.telefonos?.join(', ') || '', contacto.emails?.join(', ') || '']);
            });
            const csv = filas.map(fila => fila.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = `base_general_${new Date().toISOString().split('T')[0]}.csv`; link.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            <div className="page-header">
                <h1><FontAwesomeIcon icon={faDatabase} /> Base General
                    <span style={{ fontSize: '14px', color: '#666', marginLeft: '12px', fontWeight: 'normal' }}>{total} empresas</span>
                </h1>
                <div className="import-section">
                    {importResult && (
                        <span className="import-result">✅ {importResult.insertados} insertados / {importResult.actualizados} actualizados</span>
                    )}
                    {listaResult && (
                        <span className="import-result">✅ {listaResult.asignados} asignados por lista</span>
                    )}
                    <button className="btn-primary" onClick={() => setShowModalMasivo(true)}>
                        <FontAwesomeIcon icon={faUsers} /> Asignación Masiva
                    </button>
                    <button className="btn-primary" style={{ background: '#c62828' }} onClick={() => setShowModalDesasignar(true)}>
                        <FontAwesomeIcon icon={faUserXmark} /> Desasignación Masiva
                    </button>
                    <button className="btn-primary" style={{ background: '#2e7d32' }} onClick={() => fileListaRef.current.click()}>
                        <FontAwesomeIcon icon={faListCheck} /> Asignar por Lista
                    </button>
                    <input type="file" ref={fileListaRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleAsignarLista} />
                    <button className="btn-export" onClick={handleExportar}>
                        <FontAwesomeIcon icon={faFileExcel} /> Exportar
                    </button>
                    {user?.rol_user === 'sistemas' && (
                        <>
                            <button className="btn-import" onClick={() => fileRef.current.click()}>
                                <FontAwesomeIcon icon={faUpload} /> Importar Excel
                            </button>
                            <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleImportar} />
                        </>
                    )}
                </div>
            </div>

            <div className="search-bar">
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <select className="filter-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="disponible">Disponible</option>
                    <option value="asignada">Asignada</option>
                    <option value="trabajada">Trabajada</option>
                    <option value="descartada">Descartada</option>
                </select>
                <select className="filter-select" value={filtroSegmento} onChange={(e) => setFiltroSegmento(e.target.value)}>
                    <option value="">Todos los segmentos</option>
                    <option value="micro empresas">Micro Empresas</option>
                    <option value="mayores">Mayores</option>
                    <option value="pyme">PYME</option>
                    <option value="empresas">Empresas</option>
                </select>
                <select className="filter-select" value={filtroOperador} onChange={(e) => setFiltroOperador(e.target.value)}>
                    <option value="">Todos los operadores</option>
                    <option value="claro">Claro</option>
                    <option value="movistar">Movistar</option>
                    <option value="entel">Entel</option>
                    <option value="otros">Otros</option>
                </select>
                <input className="search-input" placeholder="Buscar consultor SF..." value={filtroConsultor} onChange={(e) => setFiltroConsultor(e.target.value)} style={{ maxWidth: 180 }} />
                <input type="date" className="filter-select" title="Fecha asignación SF" value={filtroFechaAsig} onChange={(e) => setFiltroFechaAsig(e.target.value)} />
                <input type="date" className="filter-select" title="Fecha desasignación SF" value={filtroFechaDesasig} onChange={(e) => setFiltroFechaDesasig(e.target.value)} />
            </div>

            <div className="table-container">
                {loading ? <p style={{ padding: '20px' }}>Cargando...</p> : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>RUC</th><th>Razón Social</th><th>Distrito</th><th>Segmento</th>
                                    <th>Total Líneas</th><th>Contactos</th><th>Consultor SF</th>
                                    <th>Fecha Asig. SF</th><th>Fecha Desasig. SF</th><th>Estado</th>
                                    <th>Asesor Asignado</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empresas.map((e) => (
                                    <tr key={e._id}>
                                        <td>{e.ruc}</td>
                                        <td>{e.razon_social}</td>
                                        <td>{e.distrito}</td>
                                        <td>{e.segmento}</td>
                                        <td>{e.lineas?.total}</td>
                                        <td>
                                            <button className="btn-contactos" onClick={() => { setContactosEmpresa(e); setShowModalContactos(true); }}>
                                                <FontAwesomeIcon icon={faAddressBook} /> Ver ({e.contactos?.length || 0})
                                            </button>
                                        </td>
                                        <td>{e.salesforce?.consultor || '—'}</td>
                                        <td>{e.salesforce?.fecha_asignada ? new Date(e.salesforce.fecha_asignada).toLocaleDateString('es-PE') : '—'}</td>
                                        <td>{e.salesforce?.fecha_desasignacion ? new Date(e.salesforce.fecha_desasignacion).toLocaleDateString('es-PE') : '—'}</td>
                                        <td><span className={`badge badge-${e.estado_base}`}>{e.estado_base}</span></td>
                                        <td>
                                            {e.asignacion?.id_asesor ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {e.asignacion.id_asesor.nombre_user || 'Asignado'}
                                                    <button className="btn-estado btn-desasignar" style={{ fontSize: '10px', padding: '3px 8px' }}
                                                        onClick={() => handleDesasignarTodo(e.asignacion.id_asesor._id, e.asignacion.id_asesor.nombre_user)}
                                                        title="Desasignar todo">Todo</button>
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ display: 'flex', gap: '6px' }}>
                                            {e.estado_base === 'disponible' && (
                                                <button className="btn-estado btn-asignar" onClick={() => { setEmpresaSeleccionada(e); setShowModalAsignar(true); }}>
                                                    <FontAwesomeIcon icon={faUserPlus} /> Asignar
                                                </button>
                                            )}
                                            {(e.estado_base === 'asignada' || e.estado_base === 'trabajada') && (
                                                <button className="btn-estado btn-desasignar" onClick={() => handleDesasignar(e._id)}>
                                                    <FontAwesomeIcon icon={faUserMinus} /> Desasignar
                                                </button>
                                            )}
                                            <button className="btn-estado" style={{ backgroundColor: '#fce8e6', color: '#c62828' }} onClick={() => handleEliminar(e._id)}>
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                            <span style={{ fontSize: '13px', color: '#666' }}>Página {page} de {totalPages} — {total} empresas</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-secondary" onClick={() => cargarEmpresas(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                                <button className="btn-secondary" onClick={() => cargarEmpresas(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Importando */}
            {importando && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 44, color: '#1D2558', marginBottom: 16 }} />
                        <h2 style={{ marginBottom: 10 }}>Importando base de datos</h2>
                        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Por favor espera...</p>
                        <div className="import-progress-bar"><div className="import-progress-fill" /></div>
                        <p style={{ color: '#bbb', fontSize: 11, marginTop: 12 }}>No cierres esta ventana</p>
                    </div>
                </div>
            )}

            {/* Modal Asignando por Lista */}
            {asignandoLista && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 44, color: '#2e7d32', marginBottom: 16 }} />
                        <h2 style={{ marginBottom: 10 }}>Asignando empresas</h2>
                        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Por favor espera...</p>
                        <div className="import-progress-bar"><div className="import-progress-fill" /></div>
                        <p style={{ color: '#bbb', fontSize: 11, marginTop: 12 }}>No cierres esta ventana</p>
                    </div>
                </div>
            )}

            {/* Modal Asignar Individual */}
            {showModalAsignar && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Asignar Empresa</h2>
                        <p style={{ marginBottom: '16px', color: '#555' }}>{empresaSeleccionada?.razon_social}</p>
                        <div className="form-field"><label>Selecciona un asesor</label>
                            <select className="form-input" value={asesorSeleccionado} onChange={(e) => setAsesorSeleccionado(e.target.value)}>
                                <option value="">-- Seleccionar --</option>
                                {usuarios.map((u) => <option key={u._id} value={u._id}>{u.nombre_user} - {u.dni_user}</option>)}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowModalAsignar(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleAsignar} disabled={!asesorSeleccionado}>Asignar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Asignación Masiva */}
            {showModalMasivo && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Asignación Masiva</h2>
                        <div className="form-field"><label>Asesor</label>
                            <select className="form-input" value={formMasivo.id_asesor} onChange={(e) => setFormMasivo({ ...formMasivo, id_asesor: e.target.value })}>
                                <option value="">-- Seleccionar --</option>
                                {usuarios.map((u) => <option key={u._id} value={u._id}>{u.nombre_user} - {u.dni_user}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label>Cantidad de empresas</label>
                            <input type="number" className="form-input" value={formMasivo.cantidad} onChange={(e) => setFormMasivo({ ...formMasivo, cantidad: e.target.value })} min="1" />
                        </div>
                        <div className="form-field"><label>Segmento (opcional)</label>
                            <select className="form-input" value={formMasivo.segmento} onChange={(e) => setFormMasivo({ ...formMasivo, segmento: e.target.value })}>
                                <option value="">Todos los segmentos</option>
                                <option value="micro empresas">Micro Empresas</option>
                                <option value="mayores">Mayores</option>
                                <option value="pyme">PYME</option>
                                <option value="empresas">Empresas</option>
                            </select>
                        </div>
                        <div className="form-field"><label>Operador (opcional)</label>
                            <select className="form-input" value={formMasivo.operador} onChange={(e) => setFormMasivo({ ...formMasivo, operador: e.target.value })}>
                                <option value="">Mixto</option>
                                <option value="claro">Claro</option>
                                <option value="movistar">Movistar</option>
                                <option value="entel">Entel</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>
                        <div className="form-field"><label>Líneas mínimas (opcional)</label>
                            <input type="number" className="form-input" placeholder="Ej: 5" value={formMasivo.lineas_min} onChange={(e) => setFormMasivo({ ...formMasivo, lineas_min: e.target.value })} min="0" />
                        </div>
                        <div className="form-field"><label>Líneas máximas (opcional)</label>
                            <input type="number" className="form-input" placeholder="Ej: 30" value={formMasivo.lineas_max} onChange={(e) => setFormMasivo({ ...formMasivo, lineas_max: e.target.value })} min="0" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowModalMasivo(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleAsignarMasivo} disabled={!formMasivo.id_asesor || !formMasivo.cantidad}>Asignar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Desasignación Masiva */}
            {showModalDesasignar && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2><FontAwesomeIcon icon={faUserXmark} style={{ marginRight: 8, color: '#c62828' }} />Desasignación Masiva</h2>
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Desasigna empresas del asesor seleccionado según los filtros opcionales.</p>
                        <div className="form-field"><label>Asesor *</label>
                            <select className="form-input" value={formDesasignar.id_asesor} onChange={(e) => setFormDesasignar({ ...formDesasignar, id_asesor: e.target.value })}>
                                <option value="">-- Seleccionar asesor --</option>
                                {usuarios.map((u) => <option key={u._id} value={u._id}>{u.nombre_user} - {u.dni_user}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label>Segmento (opcional)</label>
                            <select className="form-input" value={formDesasignar.segmento} onChange={(e) => setFormDesasignar({ ...formDesasignar, segmento: e.target.value })}>
                                <option value="">Todos los segmentos</option>
                                <option value="micro empresas">Micro Empresas</option>
                                <option value="mayores">Mayores</option>
                                <option value="pyme">PYME</option>
                                <option value="empresas">Empresas</option>
                            </select>
                        </div>
                        <div className="form-field"><label>Operador (opcional)</label>
                            <select className="form-input" value={formDesasignar.operador} onChange={(e) => setFormDesasignar({ ...formDesasignar, operador: e.target.value })}>
                                <option value="">Todos</option>
                                <option value="claro">Claro</option>
                                <option value="movistar">Movistar</option>
                                <option value="entel">Entel</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>
                        <div className="form-field"><label>Líneas mínimas (opcional)</label>
                            <input type="number" className="form-input" placeholder="Ej: 5" value={formDesasignar.lineas_min} onChange={(e) => setFormDesasignar({ ...formDesasignar, lineas_min: e.target.value })} min="0" />
                        </div>
                        <div className="form-field"><label>Líneas máximas (opcional)</label>
                            <input type="number" className="form-input" placeholder="Ej: 30" value={formDesasignar.lineas_max} onChange={(e) => setFormDesasignar({ ...formDesasignar, lineas_max: e.target.value })} min="0" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowModalDesasignar(false)}>Cancelar</button>
                            <button className="btn-primary" style={{ background: '#c62828' }} onClick={handleDesasignarMasivo} disabled={!formDesasignar.id_asesor || desasignando}>
                                {desasignando ? 'Desasignando...' : <><FontAwesomeIcon icon={faUserXmark} /> Desasignar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Contactos */}
            {showModalContactos && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2><FontAwesomeIcon icon={faAddressBook} /> Contactos — {contactosEmpresa?.razon_social}</h2>
                        <table className="contactos-modal-table">
                            <thead><tr><th>Nombre</th><th>DNI</th><th>Cargo</th><th>Teléfonos</th><th>Correos</th></tr></thead>
                            <tbody>
                                {contactosEmpresa?.contactos?.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Sin contactos registrados</td></tr>
                                ) : (
                                    contactosEmpresa?.contactos?.map((c, i) => (
                                        <tr key={i}>
                                            <td>{c.nombre || '—'}</td><td>{c.dni || '—'}</td><td>{c.cargo || '—'}</td>
                                            <td>{c.telefonos?.length > 0 ? c.telefonos.join(', ') : '—'}</td>
                                            <td>{c.emails?.length > 0 ? c.emails.join(', ') : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowModalContactos(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BdGeneral;