import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Cargando...</div>;

    if (!user) return <Navigate to="/login" />;

    if (roles && !roles.includes(user.rol_user)) {
        return <Navigate to="/dashboard" />;
    }

    return children;
};

export default PrivateRoute;