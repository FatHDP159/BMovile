import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import BdGeneral from './pages/BdGeneral';
import MisEmpresas from './pages/MisEmpresas';
import MisGestiones from './pages/MisGestiones';
import Funnel from './pages/Funnel';
import Calendario from './pages/Calendario';
import Buscar from './pages/Buscar';
import GestionesSupervisor from './pages/GestionesSupervisor';
import Solicitudes from './pages/Solicitudes';
import CalendarioSupervisor from './pages/CalendarioSupervisor';
import NotFound from './pages/Notfound';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>Cargando...</div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/usuarios" element={<PrivateRoute roles={['sistemas']}><Layout><Usuarios /></Layout></PrivateRoute>} />
      <Route path="/bd-general" element={<PrivateRoute roles={['sistemas', 'supervisor']}><Layout><BdGeneral /></Layout></PrivateRoute>} />
      <Route path="/mi-cartera" element={<PrivateRoute roles={['asesor', 'supervisor']}><Layout><MisEmpresas /></Layout></PrivateRoute>} />
      <Route path="/mis-gestiones" element={<PrivateRoute roles={['asesor']}><Layout><MisGestiones /></Layout></PrivateRoute>} />
      <Route path="/funnel" element={<PrivateRoute roles={['asesor']}><Layout><Funnel /></Layout></PrivateRoute>} />
      <Route path="/funnel-supervisor" element={<PrivateRoute roles={['supervisor', 'sistemas']}><Layout><Funnel esSupervisor={true} /></Layout></PrivateRoute>} />
      <Route path="/calendario" element={<PrivateRoute roles={['asesor']}><Layout><Calendario /></Layout></PrivateRoute>} />
      <Route path="/buscar" element={<PrivateRoute roles={['asesor']}><Layout><Buscar /></Layout></PrivateRoute>} />
      <Route path="/gestiones-supervisor" element={<PrivateRoute roles={['supervisor', 'sistemas']}><Layout><GestionesSupervisor /></Layout></PrivateRoute>} />
      <Route path="/solicitudes" element={<PrivateRoute roles={['supervisor', 'sistemas']}><Layout><Solicitudes /></Layout></PrivateRoute>} />
      <Route path="/calendario-supervisor" element={<PrivateRoute roles={['supervisor']}><Layout><CalendarioSupervisor /></Layout></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;