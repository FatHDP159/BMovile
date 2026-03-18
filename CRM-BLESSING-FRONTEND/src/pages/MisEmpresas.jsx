import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding, faChevronLeft, faChevronRight,
    faPhone, faEnvelope, faIdCard, faUser, faBriefcase,
    faPlus, faLocationDot, faSignal, faAddressCard
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './MisEmpresas.css';

const EmpresaCard = ({ empresa, onAgregarContacto, onTipificar }) => {
    const [idx, setIdx] = useState(0);
    const contactos = empresa.contactos || [];
    const total = contactos.length;
    const contacto = contactos[idx] || null;

    const prev = () => setIdx(i => Math.max(0, i - 1));
    const next = () => setIdx(i => Math.min(total - 1, i + 1));

    const fmt = (fecha) => {
        if (!fecha) return '—';
        const d = new Date(fecha);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    return (
        <div className="empresa-card">
            <div className="card-header">
                <div className="card-header-top">
                    <span className="card-ruc">{empresa.ruc}</span>
                    <span className="card-fecha-asig">
                        <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 8, marginRight: 4 }} />
                        {fmt(empresa.asignacion?.fecha_asignada)}
                    </span>
                </div>
                <div className="card-razon-social">{empresa.razon_social}</div>
                <div className="card-meta">
                    <span className="card-lineas-badge">
                        <FontAwesomeIcon icon={faSignal} style={{ marginRight: 4 }} />
                        {empresa.lineas?.total || 0} líneas
                    </span>
                    {empresa.distrito && (
                        <span className="card-meta-item">
                            <FontAwesomeIcon icon={faLocationDot} />
                            {empresa.distrito}
                        </span>
                    )}
                </div>

                {/* Detalle de líneas */}
                <div className="card-lineas-detalle">
                    {empresa.lineas?.entel > 0 && <span className="linea-chip entel">Entel {empresa.lineas.entel}</span>}
                    {empresa.lineas?.claro > 0 && <span className="linea-chip claro">Claro {empresa.lineas.claro}</span>}
                    {empresa.lineas?.movistar > 0 && <span className="linea-chip movistar">Movistar {empresa.lineas.movistar}</span>}
                    {empresa.lineas?.otros > 0 && <span className="linea-chip otros">Otros {empresa.lineas.otros}</span>}
                </div>

                {/* Datos Salesforce */}
                {/* Datos Salesforce */}
                <div className="card-salesforce">
                    <div className="sf-grid">
                        <div className="sf-row">
                            <span className="sf-label">Consultor SF</span>
                            <span className="sf-value">{empresa.salesforce?.consultor || '—'}</span>
                        </div>
                        <div className="sf-row">
                            <span className="sf-label">Asig. SF</span>
                            <span className="sf-value">{fmt(empresa.salesforce?.fecha_asignada)}</span>
                        </div>
                        <div className="sf-row">
                            <span className="sf-label">Sustento</span>
                            <span className={`sf-sustento ${empresa.salesforce?.sustento_cargado ? 'si' : 'no'}`}>
                                {empresa.salesforce?.sustento_cargado ? 'Sí' : 'No'}
                            </span>
                            {empresa.salesforce?.fecha_carga_sustento && (
                                <span className="sf-value" style={{ marginLeft: 6 }}>{fmt(empresa.salesforce.fecha_carga_sustento)}</span>
                            )}
                        </div>
                        <div className="sf-row">
                            <span className="sf-label">Desasig. SF</span>
                            <span className="sf-value">{fmt(empresa.salesforce?.fecha_desasignacion)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-body">
                {total === 0 ? (
                    <div className="sin-contactos">
                        <FontAwesomeIcon icon={faAddressCard} style={{ fontSize: 24, color: '#ddd' }} />
                        Sin contactos registrados
                    </div>
                ) : (
                    <div className="contacto-slide" key={idx}>
                        <div className="contacto-header-row">
                            <div className="contacto-avatar">
                                {contacto.nombre?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="contacto-info-main">
                                <div className="contacto-nombre">{contacto.nombre || '—'}</div>
                                {contacto.cargo && (
                                    <div className="contacto-cargo">
                                        <FontAwesomeIcon icon={faBriefcase} style={{ marginRight: 4, fontSize: 10 }} />
                                        {contacto.cargo}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="contacto-rows">
                            {contacto.dni && (
                                <div className="contacto-row">
                                    <span className="contacto-row-icon icon-dni"><FontAwesomeIcon icon={faIdCard} /></span>
                                    <div className="contacto-valores-inline">
                                        <span className="contacto-chip">{contacto.dni}</span>
                                    </div>
                                </div>
                            )}
                            {contacto.telefonos?.length > 0 && (
                                <div className="contacto-row">
                                    <span className="contacto-row-icon icon-phone"><FontAwesomeIcon icon={faPhone} /></span>
                                    <div className="contacto-valores-inline">
                                        {contacto.telefonos.map((t, i) => (
                                            <span key={i} className="contacto-chip">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {contacto.emails?.length > 0 && (
                                <div className="contacto-row">
                                    <span className="contacto-row-icon icon-email"><FontAwesomeIcon icon={faEnvelope} /></span>
                                    <div className="contacto-valores-inline">
                                        {contacto.emails.map((e, i) => (
                                            <span key={i} className="contacto-chip">{e}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {total > 1 && (
                    <div className="contacto-dots">
                        {contactos.map((_, i) => (
                            <span key={i} className={`dot ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)} />
                        ))}
                    </div>
                )}
            </div>

            <div className="card-footer">
                <div className="card-nav">
                    <button className="btn-nav" onClick={prev} disabled={idx === 0 || total === 0}>
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button className="btn-nav" onClick={next} disabled={idx >= total - 1 || total === 0}>
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>
                <div className="card-actions">
                    <button className="btn-contacto" onClick={() => onAgregarContacto(empresa)}>
                        <FontAwesomeIcon icon={faPlus} /> Contacto
                    </button>
                    <button className="btn-tipificar" onClick={() => onTipificar(empresa)}>
                        Tipificar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModalContacto = ({ empresa, onClose, onGuardado }) => {
    const [form, setForm] = useState({ nombre: '', dni: '', cargo: '', telefonos: [''], emails: [''] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const updateTel = (i, val) => { const arr = [...form.telefonos]; arr[i] = val; setForm({ ...form, telefonos: arr }); };
    const updateEmail = (i, val) => { const arr = [...form.emails]; arr[i] = val; setForm({ ...form, emails: arr }); };
    const addTel = () => setForm({ ...form, telefonos: [...form.telefonos, ''] });
    const addEmail = () => setForm({ ...form, emails: [...form.emails, ''] });
    const removeTel = (i) => setForm({ ...form, telefonos: form.telefonos.filter((_, j) => j !== i) });
    const removeEmail = (i) => setForm({ ...form, emails: form.emails.filter((_, j) => j !== i) });

    const handleGuardar = async () => {
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre, dni: form.dni, cargo: form.cargo,
                telefonos: form.telefonos.filter(t => t.trim()),
                emails: form.emails.filter(e => e.trim()),
            };
            await api.post(`/bd-general/${empresa._id}/contactos`, payload);
            onGuardado();
            onClose();
        } catch (err) {
            setError('Error al agregar contacto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <h2>+ Contacto — {empresa.razon_social}</h2>
                {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
                <div className="form-field">
                    <label>Nombre *</label>
                    <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field">
                        <label>DNI</label>
                        <input className="form-input" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} />
                    </div>
                    <div className="form-field">
                        <label>Cargo</label>
                        <input className="form-input" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
                    </div>
                </div>
                <div className="form-field">
                    <label>Teléfonos</label>
                    {form.telefonos.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input className="form-input" value={t} onChange={e => updateTel(i, e.target.value)} placeholder="Ej: 987654321" />
                            {form.telefonos.length > 1 && (
                                <button onClick={() => removeTel(i)} style={{ background: '#fce8e6', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer', color: '#c62828' }}>✕</button>
                            )}
                        </div>
                    ))}
                    <button onClick={addTel} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>+ Teléfono</button>
                </div>
                <div className="form-field">
                    <label>Correos</label>
                    {form.emails.map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input className="form-input" value={e} onChange={ev => updateEmail(i, ev.target.value)} placeholder="Ej: contacto@empresa.com" />
                            {form.emails.length > 1 && (
                                <button onClick={() => removeEmail(i)} style={{ background: '#fce8e6', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer', color: '#c62828' }}>✕</button>
                            )}
                        </div>
                    ))}
                    <button onClick={addEmail} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>+ Correo</button>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Contacto'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TIPIFICACIONES = [
    { key: 'interesado', label: 'Cliente Interesado' },
    { key: 'cliente_claro', label: 'Cliente Claro' },
    { key: 'sin_contacto', label: 'Sin Contactos / Teléfonos errados' },
    { key: 'con_deuda', label: 'Cliente con Deuda' },
    { key: 'no_contesta', label: 'Cliente No Contesta' },
];

const PRODUCTOS = [
    'Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH',
    'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'
];

const ModalTipificar = ({ empresa, onClose, onGuardado }) => {
    const [tipo, setTipo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        contacto_id: '', titulo: '', producto: '', cantidad: '',
        cargo_fijo: '', entel: '', claro: '', movistar: '', otros: '', total_lineas: '',
    });

    const contactos = empresa.contactos || [];

    const handleGuardar = async () => {
        if (!tipo) { setError('Selecciona una tipificación'); return; }
        setLoading(true);
        try {
            const payload = { tipo_tipificacion: tipo, ruc: empresa.ruc, razon_social: empresa.razon_social };
            if (tipo === 'interesado') {
                const contactoSel = contactos.find(c => c._id === form.contacto_id);
                payload.contacto = contactoSel ? {
                    nombre: contactoSel.nombre, dni: contactoSel.dni,
                    telefono: contactoSel.telefonos?.[0] || '',
                } : {};
                payload.oportunidad = {
                    titulo: form.titulo, producto: form.producto,
                    cantidad: Number(form.cantidad), cargo_fijo: Number(form.cargo_fijo),
                    operadores: {
                        entel: Number(form.entel), claro: Number(form.claro),
                        movistar: Number(form.movistar), otros: Number(form.otros),
                        total: Number(form.total_lineas),
                    },
                };
            }
            await api.post('/gestiones', payload);
            onGuardado();
            onClose();
        } catch (err) {
            setError('Error al guardar tipificación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <h2>Tipificar — {empresa.razon_social}</h2>
                {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

                <div className="tipificaciones-grid">
                    {TIPIFICACIONES.map(t => (
                        <button
                            key={t.key}
                            className={`btn-tipificacion ${tipo === t.key ? 'selected' : ''}`}
                            onClick={() => setTipo(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tipo === 'interesado' && (
                    <div className="oportunidad-form">
                        <div className="form-field">
                            <label>Persona de Contacto</label>
                            <select className="form-input" value={form.contacto_id} onChange={e => setForm({ ...form, contacto_id: e.target.value })}>
                                <option value="">-- Seleccionar --</option>
                                {contactos.map(c => (
                                    <option key={c._id} value={c._id}>{c.nombre} {c.dni ? `- ${c.dni}` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Título de Oportunidad</label>
                            <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Renovación 20 líneas" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-field">
                                <label>Producto</label>
                                <select className="form-input" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}>
                                    <option value="">-- Seleccionar --</option>
                                    {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Cantidad</label>
                                <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} min="1" />
                            </div>
                        </div>
                        <div className="form-field">
                            <label>Cargo Fijo (S/.)</label>
                            <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm({ ...form, cargo_fijo: e.target.value })} />
                        </div>
                        <div className="form-field">
                            <label>Operadores actuales</label>
                            <div className="operadores-grid">
                                <div className="operador-field">
                                    <label>Entel</label>
                                    <input type="number" value={form.entel} onChange={e => setForm({ ...form, entel: e.target.value })} min="0" />
                                </div>
                                <div className="operador-field">
                                    <label>Claro</label>
                                    <input type="number" value={form.claro} onChange={e => setForm({ ...form, claro: e.target.value })} min="0" />
                                </div>
                                <div className="operador-field">
                                    <label>Movistar</label>
                                    <input type="number" value={form.movistar} onChange={e => setForm({ ...form, movistar: e.target.value })} min="0" />
                                </div>
                                <div className="operador-field">
                                    <label>Otros</label>
                                    <input type="number" value={form.otros} onChange={e => setForm({ ...form, otros: e.target.value })} min="0" />
                                </div>
                                <div className="operador-field">
                                    <label>Total</label>
                                    <input type="number" value={form.total_lineas} onChange={e => setForm({ ...form, total_lineas: e.target.value })} min="0" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading || !tipo}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MisEmpresas = () => {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [distrito, setDistrito] = useState('');
    const [lineasMin, setLineasMin] = useState('');
    const [lineasMax, setLineasMax] = useState('');
    const [modalContacto, setModalContacto] = useState(null);
    const [modalTipificar, setModalTipificar] = useState(null);
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/bd-general/mi-cartera', {
                params: { busqueda, distrito, lineas_min: lineasMin, lineas_max: lineasMax, page: p, limit: 20 }
            });
            setEmpresas(res.data.empresas);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [busqueda, distrito, lineasMin, lineasMax]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, distrito, lineasMin, lineasMax]);

    return (
        <div>
            <div className="mis-empresas-header">
                <h1>
                    <FontAwesomeIcon icon={faBuilding} />
                    Mis Empresas
                    <span className="total-badge">{total} cuentas</span>
                </h1>
            </div>

            <div className="filtros-bar">
                <input
                    className="search-input"
                    placeholder="Buscar por RUC o razón social..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
                <input
                    placeholder="Filtrar por distrito..."
                    value={distrito}
                    onChange={e => setDistrito(e.target.value)}
                    style={{ width: 180 }}
                />
                <div className="filtros-lineas">
                    Líneas:
                    <input type="number" placeholder="Mín" value={lineasMin} onChange={e => setLineasMin(e.target.value)} min="0" />
                    —
                    <input type="number" placeholder="Máx" value={lineasMax} onChange={e => setLineasMax(e.target.value)} min="0" />
                </div>
            </div>

            {loading ? (
                <div className="loading-cards">Cargando empresas...</div>
            ) : empresas.length === 0 ? (
                <div className="loading-cards">No se encontraron empresas.</div>
            ) : (
                <div className="empresas-grid">
                    {empresas.map(e => (
                        <EmpresaCard
                            key={e._id}
                            empresa={e}
                            onAgregarContacto={setModalContacto}
                            onTipificar={setModalTipificar}
                        />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="paginacion">
                    <span>Página {page} de {totalPages}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}>
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                </div>
            )}

            {modalContacto && (
                <ModalContacto empresa={modalContacto} onClose={() => setModalContacto(null)} onGuardado={() => cargar(page)} />
            )}
            {modalTipificar && (
                <ModalTipificar empresa={modalTipificar} onClose={() => setModalTipificar(null)} onGuardado={() => cargar(page)} />
            )}
        </div>
    );
};

export default MisEmpresas;