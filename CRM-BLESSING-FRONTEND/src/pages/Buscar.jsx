import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch, faCircleCheck, faCircleXmark,
    faClock, faTriangleExclamation, faUserTie
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';
import './Buscar.css';

const ESTADOS = {
    en_gestion: {
        label: 'En gestión',
        icon: faCircleCheck,
        color: '#e8f5e9', text: '#2e7d32',
        descripcion: 'Esta empresa está siendo gestionada actualmente.',
    },
    liberada: {
        label: 'Liberada',
        icon: faCircleCheck,
        color: '#e3f2fd', text: '#1565c0',
        descripcion: 'Han pasado más de 30 días desde la última gestión.',
    },
    no_gestionada: {
        label: 'No gestionada',
        icon: faCircleCheck,
        color: '#f3e5f5', text: '#6a1b9a',
        descripcion: 'Esta empresa existe en el sistema pero nunca ha sido gestionada.',
    },
    solicitud_pendiente: {
        label: 'Solicitud pendiente',
        icon: faClock,
        color: '#fff8e1', text: '#f57f17',
        descripcion: 'Ya existe una solicitud pendiente de revisión para esta empresa.',
    },
    no_encontrada: {
        label: 'No encontrada',
        icon: faCircleXmark,
        color: '#fce8e6', text: '#c62828',
        descripcion: 'La empresa no se encuentra registrada en el sistema. Por favor, envíe el RUC al equipo de sistemas para la creación de la cuenta.',
    },
};

const Buscar = () => {
    const [ruc, setRuc] = useState('');
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modalConfirm, setModalConfirm] = useState(false);
    const [solicitando, setSolicitando] = useState(false);
    const [exito, setExito] = useState('');

    const handleBuscar = async () => {
        if (!ruc.trim()) { setError('Ingresa un RUC para buscar'); return; }
        setLoading(true);
        setError('');
        setResultado(null);
        setExito('');
        try {
            const res = await api.get(`/solicitudes/buscar/${ruc.trim()}`);
            setResultado(res.data);
        } catch (err) {
            setError('Error al buscar la empresa');
        } finally {
            setLoading(false);
        }
    };

    const handleSolicitar = async () => {
        setSolicitando(true);
        try {
            await api.post('/solicitudes', {
                ruc: resultado.ruc,
                razon_social: resultado.razon_social,
            });
            setExito('Solicitud enviada correctamente. El supervisor revisará tu solicitud.');
            setModalConfirm(false);
            // Refrescar resultado
            const res = await api.get(`/solicitudes/buscar/${ruc.trim()}`);
            setResultado(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al enviar solicitud');
            setModalConfirm(false);
        } finally {
            setSolicitando(false);
        }
    };

    const estadoInfo = resultado ? ESTADOS[resultado.estado] : null;
    const puedeSOlicitar = resultado && (resultado.estado === 'liberada' || resultado.estado === 'no_gestionada');

    return (
        <div>
            <div className="page-header">
                <h1><FontAwesomeIcon icon={faSearch} /> Buscar Empresa</h1>
            </div>

            {/* Buscador */}
            <div className="buscar-container">
                <div className="buscar-box">
                    <h2>Consultar empresa por RUC</h2>
                    <p>Ingresa el RUC de la empresa para conocer su estado en el sistema.</p>
                    <div className="buscar-input-row">
                        <input
                            className="form-input buscar-input"
                            placeholder="Ej: 20100234567"
                            value={ruc}
                            onChange={e => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                            maxLength={11}
                        />
                        <button className="btn-primary" onClick={handleBuscar} disabled={loading}>
                            {loading ? 'Buscando...' : <><FontAwesomeIcon icon={faSearch} /> Buscar</>}
                        </button>
                    </div>
                    {error && <p className="buscar-error">{error}</p>}
                    {exito && <p className="buscar-exito">{exito}</p>}
                </div>

                {/* Resultado */}
                {resultado && estadoInfo && (
                    <div className="buscar-resultado" style={{ borderLeft: `4px solid ${estadoInfo.text}` }}>
                        <div className="resultado-header">
                            <div className="resultado-estado" style={{ background: estadoInfo.color, color: estadoInfo.text }}>
                                <FontAwesomeIcon icon={estadoInfo.icon} />
                                {estadoInfo.label}
                            </div>
                        </div>

                        {resultado.estado !== 'no_encontrada' && (
                            <div className="resultado-datos">
                                <div className="resultado-row">
                                    <span className="resultado-label">RUC</span>
                                    <span className="resultado-value">{resultado.ruc}</span>
                                </div>
                                {resultado.razon_social && (
                                    <div className="resultado-row">
                                        <span className="resultado-label">Razón Social</span>
                                        <span className="resultado-value">{resultado.razon_social}</span>
                                    </div>
                                )}
                                {resultado.consultor && (
                                    <div className="resultado-row">
                                        <span className="resultado-label">
                                            <FontAwesomeIcon icon={faUserTie} style={{ marginRight: 4 }} />
                                            Consultor
                                        </span>
                                        <span className="resultado-value">{resultado.consultor}</span>
                                    </div>
                                )}
                                {resultado.solicitud && (
                                    <div className="resultado-row">
                                        <span className="resultado-label">Solicitado por</span>
                                        <span className="resultado-value">{resultado.solicitud.solicitado_por}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="resultado-descripcion">{estadoInfo.descripcion}</p>

                        {/* Acción */}
                        {puedeSOlicitar && (
                            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setModalConfirm(true)}>
                                Solicitar empresa
                            </button>
                        )}

                        {resultado.estado === 'en_gestion' && (
                            <div className="resultado-bloqueado">
                                No es posible solicitar esta empresa mientras esté en gestión.
                            </div>
                        )}

                        {resultado.estado === 'solicitud_pendiente' && (
                            <div className="resultado-bloqueado amarillo">
                                {resultado.solicitud?.es_mia
                                    ? 'Ya tienes una solicitud pendiente para esta empresa.'
                                    : 'No es posible solicitar esta empresa mientras haya una solicitud pendiente.'}
                            </div>
                        )}
                    </div>
                )}

                {/* Indicaciones */}
                {!resultado && !loading && (
                    <div className="buscar-indicaciones">
                        <div className="indicacion-item">
                            <span className="ind-dot" style={{ background: '#2e7d32' }} />
                            <div><strong>En gestión</strong> — Empresa siendo trabajada actualmente (menos de 30 días)</div>
                        </div>
                        <div className="indicacion-item">
                            <span className="ind-dot" style={{ background: '#1565c0' }} />
                            <div><strong>Liberada</strong> — Más de 30 días sin gestión. Puedes solicitarla.</div>
                        </div>
                        <div className="indicacion-item">
                            <span className="ind-dot" style={{ background: '#6a1b9a' }} />
                            <div><strong>No gestionada</strong> — Existe en el sistema pero nunca fue gestionada. Puedes solicitarla.</div>
                        </div>
                        <div className="indicacion-item">
                            <span className="ind-dot" style={{ background: '#f57f17' }} />
                            <div><strong>Solicitud pendiente</strong> — Otro asesor ya solicitó esta empresa.</div>
                        </div>
                        <div className="indicacion-item">
                            <span className="ind-dot" style={{ background: '#c62828' }} />
                            <div><strong>No encontrada</strong> — No existe en el sistema. Contacta a sistemas.</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal confirmación */}
            {modalConfirm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 440 }}>
                        <h2><FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#f57f17', marginRight: 8 }} />Confirmar Solicitud</h2>
                        <p style={{ color: '#555', margin: '12px 0 20px' }}>
                            ¿Estás seguro de solicitar la siguiente empresa?
                        </p>
                        <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>{resultado.ruc}</div>
                            <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 15 }}>{resultado.razon_social}</div>
                        </div>
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
                            La solicitud quedará pendiente hasta que el supervisor la apruebe o rechace.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setModalConfirm(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSolicitar} disabled={solicitando}>
                                {solicitando ? 'Enviando...' : 'Confirmar Solicitud'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Buscar;