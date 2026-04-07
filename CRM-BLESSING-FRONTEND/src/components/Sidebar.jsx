import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome, faUsers, faDatabase, faClipboardList,
    faFunnelDollar, faCalendarAlt, faMagnifyingGlass,
    faFileCircleCheck, faRightFromBracket, faThumbtack,
    faBell, faCheckDouble, faTrash, faGear, faCircleInfo,
    faSun, faMoon, faXmark, faEnvelope, faPhone,
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Sidebar.css';

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

// ── Modal Ajustes ────────────────────────────────────────────────────────
const ModalAjustes = ({ onClose }) => {
    const { darkMode, toggleTheme } = useTheme();

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2><FontAwesomeIcon icon={faGear} style={{ marginRight: 8 }} />Ajustes</h2>
                    <button className="btn-secondary" style={{ padding: '4px 10px' }} onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className="ajustes-seccion">
                    <p className="ajustes-label">Apariencia</p>
                    <div className="ajustes-tema-row">
                        <div className="ajustes-tema-info">
                            <FontAwesomeIcon icon={darkMode ? faMoon : faSun} style={{ color: darkMode ? '#7b8ff7' : '#f57f17', marginRight: 8 }} />
                            <span>{darkMode ? 'Modo oscuro' : 'Modo claro'}</span>
                        </div>
                        <button className={`theme-toggle ${darkMode ? 'theme-toggle--dark' : ''}`} onClick={toggleTheme}>
                            <span className="theme-toggle-thumb" />
                        </button>
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                    <button className="btn-primary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Ayuda ──────────────────────────────────────────────────────────
const ModalAyuda = ({ onClose }) => (
    <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2><FontAwesomeIcon icon={faCircleInfo} style={{ marginRight: 8 }} />Ayuda</h2>
                <button className="btn-secondary" style={{ padding: '4px 10px' }} onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <div className="ajustes-seccion">
                <p className="ajustes-label">Soporte técnico</p>
                <div className="ayuda-item">
                    <FontAwesomeIcon icon={faEnvelope} style={{ color: '#3949ab' }} />
                    <span>alexis.ayala@clarob2bnegocios.com.pe</span>
                </div>
                <div className="ayuda-item">
                    <FontAwesomeIcon icon={faPhone} style={{ color: '#3949ab' }} />
                    <span>+51 905 578 852</span>
                </div>
            </div>

            <div className="ajustes-seccion">
                <p className="ajustes-label">Sistema</p>
                <div className="ayuda-item">
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Versión</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>CRM B-Movile v1.0.0</span>
                </div>
                <div className="ayuda-item">
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Desarrollado por</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Alexis Ayala</span>
                </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn-primary" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    </div>
);

// ── Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [expandido, setExpandido] = useState(false);
    const [fijado, setFijado] = useState(() => localStorage.getItem('sidebar_fijado') === 'true');
    const [notifAbierto, setNotifAbierto] = useState(false);
    const [userMenuAbierto, setUserMenuAbierto] = useState(false);
    const [modalAjustes, setModalAjustes] = useState(false);
    const [modalAyuda, setModalAyuda] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [countNotif, setCountNotif] = useState(0);
    const timeoutRef = useRef();
    const intervalRef = useRef();
    const userMenuRef = useRef();

    const abierto = expandido || fijado;

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

    const toggleFijado = () => {
        const v = !fijado;
        setFijado(v);
        setExpandido(v);
        localStorage.setItem('sidebar_fijado', v);
    };

    useEffect(() => {
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const cargarCount = useCallback(async () => {
        try { const r = await api.get('/notificaciones/count'); setCountNotif(r.data.count); } catch { }
    }, []);

    const cargarNotifs = useCallback(async () => {
        try { const r = await api.get('/notificaciones'); setNotifs(r.data); } catch { }
    }, []);

    useEffect(() => {
        cargarCount();
        intervalRef.current = setInterval(cargarCount, 30000);
        return () => clearInterval(intervalRef.current);
    }, [cargarCount]);

    const toggleNotif = () => {
        if (!notifAbierto) cargarNotifs();
        setNotifAbierto(v => !v);
        setUserMenuAbierto(false);
    };

    const handleNotifClick = async (n) => {
        if (!n.leida) { await api.patch(`/notificaciones/${n._id}/leer`); cargarCount(); cargarNotifs(); }
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
        <>
            <aside
                className={`sb ${abierto ? 'sb--open' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Logo + Pin */}
                <div className="sb__logo">
                    <div className="sb__logo-mark">B</div>
                    <span className="sb__logo-name">B-Movile</span>
                    <button
                        className={`sb__pin-btn ${fijado ? 'sb__pin-btn--active' : ''}`}
                        onClick={toggleFijado}
                        title={fijado ? 'Desanclar panel' : 'Anclar panel'}
                    >
                        <FontAwesomeIcon icon={faThumbtack} />
                    </button>
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

                    {/* Avatar + menú usuario */}
                    <div className="sb__user-wrap" ref={userMenuRef}>
                        <button
                            className="sb__user-btn"
                            onClick={() => { setUserMenuAbierto(v => !v); setNotifAbierto(false); }}
                        >
                            <div className="sb__avatar">{user?.nombre_user?.charAt(0).toUpperCase()}</div>
                            <div className="sb__user-info">
                                <p className="sb__user-name">{user?.nombre_user}</p>
                                <span className="sb__user-rol">{user?.rol_user}</span>
                            </div>
                            {!abierto && <span className="sb__tip">{user?.nombre_user}</span>}
                        </button>

                        {userMenuAbierto && (
                            <div className="sb__user-menu">
                                <div className="sb__user-menu-header">
                                    <div className="sb__user-menu-avatar">{user?.nombre_user?.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <p className="sb__user-menu-name">{user?.nombre_user}</p>
                                        <p className="sb__user-menu-email">{user?.correo_user || user?.rol_user}</p>
                                    </div>
                                </div>
                                <div className="sb__user-menu-divider" />
                                <button className="sb__user-menu-item" onClick={() => { setModalAjustes(true); setUserMenuAbierto(false); }}>
                                    <FontAwesomeIcon icon={faGear} /> Ajustes
                                </button>
                                <button className="sb__user-menu-item" onClick={() => { setModalAyuda(true); setUserMenuAbierto(false); }}>
                                    <FontAwesomeIcon icon={faCircleInfo} /> Ayuda
                                </button>
                                <div className="sb__user-menu-divider" />
                                <button className="sb__user-menu-item sb__user-menu-item--logout" onClick={handleLogout}>
                                    <FontAwesomeIcon icon={faRightFromBracket} /> Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {modalAjustes && <ModalAjustes onClose={() => setModalAjustes(false)} />}
            {modalAyuda && <ModalAyuda onClose={() => setModalAyuda(false)} />}
        </>
    );
};

export default Sidebar;