import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine, faClipboardList, faPercent, faHandshake,
    faBullseye, faCheck, faFilter
} from '@fortawesome/free-solid-svg-icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import api from '../services/api';
import './Dashboard.css';
import './DashboardSistemas.css';
import './DashboardSupervisor.css';

const pct = (n) => `${Number(n || 0).toFixed(1)}%`;
const fmt = (n) => `S/. ${Number(n || 0).toFixed(2)}`;

const colorAlcance = (alcance) => {
    if (alcance >= 100) return { bg: '#e3f2fd', text: '#1565c0', bar: '#1565c0' };
    if (alcance >= 85) return { bg: '#e8f5e9', text: '#2e7d32', bar: '#2e7d32' };
    if (alcance >= 50) return { bg: '#fff8e1', text: '#f57f17', bar: '#f57f17' };
    return { bg: '#fce8e6', text: '#c62828', bar: '#c62828' };
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

const AsesorSelector = ({ asesores, seleccionados, onChange }) => {
    const [busqueda, setBusqueda] = useState('');
    const [abierto, setAbierto] = useState(false);
    const ref = useRef();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtrados = asesores.filter(a => a.nombre_user.toLowerCase().includes(busqueda.toLowerCase()));
    const todos = seleccionados.length === 0;
    const toggleAsesor = (id) => onChange(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    const label = todos ? 'Todos los ejecutivos' :
        seleccionados.length === 1 ? asesores.find(a => a._id === seleccionados[0])?.nombre_user :
            `${seleccionados.length} ejecutivos seleccionados`;

    return (
        <div className="asesor-select-wrapper" ref={ref}>
            <button className="asesor-select-btn" onClick={() => setAbierto(a => !a)}>
                <span>{label}</span>
                <span style={{ fontSize: 10, color: '#999' }}>▼</span>
            </button>
            {abierto && (
                <div className="asesor-select-dropdown">
                    <input className="asesor-search-input" placeholder="Buscar ejecutivo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
                    <div className="asesor-opciones">
                        <div className={`asesor-opcion ${todos ? 'selected' : ''}`} onClick={() => { onChange([]); setBusqueda(''); }}>
                            <span className="asesor-check">{todos ? '✓' : ''}</span>Todos los ejecutivos
                        </div>
                        {filtrados.map(a => (
                            <div key={a._id} className={`asesor-opcion ${seleccionados.includes(a._id) ? 'selected' : ''}`} onClick={() => toggleAsesor(a._id)}>
                                <span className="asesor-check">{seleccionados.includes(a._id) ? '✓' : ''}</span>{a.nombre_user}
                            </div>
                        ))}
                        {filtrados.length === 0 && <div style={{ padding: '8px 12px', color: '#bbb', fontSize: 12 }}>Sin resultados</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardSistemas = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    const [fechaDesde, setFechaDesde] = useState(primerDia);
    const [fechaHasta, setFechaHasta] = useState(ultimoDia);
    const [granularidad, setGranularidad] = useState('mensual');
    const [asesoresSel, setAsesoresSel] = useState([]);
    const [soloActivos, setSoloActivos] = useState(false);
    const [data, setData] = useState(null);
    const [dataSup, setDataSup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [objetivoGlobal, setObjetivoGlobal] = useState(0);
    const [objetivoEdit, setObjetivoEdit] = useState(0);
    const [guardando, setGuardando] = useState(false);
    const searchTimeout = useRef();

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [dashRes, objRes, supRes] = await Promise.all([
                api.get('/sistemas/dashboard', {
                    params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, granularidad, asesores: asesoresSel.length > 0 ? asesoresSel.join(',') : undefined }
                }),
                api.get('/sistemas/objetivos'),
                api.get('/dashboard/supervisor', {
                    params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta }
                }),
            ]);
            setData(dashRes.data);
            setObjetivoGlobal(objRes.data.objetivo_diario || 0);
            setObjetivoEdit(objRes.data.objetivo_diario || 0);
            setDataSup(supRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [fechaDesde, fechaHasta, granularidad, asesoresSel]);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => cargar(), 400);
    }, [fechaDesde, fechaHasta, granularidad, asesoresSel]);

    const handleGuardarObjetivo = async () => {
        setGuardando(true);
        try { await api.post('/sistemas/objetivos', { objetivo_diario: objetivoEdit }); await cargar(); }
        catch (err) { console.error(err); }
        finally { setGuardando(false); }
    };

    const tablaFiltrada = data?.tablaAsesores?.filter(a =>
        !soloActivos || (a.tipificaciones > 0 || a.oportunidades > 0 || a.citas > 0)
    ) || [];

    const maxFunnel = Math.max(...(data?.funnelData?.map(f => f.cantidad) || [1]), 1);
    const rendimientoPorAsesor = dataSup?.rendimientoPorAsesor || [];

    if (loading) return <div style={{ padding: 40, color: '#888' }}>Cargando dashboard...</div>;

    return (
        <div className="dashboard-page">
            <div className="dash-header">
                <div><h1><FontAwesomeIcon icon={faChartLine} /> Dashboard Sistemas</h1></div>
            </div>

            {/* Filtros */}
            <div className="dash-seccion sis-filtros-panel">
                <div className="sis-filtros-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>
                            <FontAwesomeIcon icon={faFilter} style={{ marginRight: 6 }} />Período:
                        </span>
                        <input type="date" className="filter-select" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                        <span style={{ color: '#999' }}>—</span>
                        <input type="date" className="filter-select" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                    </div>
                    <div className="granularidad-btns">
                        {['diario', 'semanal', 'mensual'].map(g => (
                            <button key={g} className={`gran-btn ${granularidad === g ? 'active' : ''}`} onClick={() => setGranularidad(g)}>
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="sis-objetivo-global">
                        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>
                            <FontAwesomeIcon icon={faBullseye} style={{ marginRight: 6, color: '#3949ab' }} />Objetivo Diario:
                        </span>
                        <input type="number" className="objetivo-input" value={objetivoEdit} min="0" onChange={e => setObjetivoEdit(e.target.value)} style={{ width: 80 }} />
                        <button className="objetivo-apply-btn" onClick={handleGuardarObjetivo} disabled={guardando}>
                            {guardando ? '...' : <><FontAwesomeIcon icon={faCheck} /> Aplicar</>}
                        </button>
                        {objetivoGlobal > 0 && (
                            <span style={{ fontSize: 11, color: '#888' }}>Período ({data?.diasRango}d): <strong>{objetivoGlobal * (data?.diasRango || 0)}</strong></span>
                        )}
                    </div>
                    <label className="sis-toggle-activos">
                        <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} />Solo activos
                    </label>
                </div>
                <div className="sis-asesores-sel">
                    <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>Ejecutivos:</span>
                    <div className="asesor-dropdown-wrapper">
                        <AsesorSelector asesores={data?.asesores || []} seleccionados={asesoresSel} onChange={setAsesoresSel} />
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="dash-seccion">
                <h2>KPIs Maestros</h2>
                <div className="kpi-grid">
                    <TarjetaKPI icon={faClipboardList} label="Gestión Total" value={data?.kpis?.totalTipificaciones || 0} color="#3949ab" />
                    <TarjetaKPI icon={faPercent} label="Conversión Base" value={pct(data?.kpis?.conversionBase)} color="#f57f17" sub="Oportunidades / Tipificaciones" />
                    <TarjetaKPI icon={faHandshake} label="Citas Totales" value={data?.kpis?.totalCitas || 0} color="#2e7d32" />
                    <TarjetaKPI icon={faBullseye} label="Efectividad Comercial" value={pct(data?.kpis?.efectividadComercial)} color="#c62828" sub="Citas / Oportunidades" />
                </div>
            </div>

            {/* Rendimiento por asesor */}
            <div className="dash-seccion">
                <h2>Rendimiento por asesor</h2>
                {rendimientoPorAsesor.length === 0 ? (
                    <p style={{ color: '#bbb', fontSize: 13 }}>Sin datos en el período</p>
                ) : (
                    <div className="rendimiento-grid">
                        {rendimientoPorAsesor.map(a => {
                            const maxAsig = Math.max(...rendimientoPorAsesor.map(x => x.asignadas), 1);
                            const maxGest = Math.max(...rendimientoPorAsesor.map(x => x.gestiones), 1);
                            const maxGan = Math.max(...rendimientoPorAsesor.map(x => x.ganadas), 1);
                            return (
                                <div key={a.id} className="rendimiento-card">
                                    <div className="rendimiento-nombre">{a.nombre}</div>
                                    <div className="rendimiento-metricas">
                                        <div className="rend-row">
                                            <span className="rend-label">Asignadas</span>
                                            <div className="rend-barra-bg"><div className="rend-barra-fill" style={{ width: `${(a.asignadas / maxAsig) * 100}%`, background: '#3949ab' }} /></div>
                                            <span className="rend-val">{a.asignadas}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Gestiones</span>
                                            <div className="rend-barra-bg"><div className="rend-barra-fill" style={{ width: `${(a.gestiones / maxGest) * 100}%`, background: '#00838f' }} /></div>
                                            <span className="rend-val">{a.gestiones}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Interesados</span>
                                            <div className="rend-barra-bg"><div className="rend-barra-fill" style={{ width: `${a.asignadas > 0 ? (a.interesados / a.asignadas) * 100 : 0}%`, background: '#f57f17' }} /></div>
                                            <span className="rend-val">{a.interesados}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Ganadas</span>
                                            <div className="rend-barra-bg"><div className="rend-barra-fill" style={{ width: `${(a.ganadas / Math.max(maxGan, 1)) * 100}%`, background: '#2e7d32' }} /></div>
                                            <span className="rend-val">{a.ganadas}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">CF Total</span>
                                            <div className="rend-barra-bg"><div className="rend-barra-fill" style={{ width: `${a.cf > 0 ? Math.min((a.cf / Math.max(...rendimientoPorAsesor.map(x => x.cf), 1)) * 100, 100) : 0}%`, background: '#c62828' }} /></div>
                                            <span className="rend-val">{fmt(a.cf)}</span>
                                        </div>
                                        <div className="rend-row">
                                            <span className="rend-label">Efectividad</span>
                                            <div className="rend-barra-bg"><div className="rend-barra-fill" style={{ width: `${a.efectividad}%`, background: a.efectividad >= 50 ? '#2e7d32' : a.efectividad >= 25 ? '#f57f17' : '#c62828' }} /></div>
                                            <span className="rend-val" style={{ color: a.efectividad >= 50 ? '#2e7d32' : a.efectividad >= 25 ? '#f57f17' : '#c62828', fontWeight: 700 }}>{pct(a.efectividad)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tabla maestra */}
            <div className="dash-seccion">
                <h2>Tabla Maestra de Ejecutivos</h2>
                <div className="tabla-maestro-wrapper">
                    <table className="tabla-maestro">
                        <thead>
                            <tr>
                                <th>Ejecutivo</th>
                                <th>Bases (Tip.)</th>
                                <th>Oportunidades</th>
                                <th>Citas</th>
                                <th>Obj. Período ({data?.diasRango}d)</th>
                                <th style={{ minWidth: 200 }}>Alcance (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tablaFiltrada.map(a => {
                                const objPeriodo = (objetivoGlobal || 0) * (data?.diasRango || 1);
                                const alcanceCalc = objPeriodo > 0 ? Math.round((a.oportunidades / objPeriodo) * 100) : 0;
                                const col = colorAlcance(alcanceCalc);
                                return (
                                    <tr key={a.id}>
                                        <td><div className="ejecutivo-cell"><div className="ejecutivo-avatar">{a.nombre.charAt(0).toUpperCase()}</div><span>{a.nombre}</span></div></td>
                                        <td>{a.tipificaciones}</td>
                                        <td>{a.oportunidades}</td>
                                        <td>{a.citas}</td>
                                        <td>{objPeriodo}</td>
                                        <td>
                                            <div className="alcance-cell">
                                                <div className="alcance-barra-bg"><div className="alcance-barra-fill" style={{ width: `${Math.min(alcanceCalc, 100)}%`, background: col.bar }} /></div>
                                                <span className="alcance-pct" style={{ background: col.bg, color: col.text }}>{pct(alcanceCalc)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gráficos */}
            <div className="dash-seccion">
                <h2>Análisis Visual</h2>
                <div className="kpi-charts-grid">
                    <div className="kpi-chart-card">
                        <h3>Embudo de Conversión</h3>
                        <div className="funnel-chart">
                            {data?.funnelData?.map((f, i) => (
                                <div key={i} className="funnel-barra-row">
                                    <span className="funnel-etapa">{f.etapa}</span>
                                    <div className="funnel-barra-bg"><div className="funnel-barra-fill" style={{ width: `${(f.cantidad / maxFunnel) * 100}%`, opacity: 1 - i * 0.2 }} /></div>
                                    <span className="funnel-num">{f.cantidad}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="kpi-chart-card" style={{ gridColumn: 'span 2' }}>
                        <h3>Evolución {granularidad.charAt(0).toUpperCase() + granularidad.slice(1)}</h3>
                        {data?.serieData?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={data.serieData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="tipificaciones" name="Tipificaciones" fill="#3949ab" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="oportunidades" name="Oportunidades" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="sin-datos">Sin datos en el período</p>}
                    </div>
                    <div className="kpi-chart-card" style={{ gridColumn: 'span 3' }}>
                        <h3>Alcance de Objetivo por Ejecutivo</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={tablaFiltrada.map(a => ({ name: a.nombre.split(' ')[0], alcance: a.alcance }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 10 }} unit="%" />
                                <Tooltip formatter={(v) => `${v}%`} />
                                <Bar dataKey="alcance" name="Alcance" radius={[4, 4, 0, 0]}>
                                    {tablaFiltrada.map((a, i) => <Cell key={i} fill={colorAlcance(a.alcance).bar} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSistemas;