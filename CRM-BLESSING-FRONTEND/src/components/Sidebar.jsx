import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome, faUsers, faDatabase, faClipboardList,
    faFunnelDollar, faCalendarAlt, faMagnifyingGlass,
    faFileCircleCheck, faRightFromBracket, faThumbtack,
} from '@fortawesome/free-solid-svg-icons';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [expandido, setExpandido] = useState(false);
    const [fijado, setFijado] = useState(() => localStorage.getItem('sidebar_fijado') === 'true');
    const timeoutRef = useRef();

    const handleMouseEnter = () => {
        if (fijado) return;
        clearTimeout(timeoutRef.current);
        setExpandido(true);
    };

    const handleMouseLeave = () => {
        if (fijado) return;
        timeoutRef.current = setTimeout(() => setExpandido(false), 200);
    };

    const toggleFijado = () => {
        const nuevo = !fijado;
        setFijado(nuevo);
        setExpandido(nuevo);
        localStorage.setItem('sidebar_fijado', nuevo);
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const abierto = expandido || fijado;

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
            className={`sidebar ${abierto ? 'sidebar--abierto' : 'sidebar--cerrado'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Logo */}
            <div className="sidebar__logo">
                <div className="sidebar__logo-icon">B</div>
                <span className="sidebar__logo-text">CRM B-Movile</span>
            </div>

            {/* Menú */}
            <nav className="sidebar__nav">
                {menu.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                        title={!abierto ? item.label : ''}
                    >
                        <span className="sidebar__link-icon">
                            <FontAwesomeIcon icon={item.icon} />
                        </span>
                        <span className="sidebar__link-label">{item.label}</span>
                        {!abierto && (
                            <span className="sidebar__tooltip">{item.label}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar__footer">
                {/* Pin */}
                <button
                    className={`sidebar__pin ${fijado ? 'sidebar__pin--active' : ''}`}
                    onClick={toggleFijado}
                    title={fijado ? 'Desfijar sidebar' : 'Fijar sidebar'}
                >
                    <FontAwesomeIcon icon={faThumbtack} />
                    <span className="sidebar__link-label">{fijado ? 'Desfijar' : 'Fijar'}</span>
                </button>

                {/* Usuario */}
                <div className="sidebar__user">
                    <div className="sidebar__avatar">
                        {user?.nombre_user?.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar__user-info">
                        <p className="sidebar__user-name">{user?.nombre_user}</p>
                        <span className="sidebar__user-rol">{user?.rol_user}</span>
                    </div>
                </div>

                {/* Logout */}
                <button className="sidebar__logout" onClick={handleLogout}>
                    <span className="sidebar__link-icon">
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </span>
                    <span className="sidebar__link-label">Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;