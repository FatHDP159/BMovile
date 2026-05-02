import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding, faChevronLeft, faChevronRight,
    faPhone, faEnvelope, faIdCard, faBriefcase,
    faPlus, faSignal, faAddressCard, faUsers, faLocationDot
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './MisEmpresas.css';

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ── Modal Dirección ───────────────────────────────────────────────────────────
const ModalDireccion = ({ empresa, onClose }) => (
    <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 480 }}>
            <h2><FontAwesomeIcon icon={faLocationDot} style={{ marginRight: 8 }} />Dirección — {empresa.sunat?.razon_social}</h2>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>RUC: {empresa.ruc}</p>
            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '14px 16px', fontSize: 14, lineHeight: 1.6 }}>
                {empresa.sunat?.direccion || 'Sin dirección registrada'}
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
                <button className="btn-secondary" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    </div>
);

// ── Modal RRLL ────────────────────────────────────────────────────────────────
const ModalRRLL = ({ empresa, onClose }) => {
    const [contactos, setContactos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/empresas-v2/${empresa.ruc}/contactos-rrll`)
            .then(r => setContactos(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [empresa.ruc]);

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2><FontAwesomeIcon icon={faUsers} style={{ marginRight: 8 }} />Contactos RRLL — {empresa.sunat?.razon_social}</h2>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>RUC: {empresa.ruc}</p>
                <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><span style={{ color: '#888' }}>Segmento:</span> {empresa.salesforce?.segmento || '—'}</div>
                        <div><span style={{ color: '#888' }}>Total líneas:</span> {empresa.osiptel?.total || 0}</div>
                        <div><span style={{ color: '#888' }}>Consultor SF:</span> {empresa.salesforce?.consultor || '—'}</div>
                        <div><span style={{ color: '#888' }}>Estatus SF:</span> {empresa.salesforce?.estatus || '—'}</div>
                        <div><span style={{ color: '#888' }}>Claro:</span> {empresa.osiptel?.claro || 0}</div>
                        <div><span style={{ color: '#888' }}>Movistar:</span> {empresa.osiptel?.movistar || 0}</div>
                        <div><span style={{ color: '#888' }}>Entel:</span> {empresa.osiptel?.entel || 0}</div>
                        <div><span style={{ color: '#888' }}>Otros:</span> {empresa.osiptel?.otros || 0}</div>
                    </div>
                </div>
                {loading ? <p style={{ color: '#888' }}>Cargando...</p> : contactos.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin contactos RRLL registrados</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {contactos.map((c, i) => (
                            <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.nombre}</div>
                                {c.cargo && <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{c.cargo}</div>}
                                {c.tipo_doc && c.nr_doc && <div style={{ fontSize: 12, marginBottom: 4 }}><span style={{ color: '#888' }}>{c.tipo_doc}:</span> {c.nr_doc}</div>}
                                {c.telefonos?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                        <FontAwesomeIcon icon={faPhone} style={{ color: '#888', fontSize: 11, marginTop: 3 }} />
                                        {c.telefonos.map((t, j) => <span key={j} className="contacto-chip">{t}</span>)}
                                    </div>
                                )}
                                {c.correos?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <FontAwesomeIcon icon={faEnvelope} style={{ color: '#888', fontSize: 11, marginTop: 3 }} />
                                        {c.correos.map((e, j) => <span key={j} className="contacto-chip">{e}</span>)}
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

// ── EmpresaCard ───────────────────────────────────────────────────────────────
const EmpresaCard = ({ empresa, onAgregarContacto, onTipificar, onVerRRLL, onVerDireccion }) => {
    const [idx, setIdx] = useState(0);
    const contactos = empresa.contactos_autorizados || [];
    const total = contactos.length;
    const contacto = contactos[idx] || null;

    const prev = () => setIdx(i => Math.max(0, i - 1));
    const next = () => setIdx(i => Math.min(total - 1, i + 1));

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
                <div className="card-razon-social">{empresa.sunat?.razon_social || '—'}</div>
                <div className="card-meta">
                    <span className="card-lineas-badge">
                        <FontAwesomeIcon icon={faSignal} style={{ marginRight: 4 }} />
                        {empresa.osiptel?.total || 0} líneas
                    </span>
                    {empresa.salesforce?.segmento && (
                        <span className="card-meta-item">{empresa.salesforce.segmento}</span>
                    )}
                    {empresa.sunat?.direccion && (
                        <button
                            onClick={() => onVerDireccion(empresa)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f4f4f4', fontSize: 12, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Ver dirección completa"
                        >
                            <FontAwesomeIcon icon={faLocationDot} /> Ver dirección
                        </button>
                    )}
                </div>
                <div className="card-lineas-detalle">
                    {empresa.osiptel?.entel > 0 && <span className="linea-chip entel">Entel {empresa.osiptel.entel}</span>}
                    {empresa.osiptel?.claro > 0 && <span className="linea-chip claro">Claro {empresa.osiptel.claro}</span>}
                    {empresa.osiptel?.movistar > 0 && <span className="linea-chip movistar">Movistar {empresa.osiptel.movistar}</span>}
                    {empresa.osiptel?.otros > 0 && <span className="linea-chip otros">Otros {empresa.osiptel.otros}</span>}
                </div>
                <div className="card-salesforce">
                    <div className="sf-grid">
                        <div className="sf-row">
                            <span className="sf-label">Consultor SF</span>
                            <span className="sf-value">{empresa.salesforce?.consultor || '—'}</span>
                        </div>
                        <div className="sf-row">
                            <span className="sf-label">Asig. SF</span>
                            <span className="sf-value">{fmt(empresa.salesforce?.fecha_asignacion)}</span>
                        </div>
                        <div className="sf-row">
                            <span className="sf-label">Sustento</span>
                            <span className={`sf-sustento ${empresa.salesforce?.sustento ? 'si' : 'no'}`}>
                                {empresa.salesforce?.sustento ? 'Sí' : 'No'}
                            </span>
                        </div>
                        <div className="sf-row">
                            <span className="sf-label">Estatus SF</span>
                            <span className="sf-value">{empresa.salesforce?.estatus || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-body">
                {total === 0 ? (
                    <div className="sin-contactos">
                        <FontAwesomeIcon icon={faAddressCard} style={{ fontSize: 24, color: '#ddd' }} />
                        Sin contactos autorizados
                    </div>
                ) : (
                    <div className="contacto-slide" key={idx}>
                        <div className="contacto-header-row">
                            <div className="contacto-avatar">{contacto.nombre?.charAt(0).toUpperCase() || '?'}</div>
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
                                    <div className="contacto-valores-inline"><span className="contacto-chip">{contacto.dni}</span></div>
                                </div>
                            )}
                            {contacto.telefonos?.length > 0 && (
                                <div className="contacto-row">
                                    <span className="contacto-row-icon icon-phone"><FontAwesomeIcon icon={faPhone} /></span>
                                    <div className="contacto-valores-inline">
                                        {contacto.telefonos.map((t, i) => <span key={i} className="contacto-chip">{t}</span>)}
                                    </div>
                                </div>
                            )}
                            {contacto.correos?.length > 0 && (
                                <div className="contacto-row">
                                    <span className="contacto-row-icon icon-email"><FontAwesomeIcon icon={faEnvelope} /></span>
                                    <div className="contacto-valores-inline">
                                        {contacto.correos.map((e, i) => <span key={i} className="contacto-chip">{e}</span>)}
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
                    <button className="btn-nav" onClick={prev} disabled={idx === 0 || total === 0}><FontAwesomeIcon icon={faChevronLeft} /></button>
                    <button className="btn-nav" onClick={next} disabled={idx >= total - 1 || total === 0}><FontAwesomeIcon icon={faChevronRight} /></button>
                </div>
                <div className="card-actions">
                    <button className="btn-rrll" onClick={() => onVerRRLL(empresa)}>
                        <FontAwesomeIcon icon={faUsers} /> RRLL
                    </button>
                    <button className="btn-contacto" onClick={() => onAgregarContacto(empresa)}>
                        <FontAwesomeIcon icon={faPlus} /> Contacto
                    </button>
                    <button className="btn-tipificar" onClick={() => onTipificar(empresa)}>Tipificar</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Agregar Contacto ────────────────────────────────────────────────────
const ModalContacto = ({ empresa, onClose, onGuardado }) => {
    const [form, setForm] = useState({ nombre: '', dni: '', cargo: '', telefonos: [''], correos: [''] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const updateTel = (i, val) => { const arr = [...form.telefonos]; arr[i] = val; setForm({ ...form, telefonos: arr }); };
    const updateCorreo = (i, val) => { const arr = [...form.correos]; arr[i] = val; setForm({ ...form, correos: arr }); };

    const handleGuardar = async () => {
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        setLoading(true);
        try {
            await api.post('/contactos/autorizados/agregar', {
                ruc: empresa.ruc, nombre: form.nombre, cargo: form.cargo, dni: form.dni,
                telefonos: form.telefonos.filter(t => t.trim()),
                correos: form.correos.filter(e => e.trim()),
            });
            onGuardado(); onClose();
        } catch { setError('Error al agregar contacto'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2>+ Contacto Autorizado — {empresa.sunat?.razon_social}</h2>
                {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
                <div className="form-field"><label>Nombre *</label>
                    <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field"><label>DNI</label>
                        <input className="form-input" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} />
                    </div>
                    <div className="form-field"><label>Cargo</label>
                        <input className="form-input" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
                    </div>
                </div>
                <div className="form-field"><label>Teléfonos</label>
                    {form.telefonos.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input className="form-input" value={t} onChange={e => updateTel(i, e.target.value)} placeholder="Ej: 987654321" />
                            {form.telefonos.length > 1 && <button onClick={() => setForm({ ...form, telefonos: form.telefonos.filter((_, j) => j !== i) })} style={{ background: '#fce8e6', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer', color: '#c62828' }}>✕</button>}
                        </div>
                    ))}
                    <button onClick={() => setForm({ ...form, telefonos: [...form.telefonos, ''] })} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>+ Teléfono</button>
                </div>
                <div className="form-field"><label>Correos</label>
                    {form.correos.map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input className="form-input" value={e} onChange={ev => updateCorreo(i, ev.target.value)} placeholder="Ej: contacto@empresa.com" />
                            {form.correos.length > 1 && <button onClick={() => setForm({ ...form, correos: form.correos.filter((_, j) => j !== i) })} style={{ background: '#fce8e6', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer', color: '#c62828' }}>✕</button>}
                        </div>
                    ))}
                    <button onClick={() => setForm({ ...form, correos: [...form.correos, ''] })} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>+ Correo</button>
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Contacto'}</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Tipificar ───────────────────────────────────────────────────────────
const TIPIFICACIONES = [
    { key: 'interesado', label: 'Cliente Interesado' },
    { key: 'cliente_claro', label: 'Cliente Claro' },
    { key: 'sin_contacto', label: 'Sin Contactos / Teléfonos errados' },
    { key: 'con_deuda', label: 'Cliente con Deuda' },
    { key: 'no_contesta', label: 'Cliente No Contesta' },
    { key: 'cliente_no_interesado', label: 'Cliente No Interesado' },
    { key: 'empresa_con_sustento_valido', label: 'Empresa Con Sustento Valido' }
];

const PRODUCTOS = ['Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH', 'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'];

const ModalTipificar = ({ empresa, onClose, onGuardado }) => {
    const [tipo, setTipo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contactosRRLL, setContactosRRLL] = useState([]);
    const [form, setForm] = useState({
        contacto_id: '', contacto_tipo: 'autorizado',
        comentario: '', titulo: '', producto: '', cantidad: '',
        cargo_fijo: '', entel: '', claro: '', movistar: '', otros: '', total_lineas: '',
    });

    const contactosAuth = empresa.contactos_autorizados || [];

    // Cargar contactos RRLL
    useEffect(() => {
        api.get(`/empresas-v2/${empresa.ruc}/contactos-rrll`)
            .then(r => setContactosRRLL(r.data))
            .catch(() => setContactosRRLL([]));
    }, [empresa.ruc]);

    // Todos los contactos combinados con etiqueta
    const todosContactos = [
        ...contactosAuth.map(c => ({ ...c, _tipo: 'autorizado', _label: `[Auth] ${c.nombre}${c.dni ? ` - ${c.dni}` : ''}` })),
        ...contactosRRLL.map(c => ({ ...c, _tipo: 'rrll', _label: `[RRLL] ${c.nombre}${c.nr_doc ? ` - ${c.nr_doc}` : ''}` })),
    ];

    const handleGuardar = async () => {
        if (!tipo) { setError('Selecciona una tipificación'); return; }
        setLoading(true);
        try {
            const payload = {
                tipo_tipificacion: tipo,
                ruc: empresa.ruc,
                razon_social: empresa.sunat?.razon_social || '',
            };

            // Comentario para todos los tipos
            if (form.comentario.trim()) {
                payload.comentario = form.comentario.trim();
            }

            if (tipo === 'interesado') {
                const contactoSel = todosContactos.find(c => c._id === form.contacto_id);
                payload.contacto = contactoSel ? {
                    nombre: contactoSel.nombre,
                    dni: contactoSel.dni || contactoSel.nr_doc || null,
                    telefono: contactoSel.telefonos?.[0] || '',
                } : {};
                payload.oportunidad = {
                    titulo: form.titulo, producto: form.producto,
                    cantidad: Number(form.cantidad), cargo_fijo: Number(form.cargo_fijo),
                    comentario: form.comentario.trim() || null,
                    operadores: {
                        entel: Number(form.entel), claro: Number(form.claro),
                        movistar: Number(form.movistar), otros: Number(form.otros),
                        total: Number(form.total_lineas),
                    },
                };
            }

            await api.post('/gestiones', payload);
            onGuardado(); onClose();
        } catch { setError('Error al guardar tipificación'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2>Tipificar — {empresa.sunat?.razon_social}</h2>
                {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

                <div className="tipificaciones-grid">
                    {TIPIFICACIONES.map(t => (
                        <button key={t.key} className={`btn-tipificacion ${tipo === t.key ? 'selected' : ''}`} onClick={() => setTipo(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tipo === 'interesado' && (
                    <div className="oportunidad-form">
                        <div className="form-field"><label>Persona de Contacto</label>
                            <select className="form-input" value={form.contacto_id} onChange={e => setForm({ ...form, contacto_id: e.target.value })}>
                                <option value="">-- Seleccionar --</option>
                                {todosContactos.length === 0 && <option disabled>Sin contactos registrados</option>}
                                {contactosAuth.length > 0 && (
                                    <optgroup label="Contactos Autorizados">
                                        {contactosAuth.map(c => (
                                            <option key={c._id} value={c._id}>{c.nombre}{c.dni ? ` - ${c.dni}` : ''}</option>
                                        ))}
                                    </optgroup>
                                )}
                                {contactosRRLL.length > 0 && (
                                    <optgroup label="Contactos RRLL">
                                        {contactosRRLL.map(c => (
                                            <option key={c._id} value={c._id}>{c.nombre}{c.nr_doc ? ` - ${c.nr_doc}` : ''}</option>
                                        ))}
                                    </optgroup>
                                )}
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
                {tipo && (
                    <div className="form-field" style={{ marginTop: 16 }}>
                        <label>Comentario {tipo !== 'interesado' ? '(opcional)' : ''}</label>
                        <textarea
                            className="form-input"
                            value={form.comentario}
                            onChange={e => setForm({ ...form, comentario: e.target.value })}
                            placeholder="Añade un comentario sobre esta gestión..."
                            rows={3}
                            style={{ resize: 'vertical' }}
                        />
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

// ── MisEmpresas ───────────────────────────────────────────────────────────────
const MisEmpresas = () => {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [operador, setOperador] = useState('');
    const [lineasMin, setLineasMin] = useState('');
    const [lineasMax, setLineasMax] = useState('');
    const [modalContacto, setModalContacto] = useState(null);
    const [modalTipificar, setModalTipificar] = useState(null);
    const [modalRRLL, setModalRRLL] = useState(null);
    const [modalDireccion, setModalDireccion] = useState(null);
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/empresas-v2/mi-cartera', {
                params: { busqueda, operador, lineas_min: lineasMin, lineas_max: lineasMax, page: p, limit: 20 }
            });
            setEmpresas(res.data.empresas);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, operador, lineasMin, lineasMax]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, operador, lineasMin, lineasMax]);

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
                <input className="search-input" placeholder="Buscar por RUC o razón social..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <select className="filter-select" value={operador} onChange={e => setOperador(e.target.value)}>
                    <option value="">Todos los operadores</option>
                    <option value="claro">Claro</option>
                    <option value="movistar">Movistar</option>
                    <option value="entel">Entel</option>
                    <option value="otros">Otros</option>
                </select>
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
                            onVerRRLL={setModalRRLL}
                            onVerDireccion={setModalDireccion}
                        />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="paginacion">
                    <span>Página {page} de {totalPages}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => cargar(page - 1)} disabled={page === 1}><FontAwesomeIcon icon={faChevronLeft} /></button>
                        <button className="btn-secondary" onClick={() => cargar(page + 1)} disabled={page === totalPages}><FontAwesomeIcon icon={faChevronRight} /></button>
                    </div>
                </div>
            )}

            {modalContacto && <ModalContacto empresa={modalContacto} onClose={() => setModalContacto(null)} onGuardado={() => cargar(page)} />}
            {modalTipificar && <ModalTipificar empresa={modalTipificar} onClose={() => setModalTipificar(null)} onGuardado={() => cargar(page)} />}
            {modalRRLL && <ModalRRLL empresa={modalRRLL} onClose={() => setModalRRLL(null)} />}
            {modalDireccion && <ModalDireccion empresa={modalDireccion} onClose={() => setModalDireccion(null)} />}
        </div>
    );
};

export default MisEmpresas;