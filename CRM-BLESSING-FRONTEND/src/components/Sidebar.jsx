import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome, faUsers, faDatabase, faClipboardList,
    faFunnelDollar, faCalendarAlt, faMagnifyingGlass,
    faFileCircleCheck, faRightFromBracket, faThumbtack,
    faBell, faCheckDouble, faTrash,
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Sidebar.css';

/* ── Notificaciones inline ─────────────────────────────────────────────── */
const ICONOS_TIPO = {
    actividad_proxima: '🔔',
    actividad_vencida: '⚠️',
    solicitud_aprobada: '✅',
    solicitud_rechazada: '❌',
    solicitud_nueva: '📋',
    empresa_desasignada: '🏢',
    oportunidad_sin_movimiento: '📊',
};

const fmtTiempo = (fecha) => {
    if (!fecha) return '';
    const diff = Math.floor((new Date() - new Date(fecha)) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `Hace ${diff}m`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`;
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/* ── Sidebar ───────────────────────────────────────────────────────────── */
const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [expandido, setExpandido] = useState(false);
    const [fijado, setFijado] = useState(() => localStorage.getItem('sidebar_fijado') === 'true');
    const [notifAbierto, setNotifAbierto] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [countNotif, setCountNotif] = useState(0);
    const timeoutRef = useRef();
    const intervalRef = useRef();

    const abierto = expandido || fijado;

    /* hover */
    const handleMouseEnter = () => {
        if (fijado) return;
        clearTimeout(timeoutRef.current);
        setExpandido(true);
    };
    const handleMouseLeave = () => {
        if (fijado) return;
        timeoutRef.current = setTimeout(() => {
            setExpandido(false);
            setNotifAbierto(false);
        }, 250);
    };

    /* pin */
    const toggleFijado = () => {
        const v = !fijado;
        setFijado(v);
        setExpandido(v);
        localStorage.setItem('sidebar_fijado', v);
    };

    /* notificaciones */
    const cargarCount = useCallback(async () => {
        try { const r = await api.get('/notificaciones/count'); setCountNotif(r.data.count); }
        catch { }
    }, []);

    const cargarNotifs = useCallback(async () => {
        try { const r = await api.get('/notificaciones'); setNotifs(r.data); }
        catch { }
    }, []);

    useEffect(() => {
        cargarCount();
        intervalRef.current = setInterval(cargarCount, 30000);
        return () => clearInterval(intervalRef.current);
    }, [cargarCount]);

    const toggleNotif = () => {
        if (!notifAbierto) cargarNotifs();
        setNotifAbierto(v => !v);
    };

    const handleNotifClick = async (n) => {
        if (!n.leida) {
            await api.patch(`/notificaciones/${n._id}/leer`);
            cargarCount(); cargarNotifs();
        }
        if (n.link) { navigate(n.link); setNotifAbierto(false); }
    };

    const marcarTodas = async () => {
        await api.patch('/notificaciones/leer-todas');
        setCountNotif(0); cargarNotifs();
    };

    const eliminarNotif = async (e, id) => {
        e.stopPropagation();
        await api.delete(`/notificaciones/${id}`);
        cargarNotifs(); cargarCount();
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const menuPorRol = {
        sistemas: [
            { path: '/dashboard', label: 'Dashboard', icon: faHome },
            { path: '/usuarios', label: 'Usuarios', icon: faUsers },
            { path: '/bd-general', label: 'Base General', icon: faDatabase },
            { path: '/gestiones-supervisor', label: 'Gestiones', icon: faClipboardList },
            { path: '/solicitudes', label: 'Solicitudes', icon: faFileCircleCheck },
        ],
        supervisor: [
            { path: '/dashboard', label: 'Dashboard', icon: faHome },
            { path: '/bd-general', label: 'Base General', icon: faDatabase },
            { path: '/funnel-supervisor', label: 'Funnel', icon: faFunnelDollar },
            { path: '/gestiones-supervisor', label: 'Gestiones', icon: faClipboardList },
            { path: '/solicitudes', label: 'Solicitudes', icon: faFileCircleCheck },
            { path: '/calendario-supervisor', label: 'Calendario', icon: faCalendarAlt },
        ],
        asesor: [
            { path: '/dashboard', label: 'Dashboard', icon: faHome },
            { path: '/mi-cartera', label: 'Mi Cartera', icon: faDatabase },
            { path: '/mis-gestiones', label: 'Mis Gestiones', icon: faClipboardList },
            { path: '/funnel', label: 'Funnel', icon: faFunnelDollar },
            { path: '/calendario', label: 'Calendario', icon: faCalendarAlt },
            { path: '/buscar', label: 'Buscar', icon: faMagnifyingGlass },
        ],
    };

    const menu = menuPorRol[user?.rol_user] || [];

    return (
        <aside
            className={`sb ${abierto ? 'sb--open' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Logo */}
            <div className="sb__logo">
                <div className="sb__logo-mark">B</div>
                <span className="sb__logo-name">B-Movile</span>
            </div>

            {/* Nav */}
            <nav className="sb__nav">
                {menu.map(item => (
                    <NavLink key={item.path} to={item.path}
                        className={({ isActive }) => `sb__item ${isActive ? 'sb__item--active' : ''}`}
                    >
                        <span className="sb__item-icon"><FontAwesomeIcon icon={item.icon} /></span>
                        <span className="sb__item-label">{item.label}</span>
                        {!abierto && <span className="sb__tip">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sb__footer">

                {/* Notificaciones */}
                <div className="sb__notif-wrap">
                    <button className={`sb__item sb__item--btn ${notifAbierto ? 'sb__item--active' : ''}`} onClick={toggleNotif}>
                        <span className="sb__item-icon" style={{ position: 'relative' }}>
                            <FontAwesomeIcon icon={faBell} />
                            {countNotif > 0 && <span className="sb__notif-dot">{countNotif > 9 ? '9+' : countNotif}</span>}
                        </span>
                        <span className="sb__item-label">Notificaciones</span>
                        {!abierto && <span className="sb__tip">Notificaciones{countNotif > 0 ? ` (${countNotif})` : ''}</span>}
                    </button>

                    {notifAbierto && abierto && (
                        <div className="sb__notif-panel">
                            <div className="sb__notif-header">
                                <span>Notificaciones</span>
                                {countNotif > 0 && (
                                    <button className="sb__notif-mark-all" onClick={marcarTodas}>
                                        <FontAwesomeIcon icon={faCheckDouble} /> Marcar todas
                                    </button>
                                )}
                            </div>
                            <div className="sb__notif-list">
                                {notifs.length === 0 ? (
                                    <div className="sb__notif-empty">Sin notificaciones</div>
                                ) : notifs.map(n => (
                                    <div key={n._id}
                                        className={`sb__notif-item ${!n.leida ? 'sb__notif-item--unread' : ''}`}
                                        onClick={() => handleNotifClick(n)}
                                    >
                                        <span className="sb__notif-icon">{ICONOS_TIPO[n.tipo] || '🔔'}</span>
                                        <div className="sb__notif-body">
                                            <div className="sb__notif-title">{n.titulo}</div>
                                            <div className="sb__notif-msg">{n.mensaje}</div>
                                            <div className="sb__notif-time">{fmtTiempo(n.createdAt)}</div>
                                        </div>
                                        <button className="sb__notif-del" onClick={(e) => eliminarNotif(e, n._id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pin */}
                <button className={`sb__item sb__item--btn ${fijado ? 'sb__item--pin-active' : ''}`} onClick={toggleFijado}>
                    <span className="sb__item-icon"><FontAwesomeIcon icon={faThumbtack} style={{ transform: fijado ? 'rotate(45deg)' : 'none', transition: '0.2s' }} /></span>
                    <span className="sb__item-label">{fijado ? 'Desfijar' : 'Fijar sidebar'}</span>
                    {!abierto && <span className="sb__tip">{fijado ? 'Desfijar' : 'Fijar'}</span>}
                </button>

                {/* Usuario */}
                <div className="sb__user">
                    <div className="sb__avatar">{user?.nombre_user?.charAt(0).toUpperCase()}</div>
                    <div className="sb__user-info">
                        <p className="sb__user-name">{user?.nombre_user}</p>
                        <span className="sb__user-rol">{user?.rol_user}</span>
                    </div>
                </div>

                {/* Logout */}
                <button className="sb__item sb__item--btn sb__item--logout" onClick={handleLogout}>
                    <span className="sb__item-icon"><FontAwesomeIcon icon={faRightFromBracket} /></span>
                    <span className="sb__item-label">Cerrar sesión</span>
                    {!abierto && <span className="sb__tip">Cerrar sesión</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;