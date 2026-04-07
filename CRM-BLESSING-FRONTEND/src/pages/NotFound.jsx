import { useNavigate } from 'react-router-dom';
import './NotFound.css'

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="notfound-container">
            <div className="notfound-content">
                <div className="notfound-code">404</div>
                <h1 className="notfound-title">Página no encontrada</h1>
                <p className="notfound-msg">La ruta que buscas no existe o no tienes acceso.</p>
                <button className="notfound-btn" onClick={() => navigate('/dashboard')}>
                    Volver al Dashboard
                </button>
            </div>
        </div>
    );
};

export default NotFound;