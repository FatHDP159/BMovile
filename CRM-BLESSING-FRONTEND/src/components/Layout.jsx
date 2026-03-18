import Sidebar from './Sidebar';
import './Sidebar.css';

const Layout = ({ children }) => {
    return (
        <div className="layout-container">
            <Sidebar />
            <div className="layout-content">
                {children}
            </div>
        </div>
    );
};

export default Layout;