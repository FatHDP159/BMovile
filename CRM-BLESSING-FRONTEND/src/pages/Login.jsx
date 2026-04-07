import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Login.css';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [verContraseña, setVerContraseña] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', {
                correo_user: correo,
                contraseña_user: contraseña,
            });
            login(res.data.user, res.data.accessToken, res.data.refreshToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">Bienvenido!</h2>
                <p className="login-subtitle">Inicia sesión para continuar</p>

                {error && <p className="login-error">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label>Correo</label>
                        <input
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            className="login-input"
                            placeholder="correo@clarob2bempresas.com.pe"
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label>Contraseña</label>
                        <div className="login-input-wrapper">
                            <input
                                type={verContraseña ? 'text' : 'password'}
                                value={contraseña}
                                onChange={(e) => setContraseña(e.target.value)}
                                className="login-input"
                                placeholder="••••••••••••"
                                required
                            />
                            <button
                                type="button"
                                className="login-eye-btn"
                                onClick={() => setVerContraseña(v => !v)}
                                tabIndex={-1}
                            >
                                <FontAwesomeIcon icon={verContraseña ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Iniciando...' : 'Iniciar sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;