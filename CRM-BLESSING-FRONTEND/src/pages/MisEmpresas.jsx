import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding, faChevronLeft, faChevronRight,
    faPhone, faEnvelope, faIdCard, faBriefcase,
    faPlus, faSignal, faAddressCard, faUsers, faLocationDot,
    faEye, faPen, faBullseye
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './MisEmpresas.css';

const fmt = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const PRODUCTOS = ['Portabilidad', 'Renovación', 'Fibra', 'HFC o FTTH', 'Cloud', 'Alta', 'Licencias Google', 'Licencias Microsoft', 'SVA'];

const TIPIFICACIONES = [
    { key: 'interesado',                  label: 'Cliente Interesado' },
    { key: 'cliente_claro',               label: 'Cliente Claro' },
    { key: 'sin_contacto',                label: 'Sin Contacto' },
    { key: 'con_deuda',                   label: 'Cliente con Deuda' },
    { key: 'no_contesta',                 label: 'No Contesta' },
    { key: 'cliente_no_interesado',       label: 'Cliente No Interesado' },
    { key: 'empresa_con_sustento_valido', label: 'Empresa Con Sustento Válido' },
];

const ESTADOS_OPO = [
    { key: 'Identificada',        color: '#ede7f6', text: '#4527a0' },
    { key: 'Propuesta Entregada', color: '#fff8e1', text: '#f57f17' },
    { key: 'Negociación',         color: '#e8f5e9', text: '#2e7d32' },
    { key: 'Negociada Aprobada',  color: '#e3f2fd', text: '#1565c0' },
    { key: 'Negociada Rechazada', color: '#fce8e6', text: '#c62828' },
];

const TABS_FUNNEL = [
    { key: 'Identificada',        label: 'Identificada',    num: 1 },
    { key: 'Propuesta Entregada', label: 'Prop. Entregada', num: 2 },
    { key: 'Negociación',         label: 'Negociación',     num: 3 },
    { key: 'Cerrada',             label: 'Cerrada',         num: 4 },
];

const estadoATab = (estado) => {
    if (estado === 'Negociada Aprobada' || estado === 'Negociada Rechazada') return 'Cerrada';
    return estado || 'Identificada';
};

const EstadoOpoBadge = ({ estado }) => {
    const e = ESTADOS_OPO.find(e => e.key === estado);
    if (!e) return null;
    return <span style={{ background: e.color, color: e.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{estado}</span>;
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

// ── Modal Historial ───────────────────────────────────────────────────────────
const ModalHistorial = ({ empresa, onClose }) => {
    const [ficha, setFicha] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/ficha-gestion/historial/${empresa.ruc}`)
            .then(r => setFicha(r.data[0] || null))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [empresa.ruc]);

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
                <h2><FontAwesomeIcon icon={faEye} style={{ marginRight: 8 }} />Historial — {empresa.sunat?.razon_social}</h2>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>RUC: {empresa.ruc}</p>
                {loading ? <p style={{ color: '#888' }}>Cargando...</p> : !ficha ? (
                    <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Sin historial registrado</p>
                ) : (
                    <div>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                            {ficha.interacciones?.length || 0} interacciones · {ficha.oportunidades?.length || 0} oportunidades
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[...ficha.interacciones].reverse().map((inter, i) => (
                                <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, color: '#1D2558' }}>{TIPIFICACIONES.find(t => t.key === inter.tipo)?.label || inter.tipo}</span>
                                        <span style={{ fontSize: 11, color: '#888' }}>{fmt(inter.fecha)}</span>
                                    </div>
                                    {inter.contacto?.nombre && <div style={{ fontSize: 12, color: '#555' }}><FontAwesomeIcon icon={faBriefcase} style={{ marginRight: 4 }} />{inter.contacto.nombre}</div>}
                                    {inter.comentario && <div style={{ fontSize: 12, color: '#666', marginTop: 4, background: '#f5f5f5', borderRadius: 4, padding: '4px 8px' }}>{inter.comentario}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="modal-actions" style={{ marginTop: 20 }}>
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Gestionar Oportunidad ───────────────────────────────────────────────
const ModalGestionarOportunidad = ({ ficha, oportunidad, onClose, onGuardado }) => {
    const tabInicial = estadoATab(oportunidad.estado);
    const [tabActivo, setTabActivo] = useState(tabInicial);
    const [resultadoCierre, setResultadoCierre] = useState(
        oportunidad.estado === 'Negociada Aprobada' ? 'Aprobada' :
        oportunidad.estado === 'Negociada Rechazada' ? 'Rechazada' : ''
    );
    const [form, setForm] = useState({
        titulo: oportunidad.titulo || '',
        producto: oportunidad.producto || '',
        cantidad: oportunidad.cantidad || '',
        cargo_fijo: oportunidad.cargo_fijo || '',
        sustento: oportunidad.sustento || false,
        comentario: oportunidad.comentario || '',
        fecha_cierre_esperada: oportunidad.fecha_cierre_esperada ? new Date(oportunidad.fecha_cierre_esperada).toISOString().split('T')[0] : '',
        entel: oportunidad.operadores?.entel || '',
        claro: oportunidad.operadores?.claro || '',
        movistar: oportunidad.operadores?.movistar || '',
        otros: oportunidad.operadores?.otros || '',
        total: oportunidad.operadores?.total || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const idxActual = TABS_FUNNEL.findIndex(t => t.key === tabInicial);

    const handleGuardar = async () => {
        if (!form.producto || !form.cantidad || !form.cargo_fijo) { setError('Producto, cantidad y cargo fijo son obligatorios'); return; }
        if (tabActivo === 'Cerrada' && !resultadoCierre) { setError('Selecciona Aprobada o Rechazada'); return; }
        const estadoFinal = tabActivo === 'Cerrada' ? `Negociada ${resultadoCierre}` : tabActivo;
        setLoading(true);
        try {
            await api.put(`/ficha-gestion/${ficha._id}/oportunidades/${oportunidad._id}`, {
                titulo: form.titulo,
                producto: form.producto,
                cantidad: Number(form.cantidad),
                cargo_fijo: Number(form.cargo_fijo),
                sustento: form.sustento,
                comentario: form.comentario || null,
                fecha_cierre_esperada: form.fecha_cierre_esperada || null,
                estado: estadoFinal,
                operadores: {
                    entel: Number(form.entel) || 0,
                    claro: Number(form.claro) || 0,
                    movistar: Number(form.movistar) || 0,
                    otros: Number(form.otros) || 0,
                    total: Number(form.total) || 0,
                },
            });
            onGuardado(); onClose();
        } catch { setError('Error al guardar'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>
                <h2><FontAwesomeIcon icon={faBullseye} style={{ marginRight: 8 }} />Gestionar Oportunidad</h2>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{ficha.razon_social} — {ficha.ruc}</p>
                {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}

                <div className="funnel-tabs">
                    {TABS_FUNNEL.map((tab, i) => (
                        <button key={tab.key}
                            className={`funnel-tab ${tabActivo === tab.key ? 'active' : ''} ${i < idxActual ? 'blocked' : ''}`}
                            onClick={() => i >= idxActual && setTabActivo(tab.key)}
                            disabled={i < idxActual}
                        >
                            <span className="tab-num">{tab.num}</span> {tab.label}
                        </button>
                    ))}
                </div>

                {tabActivo === 'Cerrada' && (
                    <div className="negociada-selector">
                        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Resultado:</span>
                        <button className={`btn-negociada aprobada ${resultadoCierre === 'Aprobada' ? 'selected' : ''}`} onClick={() => setResultadoCierre('Aprobada')}>✓ Aprobada</button>
                        <button className={`btn-negociada rechazada ${resultadoCierre === 'Rechazada' ? 'selected' : ''}`} onClick={() => setResultadoCierre('Rechazada')}>✕ Rechazada</button>
                    </div>
                )}

                <div className="funnel-form">
                    <div className="form-field"><label>Título</label>
                        <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div className="form-field"><label>Producto *</label>
                            <select className="form-input" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}>
                                <option value="">-- Seleccionar --</option>
                                {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-field"><label>Cantidad *</label>
                            <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                        </div>
                        <div className="form-field"><label>Cargo Fijo *</label>
                            <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm(f => ({ ...f, cargo_fijo: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-field"><label>Fecha cierre esperada</label>
                            <input type="date" className="form-input" value={form.fecha_cierre_esperada} onChange={e => setForm(f => ({ ...f, fecha_cierre_esperada: e.target.value }))} />
                        </div>
                        <div className="form-field" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                <input type="checkbox" checked={form.sustento} onChange={e => setForm(f => ({ ...f, sustento: e.target.checked }))} />
                                Sustento cargado
                            </label>
                        </div>
                    </div>
                    <div className="form-field"><label>Operadores actuales</label>
                        <div className="operadores-grid">
                            {['entel', 'claro', 'movistar', 'otros', 'total'].map(op => (
                                <div key={op} className="operador-field">
                                    <label>{op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                    <input type="number" value={form[op]} onChange={e => setForm(f => ({ ...f, [op]: e.target.value }))} min="0" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="form-field"><label>Comentario</label>
                        <textarea className="form-input" rows={3} value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} style={{ resize: 'vertical' }} />
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Agregar Oportunidad ─────────────────────────────────────────────────
const ModalAgregarOportunidad = ({ ficha, onClose, onGuardado }) => {
    const [form, setForm] = useState({ titulo: '', producto: '', cantidad: '', cargo_fijo: '', fecha_cierre_esperada: '', sustento: false, comentario: '', entel: '', claro: '', movistar: '', otros: '', total: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        if (!form.producto || !form.cantidad || !form.cargo_fijo) { setError('Producto, cantidad y cargo fijo son obligatorios'); return; }
        setLoading(true);
        try {
            await api.post(`/ficha-gestion/${ficha._id}/oportunidades`, {
                titulo: form.titulo,
                producto: form.producto,
                cantidad: Number(form.cantidad),
                cargo_fijo: Number(form.cargo_fijo),
                fecha_cierre_esperada: form.fecha_cierre_esperada || null,
                sustento: form.sustento,
                comentario: form.comentario || null,
                operadores: { entel: Number(form.entel) || 0, claro: Number(form.claro) || 0, movistar: Number(form.movistar) || 0, otros: Number(form.otros) || 0, total: Number(form.total) || 0 },
            });
            onGuardado(); onClose();
        } catch { setError('Error al agregar oportunidad'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ width: '90vw', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
                <h2><FontAwesomeIcon icon={faPlus} style={{ marginRight: 8 }} />Nueva Oportunidad — {ficha.razon_social}</h2>
                {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 8 }}>{error}</p>}
                <div className="form-field"><label>Título</label>
                    <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Fibra 10 líneas" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div className="form-field"><label>Producto *</label>
                        <select className="form-input" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}>
                            <option value="">-- Seleccionar --</option>
                            {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="form-field"><label>Cantidad *</label>
                        <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                    </div>
                    <div className="form-field"><label>Cargo Fijo *</label>
                        <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm(f => ({ ...f, cargo_fijo: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field"><label>Fecha cierre esperada</label>
                        <input type="date" className="form-input" value={form.fecha_cierre_esperada} onChange={e => setForm(f => ({ ...f, fecha_cierre_esperada: e.target.value }))} />
                    </div>
                    <div className="form-field" style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={form.sustento} onChange={e => setForm(f => ({ ...f, sustento: e.target.checked }))} />
                            Sustento cargado
                        </label>
                    </div>
                </div>
                <div className="form-field"><label>Operadores actuales</label>
                    <div className="operadores-grid">
                        {['entel', 'claro', 'movistar', 'otros', 'total'].map(op => (
                            <div key={op} className="operador-field">
                                <label>{op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                <input type="number" value={form[op]} onChange={e => setForm(f => ({ ...f, [op]: e.target.value }))} min="0" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="form-field"><label>Comentario</label>
                    <textarea className="form-input" rows={2} value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-primary" onClick={handleGuardar} disabled={loading}>{loading ? 'Guardando...' : 'Agregar'}</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Tipificar ───────────────────────────────────────────────────────────
const ModalTipificar = ({ empresa, ficha, onClose, onGuardado }) => {
    const [tipo, setTipo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contactosRRLL, setContactosRRLL] = useState([]);
    const [form, setForm] = useState({
        contacto_nombre: '', contacto_telefono: '', contacto_dni: '',
        comentario: '',
        titulo: '', producto: '', cantidad: '', cargo_fijo: '',
        entel: '', claro: '', movistar: '', otros: '', total_lineas: '',
        fecha_cierre_esperada: '',
    });

    const contactosAuth = empresa.contactos_autorizados || [];

    useEffect(() => {
        api.get(`/empresas-v2/${empresa.ruc}/contactos-rrll`)
            .then(r => setContactosRRLL(r.data))
            .catch(() => setContactosRRLL([]));
    }, [empresa.ruc]);

    const handleContactoChange = (id) => {
        const todos = [...contactosAuth, ...contactosRRLL];
        const c = todos.find(c => c._id === id);
        if (c) setForm(f => ({ ...f, contacto_nombre: c.nombre || '', contacto_telefono: c.telefonos?.[0] || '', contacto_dni: c.dni || c.nr_doc || '' }));
    };

    const handleGuardar = async () => {
        if (!tipo) { setError('Selecciona una tipificación'); return; }
        if (tipo === 'interesado' && (!form.producto || !form.cantidad || !form.cargo_fijo)) {
            setError('Para cliente interesado debes completar producto, cantidad y cargo fijo'); return;
        }
        setLoading(true);
        try {
            // Registrar interacción
            const res = await api.post('/ficha-gestion/tipificar', {
                ruc: empresa.ruc,
                tipo,
                comentario: form.comentario.trim() || null,
                contacto: { nombre: form.contacto_nombre || null, telefono: form.contacto_telefono || null, dni: form.contacto_dni || null },
            });

            // Si es interesado → crear oportunidad automáticamente
            if (tipo === 'interesado') {
                const fichaId = res.data.ficha._id;
                await api.post(`/ficha-gestion/${fichaId}/oportunidades`, {
                    titulo: form.titulo,
                    producto: form.producto,
                    cantidad: Number(form.cantidad),
                    cargo_fijo: Number(form.cargo_fijo),
                    fecha_cierre_esperada: form.fecha_cierre_esperada || null,
                    comentario: form.comentario.trim() || null,
                    operadores: {
                        entel: Number(form.entel) || 0, claro: Number(form.claro) || 0,
                        movistar: Number(form.movistar) || 0, otros: Number(form.otros) || 0,
                        total: Number(form.total_lineas) || 0,
                    },
                });
            }

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

                {tipo && (
                    <>
                        {/* Selector contacto */}
                        <div className="form-field" style={{ marginTop: 16 }}>
                            <label>Persona de Contacto (opcional)</label>
                            <select className="form-input" onChange={e => handleContactoChange(e.target.value)} defaultValue="">
                                <option value="">-- Seleccionar --</option>
                                {contactosAuth.length > 0 && (
                                    <optgroup label="Contactos Autorizados">
                                        {contactosAuth.map(c => <option key={c._id} value={c._id}>{c.nombre}{c.dni ? ` - ${c.dni}` : ''}</option>)}
                                    </optgroup>
                                )}
                                {contactosRRLL.length > 0 && (
                                    <optgroup label="Contactos RRLL">
                                        {contactosRRLL.map(c => <option key={c._id} value={c._id}>{c.nombre}{c.nr_doc ? ` - ${c.nr_doc}` : ''}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        {/* Comentario */}
                        <div className="form-field">
                            <label>Comentario (opcional)</label>
                            <textarea className="form-input" value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="Notas sobre esta gestión..." />
                        </div>
                    </>
                )}

                {/* Formulario oportunidad — solo si tipo = interesado */}
                {tipo === 'interesado' && (
                    <div className="oportunidad-form">
                        <p style={{ fontSize: 12, color: '#1D2558', fontWeight: 600, marginBottom: 12 }}>
                            Datos de la oportunidad
                        </p>
                        <div className="form-field"><label>Título de Oportunidad</label>
                            <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Renovación 20 líneas" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-field"><label>Producto *</label>
                                <select className="form-input" value={form.producto} onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}>
                                    <option value="">-- Seleccionar --</option>
                                    {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="form-field"><label>Cantidad *</label>
                                <input type="number" className="form-input" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} min="1" />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-field"><label>Cargo Fijo (S/.) *</label>
                                <input type="number" className="form-input" value={form.cargo_fijo} onChange={e => setForm(f => ({ ...f, cargo_fijo: e.target.value }))} />
                            </div>
                            <div className="form-field"><label>Fecha cierre esperada</label>
                                <input type="date" className="form-input" value={form.fecha_cierre_esperada} onChange={e => setForm(f => ({ ...f, fecha_cierre_esperada: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-field"><label>Operadores actuales</label>
                            <div className="operadores-grid">
                                {['entel', 'claro', 'movistar', 'otros', 'total_lineas'].map(op => (
                                    <div key={op} className="operador-field">
                                        <label>{op === 'total_lineas' ? 'Total' : op.charAt(0).toUpperCase() + op.slice(1)}</label>
                                        <input type="number" value={form[op]} onChange={e => setForm(f => ({ ...f, [op]: e.target.value }))} min="0" />
                                    </div>
                                ))}
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

// ── EmpresaCard ───────────────────────────────────────────────────────────────
const EmpresaCard = ({ empresa, ficha, onTipificar, onVerRRLL, onVerDireccion, onVerHistorial, onAgregarOportunidad, onGestionarOportunidad, onAgregarContacto, onFichaActualizada }) => {
    const [idx, setIdx] = useState(0);
    const contactos = empresa.contactos_autorizados || [];
    const total = contactos.length;
    const contacto = contactos[idx] || null;
    const oportunidades = ficha?.oportunidades || [];
    const tieneOportunidades = oportunidades.length > 0;

    return (
        <div className="empresa-card">
            <div className="card-header">
                {/* Fila superior — RUC + fecha + historial */}
                <div className="card-header-top">
                    <span className="card-ruc">{empresa.ruc}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="card-fecha-asig">
                            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 8, marginRight: 4 }} />
                            {fmt(empresa.asignacion?.fecha_asignada)}
                        </span>
                        <button
                            onClick={() => onVerHistorial(empresa)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D2558', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, opacity: 0.8 }}
                            title="Ver historial de empresa"
                        >
                            <FontAwesomeIcon icon={faEye} /> Ver historial
                        </button>
                    </div>
                </div>

                <div className="card-razon-social">{empresa.sunat?.razon_social || '—'}</div>
                <div className="card-meta">
                    <span className="card-lineas-badge">
                        <FontAwesomeIcon icon={faSignal} style={{ marginRight: 4 }} />
                        {empresa.osiptel?.total || 0} líneas
                    </span>
                    {empresa.salesforce?.segmento && <span className="card-meta-item">{empresa.salesforce.segmento}</span>}
                    {empresa.sunat?.direccion && (
                        <button onClick={() => onVerDireccion(empresa)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f4f4f4', fontSize: 12, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        <div className="sf-row"><span className="sf-label">Consultor SF</span><span className="sf-value">{empresa.salesforce?.consultor || '—'}</span></div>
                        <div className="sf-row"><span className="sf-label">Asig. SF</span><span className="sf-value">{fmt(empresa.salesforce?.fecha_asignacion)}</span></div>
                        <div className="sf-row">
                            <span className="sf-label">Sustento</span>
                            <span className={`sf-sustento ${empresa.salesforce?.sustento ? 'si' : 'no'}`}>{empresa.salesforce?.sustento ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="sf-row"><span className="sf-label">Estatus SF</span><span className="sf-value">{empresa.salesforce?.estatus || '—'}</span></div>
                    </div>
                </div>
            </div>

            {/* Oportunidades activas */}
            {tieneOportunidades && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                    {oportunidades.map((opo, i) => (
                        <div key={opo._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < oportunidades.length - 1 ? '1px dashed #f0f0f0' : 'none' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{opo.titulo || opo.producto || `Oportunidad ${i + 1}`}</div>
                                <EstadoOpoBadge estado={opo.estado} />
                            </div>
                            <button className="btn-estado btn-asignar" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onGestionarOportunidad(empresa, opo)}>
                                <FontAwesomeIcon icon={faPen} /> Gestionar
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Contactos autorizados */}
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
                                {contacto.cargo && <div className="contacto-cargo"><FontAwesomeIcon icon={faBriefcase} style={{ marginRight: 4, fontSize: 10 }} />{contacto.cargo}</div>}
                            </div>
                        </div>
                        <div className="contacto-rows">
                            {contacto.dni && <div className="contacto-row"><span className="contacto-row-icon icon-dni"><FontAwesomeIcon icon={faIdCard} /></span><div className="contacto-valores-inline"><span className="contacto-chip">{contacto.dni}</span></div></div>}
                            {contacto.telefonos?.length > 0 && <div className="contacto-row"><span className="contacto-row-icon icon-phone"><FontAwesomeIcon icon={faPhone} /></span><div className="contacto-valores-inline">{contacto.telefonos.map((t, i) => <span key={i} className="contacto-chip">{t}</span>)}</div></div>}
                            {contacto.correos?.length > 0 && <div className="contacto-row"><span className="contacto-row-icon icon-email"><FontAwesomeIcon icon={faEnvelope} /></span><div className="contacto-valores-inline">{contacto.correos.map((e, i) => <span key={i} className="contacto-chip">{e}</span>)}</div></div>}
                        </div>
                    </div>
                )}
                {total > 1 && (
                    <div className="contacto-dots">
                        {contactos.map((_, i) => <span key={i} className={`dot ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)} />)}
                    </div>
                )}
            </div>

            <div className="card-footer">
                <div className="card-nav">
                    <button className="btn-nav" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0 || total === 0}><FontAwesomeIcon icon={faChevronLeft} /></button>
                    <button className="btn-nav" onClick={() => setIdx(i => Math.min(total - 1, i + 1))} disabled={idx >= total - 1 || total === 0}><FontAwesomeIcon icon={faChevronRight} /></button>
                </div>
                <div className="card-actions">
                    <button className="btn-rrll" onClick={() => onVerRRLL(empresa)}><FontAwesomeIcon icon={faUsers} /> RRLL</button>
                    <button className="btn-contacto" onClick={() => onAgregarContacto(empresa)}><FontAwesomeIcon icon={faPlus} /> Contacto</button>
                    {tieneOportunidades && (
                        <button className="btn-contacto" onClick={() => onAgregarOportunidad(empresa)}>
                            <FontAwesomeIcon icon={faBullseye} /> + Oportunidad
                        </button>
                    )}
                    <button className="btn-tipificar" onClick={() => onTipificar(empresa)}>Tipificar</button>
                </div>
            </div>
        </div>
    );
};

// ── MisEmpresas ───────────────────────────────────────────────────────────────
const MisEmpresas = () => {
    const [empresas, setEmpresas] = useState([]);
    const [fichas, setFichas] = useState({});
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [operador, setOperador] = useState('');
    const [lineasMin, setLineasMin] = useState('');
    const [lineasMax, setLineasMax] = useState('');
    const [modalTipificar, setModalTipificar] = useState(null);
    const [modalRRLL, setModalRRLL] = useState(null);
    const [modalDireccion, setModalDireccion] = useState(null);
    const [modalHistorial, setModalHistorial] = useState(null);
    const [modalContacto, setModalContacto] = useState(null);
    const [modalAgregarOpo, setModalAgregarOpo] = useState(null); // { empresa, ficha }
    const [modalGestionarOpo, setModalGestionarOpo] = useState(null); // { empresa, ficha, oportunidad }
    const searchTimeout = useRef();

    const cargar = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/empresas-v2/mi-cartera', {
                params: { busqueda, operador, lineas_min: lineasMin, lineas_max: lineasMax, page: p, limit: 20 }
            });
            const empresasList = res.data.empresas;
            setEmpresas(empresasList);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);

            // Cargar fichas activas para cada empresa
            const fichasMap = {};
            await Promise.all(empresasList.map(async (emp) => {
                try {
                    const r = await api.get(`/ficha-gestion/historial/${emp.ruc}`);
                    const fichaActiva = r.data.find(f => f.activa);
                    if (fichaActiva) fichasMap[emp.ruc] = fichaActiva;
                } catch {}
            }));
            setFichas(fichasMap);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [busqueda, operador, lineasMin, lineasMax]);

    const recargarFicha = async (ruc) => {
        try {
            const r = await api.get(`/ficha-gestion/historial/${ruc}`);
            const fichaActiva = r.data.find(f => f.activa);
            setFichas(prev => ({ ...prev, [ruc]: fichaActiva || null }));
        } catch {}
    };

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(1), 400);
    }, [busqueda, operador, lineasMin, lineasMax]);

    return (
        <div>
            <div className="mis-empresas-header">
                <h1>
                    <FontAwesomeIcon icon={faBuilding} /> Mis Empresas
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
                            ficha={fichas[e.ruc] || null}
                            onTipificar={(emp) => setModalTipificar({ empresa: emp, ficha: fichas[emp.ruc] || null })}
                            onVerRRLL={setModalRRLL}
                            onVerDireccion={setModalDireccion}
                            onVerHistorial={setModalHistorial}
                            onAgregarContacto={setModalContacto}
                            onAgregarOportunidad={(emp) => setModalAgregarOpo({ empresa: emp, ficha: fichas[emp.ruc] })}
                            onGestionarOportunidad={(emp, opo) => setModalGestionarOpo({ empresa: emp, ficha: fichas[emp.ruc], oportunidad: opo })}
                            onFichaActualizada={(ruc) => recargarFicha(ruc)}
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

            {modalTipificar && <ModalTipificar empresa={modalTipificar.empresa} ficha={modalTipificar.ficha} onClose={() => setModalTipificar(null)} onGuardado={() => { recargarFicha(modalTipificar.empresa.ruc); setModalTipificar(null); }} />}
            {modalRRLL && <ModalRRLL empresa={modalRRLL} onClose={() => setModalRRLL(null)} />}
            {modalDireccion && <ModalDireccion empresa={modalDireccion} onClose={() => setModalDireccion(null)} />}
            {modalHistorial && <ModalHistorial empresa={modalHistorial} onClose={() => setModalHistorial(null)} />}
            {modalContacto && <ModalContacto empresa={modalContacto} onClose={() => setModalContacto(null)} onGuardado={() => cargar(page)} />}
            {modalAgregarOpo && <ModalAgregarOportunidad ficha={modalAgregarOpo.ficha} onClose={() => setModalAgregarOpo(null)} onGuardado={() => { recargarFicha(modalAgregarOpo.ficha.ruc); setModalAgregarOpo(null); }} />}
            {modalGestionarOpo && <ModalGestionarOportunidad ficha={modalGestionarOpo.ficha} oportunidad={modalGestionarOpo.oportunidad} onClose={() => setModalGestionarOpo(null)} onGuardado={() => { recargarFicha(modalGestionarOpo.ficha.ruc); setModalGestionarOpo(null); }} />}
        </div>
    );
};

export default MisEmpresas;