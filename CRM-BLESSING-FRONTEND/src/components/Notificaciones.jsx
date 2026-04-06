import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faTrash, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Notificaciones.css';

const ICONOS_TIPO = {
    actividad_proxima: { icon: '🔔', color: '#f57f17' },
    actividad_vencida: { icon: '⚠️', color: '#c62828' },
    solicitud_aprobada: { icon: '✅', color: '#2e7d32' },
    solicitud_rechazada: { icon: '❌', color: '#c62828' },
    solicitud_nueva: { icon: '📋', color: '#1565c0' },
    empresa_desasignada: { icon: '🏢', color: '#6a1b9a' },
    oportunidad_sin_movimiento: { icon: '📊', color: '#f57f17' },
};

const fmt = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    const ahora = new Date();
    const diff = Math.floor((ahora - d) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `Hace ${diff}m`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const Notificaciones = () => {
    const [abierto, setAbierto] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [count, setCount] = useState(0);
    const ref = useRef();
    const navigate = useNavigate();
    const intervalRef = useRef();

    const cargarCount = useCallback(async () => {
        try {
            const res = await api.get('/notificaciones/count');
            setCount(res.data.count);
        } catch (err) { console.error(err); }
    }, []);

    const cargarNotifs = useCallback(async () => {
        try {
            const res = await api.get('/notificaciones');
            setNotifs(res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        cargarCount();
        intervalRef.current = setInterval(cargarCount, 30000);
        return () => clearInterval(intervalRef.current);
    }, [cargarCount]);

    useEffect(() => {
        if (abierto) cargarNotifs();
    }, [abierto, cargarNotifs]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleClick = async (notif) => {
        if (!notif.leida) {
            await api.patch(`/notificaciones/${notif._id}/leer`);
            cargarCount();
            cargarNotifs();
        }
        if (notif.link) {
            navigate(notif.link);
            setAbierto(false);
        }
    };

    const marcarTodas = async () => {
        await api.patch('/notificaciones/leer-todas');
        setCount(0);
        cargarNotifs();
    };

    const eliminar = async (e, id) => {
        e.stopPropagation();
        await api.delete(`/notificaciones/${id}`);
        cargarNotifs();
        cargarCount();
    };

    return (
        <div className="notif-wrapper" ref={ref}>
            <button className="notif-btn" onClick={() => setAbierto(a => !a)}>
                <FontAwesomeIcon icon={faBell} />
                {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
            </button>

            {abierto && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <span>Notificaciones</span>
                        {count > 0 && (
                            <button className="notif-marcar-todas" onClick={marcarTodas}>
                                <FontAwesomeIcon icon={faCheckDouble} /> Marcar todas
                            </button>
                        )}
                    </div>

                    <div className="notif-lista">
                        {notifs.length === 0 ? (
                            <div className="notif-vacia">Sin notificaciones</div>
                        ) : (
                            notifs.map(n => {
                                const info = ICONOS_TIPO[n.tipo] || { icon: '🔔', color: '#666' };
                                return (
                                    <div key={n._id}
                                        className={`notif-item ${!n.leida ? 'no-leida' : ''}`}
                                        onClick={() => handleClick(n)}
                                    >
                                        <span className="notif-icono">{info.icon}</span>
                                        <div className="notif-contenido">
                                            <div className="notif-titulo">{n.titulo}</div>
                                            <div className="notif-mensaje">{n.mensaje}</div>
                                            <div className="notif-tiempo">{fmt(n.createdAt)}</div>
                                        </div>
                                        <button className="notif-eliminar" onClick={(e) => eliminar(e, n._id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notificaciones;