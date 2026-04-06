import Sidebar from './Sidebar';
import Notificaciones from './notificaciones';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';
import './Layout.css';

const Layout = ({ children }) => {
    const { user } = useAuth();

    return (
        <div className="layout-container">
            <Sidebar />
            <div className="layout-main">
                {/* Header superior */}
                <div className="layout-header">
                    <div className="layout-header-left">
                        <span className="layout-header-titulo">CRM B-Movile</span>
                    </div>
                    <div className="layout-header-right">
                        <Notificaciones />
                        <div className="layout-header-user">
                            <div className="layout-header-avatar">
                                {user?.nombre_user?.charAt(0).toUpperCase()}
                            </div>
                            <span>{user?.nombre_user}</span>
                        </div>
                    </div>
                </div>
                {/* Contenido */}
                <div className="layout-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;