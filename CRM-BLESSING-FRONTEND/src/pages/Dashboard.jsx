import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPhone, faHandshake, faRotate, faClipboardList, faPaperPlane,
    faUsers, faTrophy, faDollarSign, faMobileAlt, faWifi, faPhone as faPhoneFija,
    faCloud, faChartLine, faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardSupervisor from './DashboardSupervisor';
import DashboardSistemas from './DashboardSistemas';
import './Dashboard.css';

const COLORS_DONA = ['#3949ab', '#2e7d32', '#c62828', '#f57f17'];

const fmt = (n) => `S/. ${Number(n || 0).toFixed(2)}`;
const pct = (n) => `${n || 0}%`;

const TarjetaKPI = ({ icon, label, value, color, sub }) => (
    <div className="kpi-card" style={{ borderTop: `3px solid ${color}` }}>
        <div className="kpi-icon" style={{ background: color + '20', color }}><FontAwesomeIcon icon={icon} /></div>
        <div className="kpi-info">
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
            {sub && <div className="kpi-sub">{sub}</div>}
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const esAsesor = user?.rol_user === 'asesor';

    if (user?.rol_user === 'sistemas') {
        return <DashboardSistemas />;
    }

    if (user?.rol_user === 'supervisor') {
        return <DashboardSupervisor />;
    }

    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    const [fechaDesde, setFechaDesde] = useState(primerDia);
    const [fechaHasta, setFechaHasta] = useState(ultimoDia);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const cargar = useCallback(async () => {
        if (!esAsesor) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await api.get('/dashboard/asesor', {
                params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta }
            });
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [fechaDesde, fechaHasta, esAsesor]);

    useEffect(() => { cargar(); }, [cargar]);

    if (!esAsesor) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <h1><FontAwesomeIcon icon={faChartLine} /> Dashboard</h1>
                </div>
                <p style={{ color: '#888', padding: 20 }}>Bienvenido, {user?.nombre_user}.</p>
            </div>
        );
    }

    if (loading) return <div style={{ padding: 40, color: '#888' }}>Cargando dashboard...</div>;

    const { actividadesHoy, tarjetas, kpis } = data || {};

    // Datos dona
    const donaData = [
        { name: 'Móvil',  value: kpis?.ventasPorProducto?.movil  || 0 },
        { name: 'Fibra',  value: kpis?.ventasPorProducto?.fibra  || 0 },
        { name: 'Cloud',  value: kpis?.ventasPorProducto?.cloud  || 0 },
        { name: 'Fija',   value: kpis?.ventasPorProducto?.fija   || 0 },
    ].filter(d => d.value > 0);

    // Datos funnel
    const funnelData = kpis?.funnelStages || [];

    const maxFunnel = Math.max(...funnelData.map(f => f.cantidad), 1);

    return (
        <div className="dashboard-page">
            {/* Header + filtro */}
            <div className="dash-header">
                <div>
                    <h1><FontAwesomeIcon icon={faChartLine} /> Dashboard</h1>
                    <p className="dash-saludo">Bienvenido, {user?.nombre_user} 👋</p>
                </div>
                <div className="dash-filtro">
                    <span>Período:</span>
                    <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    <span>—</span>
                    <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            {/* Sección 1 — Actividades del día */}
            <div className="dash-seccion">
                <div className="dash-seccion-header">
                    <h2>Actividades de hoy</h2>
                    <button className="btn-secondary" onClick={() => navigate('/calendario')}>
                        <FontAwesomeIcon icon={faCalendarAlt} /> Ver agenda
                    </button>
                </div>
                <div className="act-hoy-grid">
                    {[
                        { tipo: 'llamada',            label: 'Llamadas',       icon: faPhone,         color: '#1565c0' },
                        { tipo: 'reunion',             label: 'Reuniones',      icon: faHandshake,     color: '#2e7d32' },
                        { tipo: 'seguimiento',         label: 'Seguimientos',   icon: faRotate,        color: '#c62828' },
                        { tipo: 'tarea',               label: 'Tareas',         icon: faClipboardList, color: '#f57f17' },
                        { tipo: 'enviar_informacion',  label: 'Envío info',     icon: faPaperPlane,    color: '#6a1b9a' },
                    ].map(a => (
                        <div key={a.tipo} className="act-hoy-card" style={{ borderLeft: `3px solid ${a.color}` }}>
                            <span className="act-hoy-icon" style={{ color: a.color }}><FontAwesomeIcon icon={a.icon} /></span>
                            <span className="act-hoy-num">{actividadesHoy?.[a.tipo] || 0}</span>
                            <span className="act-hoy-label">{a.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sección 2 — Tarjetas KPI */}
            <div className="dash-seccion">
                <h2>Rendimiento del período</h2>
                <div className="kpi-grid">
                    <TarjetaKPI icon={faUsers}     label="Clientes en Funnel"  value={tarjetas?.clientesFunnel || 0}  color="#3949ab" />
                    <TarjetaKPI icon={faTrophy}    label="Ganadas"             value={tarjetas?.ganadas || 0}          color="#2e7d32" />
                    <TarjetaKPI icon={faDollarSign} label="CF Total Ganadas"   value={fmt(tarjetas?.cfTotal)}          color="#f57f17" />
                    <TarjetaKPI icon={faMobileAlt} label="CF Móvil"            value={fmt(tarjetas?.cfMovil)}          color="#1565c0" />
                    <TarjetaKPI icon={faWifi}      label="CF Fibra"            value={fmt(tarjetas?.cfFibra)}          color="#00838f" />
                    <TarjetaKPI icon={faPhoneFija} label="CF Fija"             value={fmt(tarjetas?.cfFija)}           color="#6a1b9a" />
                    <TarjetaKPI icon={faCloud}     label="CF Cloud"            value={fmt(tarjetas?.cfCloud)}          color="#c62828" />
                </div>
            </div>

            {/* Sección 3 — KPIs */}
            <div className="dash-seccion">
                <h2>KPIs comerciales</h2>
                <div className="kpi-charts-grid">

                    {/* Dona — ventas por producto */}
                    <div className="kpi-chart-card">
                        <h3>Ventas por producto</h3>
                        {donaData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={donaData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                                        {donaData.map((_, i) => <Cell key={i} fill={COLORS_DONA[i % COLORS_DONA.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="sin-datos">Sin ventas en el período</p>}
                    </div>

                    {/* Tasa de efectividad */}
                    <div className="kpi-chart-card">
                        <h3>Tasa de efectividad</h3>
                        <div className="efectividad-container">
                            <div className="efectividad-circle">
                                <svg viewBox="0 0 120 120" width="140" height="140">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="12" />
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#3949ab" strokeWidth="12"
                                        strokeDasharray={`${(kpis?.tasaEfectividad || 0) * 3.14} 314`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 60 60)"
                                    />
                                    <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1a2e">{pct(kpis?.tasaEfectividad)}</text>
                                    <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#999">efectividad</text>
                                </svg>
                            </div>
                            <div className="efectividad-detalle">
                                <div className="efect-row">
                                    <span className="efect-label">Asignadas</span>
                                    <span className="efect-val">{kpis?.empresasAsignadas || 0}</span>
                                </div>
                                <div className="efect-row">
                                    <span className="efect-label">Interesados</span>
                                    <span className="efect-val">{kpis?.interesados || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Funnel comercial */}
                    <div className="kpi-chart-card">
                        <h3>Avance del funnel</h3>
                        <div className="funnel-chart">
                            {funnelData.map((f, i) => (
                                <div key={i} className="funnel-barra-row">
                                    <span className="funnel-etapa">{f.etapa}</span>
                                    <div className="funnel-barra-bg">
                                        <div className="funnel-barra-fill"
                                            style={{ width: `${(f.cantidad / maxFunnel) * 100}%`, opacity: 1 - i * 0.15 }}
                                        />
                                    </div>
                                    <span className="funnel-num">{f.cantidad}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reuniones por día */}
                    <div className="kpi-chart-card">
                        <h3>Reuniones completadas</h3>
                        {kpis?.reunionesChart?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={kpis.reunionesChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="cantidad" fill="#3949ab" radius={[4,4,0,0]} name="Reuniones" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="sin-datos">Sin reuniones completadas en el periodo</p>}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;