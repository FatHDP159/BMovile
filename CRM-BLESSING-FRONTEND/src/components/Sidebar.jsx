import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome, faUsers, faDatabase, faClipboardList,
    faFunnelDollar, faCalendarAlt, faMagnifyingGlass,
    faFileCircleCheck, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuPorRol = {
        sistemas: [
            { path: '/dashboard',            label: 'Dashboard',    icon: faHome },
            { path: '/usuarios',             label: 'Usuarios',     icon: faUsers },
            { path: '/bd-general',           label: 'Base General', icon: faDatabase },
            { path: '/gestiones-supervisor', label: 'Gestiones',    icon: faClipboardList },
            { path: '/solicitudes',          label: 'Solicitudes',  icon: faFileCircleCheck },
        ],
        supervisor: [
            { path: '/dashboard',            label: 'Dashboard',    icon: faHome },
            { path: '/bd-general',           label: 'Base General', icon: faDatabase },
            { path: '/funnel-supervisor',    label: 'Funnel',       icon: faFunnelDollar },
            { path: '/gestiones-supervisor', label: 'Gestiones',    icon: faClipboardList },
            { path: '/solicitudes',          label: 'Solicitudes',  icon: faFileCircleCheck },
            { path: '/calendario-supervisor',label: 'Calendario',   icon: faCalendarAlt },
        ],
        asesor: [
            { path: '/dashboard',    label: 'Dashboard',      icon: faHome },
            { path: '/mi-cartera',   label: 'Mi Cartera',     icon: faDatabase },
            { path: '/mis-gestiones',label: 'Mis Gestiones',  icon: faClipboardList },
            { path: '/funnel',       label: 'Funnel',         icon: faFunnelDollar },
            { path: '/calendario',   label: 'Calendario',     icon: faCalendarAlt },
            { path: '/buscar',       label: 'Buscar',         icon: faMagnifyingGlass },
        ],
    };

    const menu = menuPorRol[user?.rol_user] || [];

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <h2>CRM Blessing</h2>
                <p>Panel de control</p>
            </div>

            <ul className="sidebar-menu">
                {menu.map((item) => (
                    <li key={item.path}>
                        <NavLink
                            to={item.path}
                            className={({ isActive }) => (isActive ? 'active' : '')}
                        >
                            <FontAwesomeIcon icon={item.icon} />
                            {item.label}
                        </NavLink>
                    </li>
                ))}
            </ul>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user?.nombre_user?.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <p>{user?.nombre_user}</p>
                        <span>{user?.rol_user}</span>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
};

export default Sidebar;