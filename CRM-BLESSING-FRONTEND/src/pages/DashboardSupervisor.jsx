import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine, faUsers, faTrophy, faDollarSign, faBuilding,
    faPercent, faCalendarAlt, faPhone, faHandshake, faPaperPlane,
    faRotate, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../services/api';
import './Dashboard.css';
import './DashboardSupervisor.css';

const COLORS_DONA = ['#3949ab', '#2e7d32', '#c62828', '#f57f17'];

const fmt = (n) => `S/. ${Number(n || 0).toFixed(2)}`;
const pct = (n) => `${n || 0}%`;

const fmtFecha = (fecha, hora) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora || ''}`;
};

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

const TIPOS_ACT = {
    llamada: { label: 'Llamada', icon: faPhone, color: '#1565c0' },
    reunion: { label: 'Reunión', icon: faHandshake, color: '#2e7d32' },
    enviar_informacion: { label: 'Envío info', icon: faPaperPlane, color: '#6a1b9a' },
    seguimiento: { label: 'Seguimiento', icon: faRotate, color: '#c62828' },
};

const DashboardSupervisor = () => {
    const navigate = useNavigate();
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    const [fechaDesde, setFechaDesde] = useState(primerDia);
    const [fechaHasta, setFechaHasta] = useState(ultimoDia);
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard/supervisor', {
                params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, id_asesor: filtroAsesor }
            });
            setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [fechaDesde, fechaHasta, filtroAsesor]);

    useEffect(() => { cargar(); }, [cargar]);

    if (loading) return <div style={{ padding: 40, color: '#888' }}>Cargando dashboard...</div>;

    const { metricas, rendimientoPorAsesor, kpis, actPendientes, asesores } = data || {};

    const donaData = [
        { name: 'Móvil', value: kpis?.ventasPorProducto?.movil || 0 },
        { name: 'Fibra', value: kpis?.ventasPorProducto?.fibra || 0 },
        { name: 'Cloud', value: kpis?.ventasPorProducto?.cloud || 0 },
        { name: 'Fija', value: kpis?.ventasPorProducto?.fija || 0 },
    ].filter(d => d.value > 0);

    const tiposData = [
        { name: 'Interesado', value: kpis?.gestionesPorTipo?.interesado || 0, color: '#2e7d32' },
        { name: 'Cliente Claro', value: kpis?.gestionesPorTipo?.cliente_claro || 0, color: '#1565c0' },
        { name: 'Sin Contacto', value: kpis?.gestionesPorTipo?.sin_contacto || 0, color: '#f57f17' },
        { name: 'Con Deuda', value: kpis?.gestionesPorTipo?.con_deuda || 0, color: '#c62828' },
        { name: 'No Contesta', value: kpis?.gestionesPorTipo?.no_contesta || 0, color: '#6a1b9a' },
        { name: 'No Interesado', value: kpis?.gestionesPorTipo?.cliente_no_interesado || 0, color: '#283593' },
        { name: 'Sustento Válido', value: kpis?.gestionesPorTipo?.empresa_con_sustento_valido || 0, color: '#00695c' },
    ].filter(d => d.value > 0);

    const funnelData = kpis?.funnelStages || [];
    const maxFunnel = Math.max(...funnelData.map(f => f.cantidad), 1);

    const vencidas = actPendientes?.filter(a => {
        const dt = new Date(a.fecha);
        const [h, m] = (a.hora || '00:00').split(':');
        dt.setHours(Number(h), Number(m), 0, 0);
        return dt < new Date();
    }) || [];

    const proximas = actPendientes?.filter(a => {
        const dt = new Date(a.fecha);
        const [h, m] = (a.hora || '00:00').split(':');
        dt.setHours(Number(h), Number(m), 0, 0);
        return dt >= new Date();
    }) || [];

    return (
        <div className="dashboard-page">
            {/* Header + filtros */}
            <div className="dash-header">
                <div>
                    <h1><FontAwesomeIcon icon={faChartLine} /> Dashboard Supervisor</h1>
                </div>
                <div className="dash-filtro">
                    <select className="filter-select" value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
                        <option value="">Todos los asesores</option>
                        {asesores?.map(a => <option key={a._id} value={a._id}>{a.nombre_user}</option>)}
                    </select>
                    <span>Período:</span>
                    <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                    <span>—</span>
                    <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
            </div>

            {/* Sección 1 — Métricas generales */}
            <div className="dash-seccion">
                <h2>Métricas del equipo</h2>
                <div className="kpi-grid">
                    <TarjetaKPI icon={faBuilding} label="Empresas Asignadas" value={metricas?.empresasAsignadas || 0} color="#3949ab" />
                    <TarjetaKPI icon={faUsers} label="Total Gestiones" value={metricas?.totalGestiones || 0} color="#00838f" />
                    <TarjetaKPI icon={faUsers} label="Interesados" value={metricas?.interesados || 0} color="#f57f17" />
                    <TarjetaKPI icon={faTrophy} label="Ganadas" value={metricas?.ganadas || 0} color="#2e7d32" />
                    <TarjetaKPI icon={faDollarSign} label="CF Total Ganadas" value={fmt(metricas?.cfTotal)} color="#c62828" />
                    <TarjetaKPI icon={faPercent} label="Tasa de Efectividad" value={pct(metricas?.tasaEfectividad)} color="#6a1b9a" />
                </div>
            </div>

            {/* Sección 2 — Rendimiento por asesor */}
            <div className="dash-seccion">
                <h2>Rendimiento por asesor</h2>
                {rendimientoPorAsesor?.length === 0 ? (
                    <p style={{ color: '#bbb', fontSize: 13 }}>Sin datos en el período</p>
                ) : (
                    <div className="rendimiento-grid">
                        {rendimientoPorAsesor?.map(a => {
                            const maxAsig = Math.max(...(rendimientoPorAsesor?.map(x => x.asignadas) || [1]), 1);
                            const maxGest = Math.max(...(rendimientoPorAsesor?.map(x => x.gestiones) || [1]), 1);
                            const maxGan = Math.max(...(rendimientoPorAsesor?.map(x => x.ganadas) || [1]), 1);
                            return (
                                <div key={a.id} className="rendimiento-card">
                                    <div className="rendimiento-nombre">{a.nombre}</div>
                                    <div className="rendimiento-metricas">
                                        <div className="rend-row">
                                            <span className="rend-label">En Cartera</span>
                                            <div className="rend-barra-bg">
                                                <div className="rend-barra-fill" style={{ width: `${(a.enCartera / maxAsig) * 100}%`, background: '#3949ab' }} />
                                            </div>
                                            <span className="rend-val">{a.enCartera}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Gestiones</span>
                                            <div className="rend-barra-bg">
                                                <div className="rend-barra-fill" style={{ width: `${(a.gestiones / maxGest) * 100}%`, background: '#00838f' }} />
                                            </div>
                                            <span className="rend-val">{a.gestiones}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Interesados</span>
                                            <div className="rend-barra-bg">
                                                <div className="rend-barra-fill" style={{ width: `${a.enCartera > 0 ? (a.interesados / a.enCartera) * 100 : 0}%`, background: '#f57f17' }} />
                                            </div>
                                            <span className="rend-val">{a.interesados}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Ganadas</span>
                                            <div className="rend-barra-bg">
                                                <div className="rend-barra-fill" style={{ width: `${(a.ganadas / Math.max(maxGan, 1)) * 100}%`, background: '#2e7d32' }} />
                                            </div>
                                            <span className="rend-val">{a.ganadas}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">CF Total</span>
                                            <div className="rend-barra-bg">
                                                <div className="rend-barra-fill" style={{ width: `${a.cf > 0 ? Math.min((a.cf / Math.max(...rendimientoPorAsesor.map(x => x.cf), 1)) * 100, 100) : 0}%`, background: '#c62828' }} />
                                            </div>
                                            <span className="rend-val">{fmt(a.cf)}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Efectividad</span>
                                            <div className="rend-barra-bg">
                                                <div className="rend-barra-fill" style={{ width: `${a.efectividad}%`, background: a.efectividad >= 50 ? '#2e7d32' : a.efectividad >= 25 ? '#f57f17' : '#c62828' }} />
                                            </div>
                                            <span className="rend-val" style={{ color: a.efectividad >= 50 ? '#2e7d32' : a.efectividad >= 25 ? '#f57f17' : '#c62828', fontWeight: 700 }}>{pct(a.efectividad)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
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
                                    <Pie data={donaData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {donaData.map((_, i) => <Cell key={i} fill={COLORS_DONA[i % COLORS_DONA.length]} />)}
                                    </Pie>
                                    <Tooltip /><Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="sin-datos">Sin ventas en el período</p>}
                    </div>

                    {/* Gestiones por tipo */}
                    <div className="kpi-chart-card">
                        <h3>Gestiones por tipo</h3>
                        {tiposData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={tiposData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                                        {tiposData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="sin-datos">Sin gestiones en el período</p>}
                    </div>

                    {/* Funnel */}
                    <div className="kpi-chart-card">
                        <h3>Avance del funnel</h3>
                        <div className="funnel-chart">
                            {funnelData.map((f, i) => (
                                <div key={i} className="funnel-barra-row">
                                    <span className="funnel-etapa">{f.etapa}</span>
                                    <div className="funnel-barra-bg">
                                        <div className="funnel-barra-fill" style={{ width: `${(f.cantidad / maxFunnel) * 100}%`, opacity: 1 - i * 0.15 }} />
                                    </div>
                                    <span className="funnel-num">{f.cantidad}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tasa de efectividad */}
                    <div className="kpi-chart-card">
                        <h3>Tasa de efectividad del equipo</h3>
                        <div className="efectividad-container">
                            <div className="efectividad-circle">
                                <svg viewBox="0 0 120 120" width="140" height="140">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="12" />
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#3949ab" strokeWidth="12"
                                        strokeDasharray={`${(metricas?.tasaEfectividad || 0) * 3.14} 314`}
                                        strokeLinecap="round" transform="rotate(-90 60 60)" />
                                    <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1a2e">{pct(metricas?.tasaEfectividad)}</text>
                                    <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#999">efectividad</text>
                                </svg>
                            </div>
                            <div className="efectividad-detalle">
                                <div className="efect-row"><span className="efect-label">Asignadas</span><span className="efect-val">{metricas?.empresasAsignadas || 0}</span></div>
                                <div className="efect-row"><span className="efect-label">Interesados</span><span className="efect-val">{metricas?.interesados || 0}</span></div>
                                <div className="efect-row"><span className="efect-label">Ganadas</span><span className="efect-val">{metricas?.ganadas || 0}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección 4 — Actividades pendientes */}
            <div className="dash-seccion">
                <div className="dash-seccion-header">
                    <h2>Actividades pendientes del equipo</h2>
                    <button className="btn-secondary" onClick={() => navigate('/calendario-supervisor')}>
                        <FontAwesomeIcon icon={faCalendarAlt} /> Ver calendario
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {vencidas.length > 0 && (
                        <div style={{ flex: 1, minWidth: 280 }}>
                            <h4 style={{ fontSize: 13, color: '#c62828', marginBottom: 10 }}>
                                <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: 6 }} />
                                Vencidas ({vencidas.length})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {vencidas.map(a => {
                                    const t = TIPOS_ACT[a.tipo] || TIPOS_ACT.llamada;
                                    return (
                                        <div key={a._id} className="act-pendiente-row vencida">
                                            <span style={{ color: t.color }}><FontAwesomeIcon icon={t.icon} /></span>
                                            <div className="act-pend-info">
                                                <span className="act-pend-titulo">{a.titulo}</span>
                                                <span className="act-pend-meta">{a.asesor?.nombre_user} · {fmtFecha(a.fecha, a.hora)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {proximas.length > 0 && (
                        <div style={{ flex: 1, minWidth: 280 }}>
                            <h4 style={{ fontSize: 13, color: '#1a1a2e', marginBottom: 10 }}>Próximas ({proximas.length})</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {proximas.map(a => {
                                    const t = TIPOS_ACT[a.tipo] || TIPOS_ACT.llamada;
                                    return (
                                        <div key={a._id} className="act-pendiente-row">
                                            <span style={{ color: t.color }}><FontAwesomeIcon icon={t.icon} /></span>
                                            <div className="act-pend-info">
                                                <span className="act-pend-titulo">{a.titulo}</span>
                                                <span className="act-pend-meta">{a.asesor?.nombre_user} · {fmtFecha(a.fecha, a.hora)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {vencidas.length === 0 && proximas.length === 0 && (
                        <p style={{ color: '#bbb', fontSize: 13 }}>Sin actividades pendientes</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardSupervisor;