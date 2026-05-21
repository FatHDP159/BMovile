import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartBar, faDownload, faBuilding, faMobileAlt,
    faEnvelope, faPhone, faUsers, faExclamationTriangle,
    faClipboardList, faFunnelDollar, faDatabase,
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Reportes.css';

const SEGMENTOS = [
    { key: 'Pyme',         color: '#3949ab' },
    { key: 'Micro',        color: '#00838f' },
    { key: 'Mayores',      color: '#1565c0' },
    { key: 'Empresas',     color: '#6a1b9a' },
    { key: 'Gobierno',     color: '#e65100' },
    { key: 'Sin segmento', color: '#9e9e9e' },
];

const OPERADORES = [
    { key: 'claro',    label: 'Claro',    color: '#e53935' },
    { key: 'movistar', label: 'Movistar', color: '#0288d1' },
    { key: 'entel',    label: 'Entel',    color: '#6a1b9a' },
    { key: 'otros',    label: 'Otros',    color: '#757575' },
];

const csvDescargar = (rows, filename) => {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(','),
        ...rows.map(r =>
            headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
        ),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const BtnDescargar = ({ dlKey, descargando, value, onClick }) => (
    <button
        className="rpt-btn-dl"
        onClick={onClick}
        disabled={descargando === dlKey || value === 0}
        title="Descargar CSV"
    >
        <FontAwesomeIcon icon={faDownload} />
        <span>{descargando === dlKey ? 'Descargando…' : 'Descargar'}</span>
    </button>
);

const Tarjeta = ({ label, value, color, icon, dlKey, descargando, onDescargar }) => (
    <div className="rpt-card" style={{ borderTop: `3px solid ${color}` }}>
        <div className="rpt-card-body">
            <div className="rpt-card-icon" style={{ background: color + '18', color }}>
                <FontAwesomeIcon icon={icon} />
            </div>
            <div className="rpt-card-data">
                <span className="rpt-card-value">{value ?? '—'}</span>
                <span className="rpt-card-label">{label}</span>
            </div>
        </div>
        <BtnDescargar dlKey={dlKey} descargando={descargando} value={value} onClick={onDescargar} />
    </div>
);

const TarjetaOperador = ({ op, value, seleccionado, onSelect, dlKey, descargando, onDescargar }) => (
    <div
        className={`rpt-card rpt-card--op ${seleccionado ? 'rpt-card--sel' : ''}`}
        style={{
            borderTop: `3px solid ${op.color}`,
            outline: seleccionado ? `2px solid ${op.color}` : 'none',
            background: seleccionado ? op.color + '14' : undefined,
        }}
        onClick={onSelect}
    >
        <div className="rpt-card-body">
            <div className="rpt-card-icon" style={{ background: op.color + '18', color: op.color }}>
                <FontAwesomeIcon icon={faMobileAlt} />
            </div>
            <div className="rpt-card-data">
                <span className="rpt-card-value">{value ?? '—'}</span>
                <span className="rpt-card-label">{op.label}</span>
            </div>
        </div>
        <BtnDescargar
            dlKey={dlKey}
            descargando={descargando}
            value={value}
            onClick={e => { e.stopPropagation(); onDescargar(); }}
        />
    </div>
);

const TarjetaCalidad = ({ label, value, color, icon, desglose, dlKey, descargando, onDescargar }) => {
    const chips = SEGMENTOS
        .map(seg => ({ key: seg.key, color: seg.color, count: desglose?.[seg.key] ?? 0 }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count);

    return (
        <div className="rpt-card rpt-card--calidad" style={{ borderTop: `3px solid ${color}` }}>
            <div className="rpt-card-body">
                <div className="rpt-card-icon" style={{ background: color + '18', color }}>
                    <FontAwesomeIcon icon={icon} />
                </div>
                <div className="rpt-card-data">
                    <span className="rpt-card-value">{value ?? '—'}</span>
                    <span className="rpt-card-label">{label}</span>
                </div>
            </div>
            {chips.length > 0 && (
                <div className="rpt-desglose">
                    {chips.map(c => (
                        <span key={c.key} className="rpt-chip" style={{ borderLeft: `3px solid ${c.color}` }}>
                            <span className="rpt-chip-label">{c.key}:</span>
                            {' '}
                            <span className="rpt-chip-val">{c.count.toLocaleString('es-PE')}</span>
                        </span>
                    ))}
                </div>
            )}
            <BtnDescargar dlKey={dlKey} descargando={descargando} value={value} onClick={onDescargar} />
        </div>
    );
};

const Reportes = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [descargando, setDescargando] = useState(null);
    const [opSel, setOpSel] = useState([]);

    useEffect(() => {
        api.get('/reportes-bd/metricas')
            .then(r => setData(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const descargar = async (tipo, valor, label) => {
        const key = `${tipo}${valor ? `_${valor}` : ''}`;
        setDescargando(key);
        try {
            const params = { tipo };
            if (valor != null) params.valor = valor;
            const r = await api.get('/reportes-bd/descargar', { params });
            csvDescargar(r.data, `${label.replace(/[\s/]+/g, '_')}.csv`);
        } catch (err) {
            console.error(err);
        } finally {
            setDescargando(null);
        }
    };

    const toggleOp = (key) =>
        setOpSel(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const {
        porSegmento, sinLineas, sinLineasDesglose, porOperador,
        sinContactosAutorizados, sinContactosDesglose,
        sinTelefono,             sinTelefonoDesglose,
        sinCorreo,               sinCorreoDesglose,
        porEstado, asignadasSinTipificar, fichasSinOportunidades, fichasEnFunnel,
    } = data || {};

    return (
        <div className="reportes-page">
            <div className="rpt-header">
                <h1><FontAwesomeIcon icon={faChartBar} /> Reportes de Base</h1>
                <p className="rpt-subtitle">Métricas de segmentación, calidad y estado de la base de datos</p>
            </div>

            {loading ? (
                <div style={{ padding: 40, color: '#888' }}>Cargando métricas…</div>
            ) : (
                <>
                    {/* ── BLOQUE 1: Segmentación de cartera ────────────────── */}
                    <div className="rpt-seccion">
                        <h2>Segmentación de cartera</h2>

                        <p className="rpt-sub-label">Por segmento</p>
                        <div className="rpt-grid">
                            {SEGMENTOS.map(seg => (
                                <Tarjeta
                                    key={seg.key}
                                    label={seg.key}
                                    value={porSegmento?.[seg.key] ?? 0}
                                    color={seg.color}
                                    icon={faBuilding}
                                    dlKey={`segmento_${seg.key}`}
                                    descargando={descargando}
                                    onDescargar={() => descargar('segmento', seg.key, seg.key)}
                                />
                            ))}
                        </div>

                        <p className="rpt-sub-label">
                            Sin líneas activas
                            <span className="rpt-hint"> — total: {sinLineas ?? 0}</span>
                        </p>
                        <div className="rpt-grid">
                            {SEGMENTOS.map(seg => (
                                <Tarjeta
                                    key={seg.key}
                                    label={seg.key}
                                    value={sinLineasDesglose?.[seg.key] ?? 0}
                                    color="#c62828"
                                    icon={faMobileAlt}
                                    dlKey={`sinLineas_${seg.key}`}
                                    descargando={descargando}
                                    onDescargar={() => descargar('sinLineas', seg.key, `Sin_lineas_${seg.key}`)}
                                />
                            ))}
                        </div>

                        <p className="rpt-sub-label">
                            Por operador dominante
                            <span className="rpt-hint"> — clic en la tarjeta para seleccionar</span>
                        </p>
                        <div className="rpt-grid rpt-grid--op">
                            {OPERADORES.map(op => (
                                <TarjetaOperador
                                    key={op.key}
                                    op={op}
                                    value={porOperador?.[op.key] ?? 0}
                                    seleccionado={opSel.includes(op.key)}
                                    onSelect={() => toggleOp(op.key)}
                                    dlKey={`operador_${op.key}`}
                                    descargando={descargando}
                                    onDescargar={() => descargar('operador', op.key, op.label)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── BLOQUE 2: Calidad de datos ───────────────────────── */}
                    <div className="rpt-seccion">
                        <h2>Calidad de datos</h2>
                        <div className="rpt-grid rpt-grid--calidad">
                            <TarjetaCalidad
                                label="Sin contacto autorizado"
                                value={sinContactosAutorizados ?? 0}
                                color="#c62828"
                                icon={faUsers}
                                desglose={sinContactosDesglose}
                                dlKey="sinContactos"
                                descargando={descargando}
                                onDescargar={() => descargar('sinContactos', null, 'Sin_contacto_autorizado')}
                            />
                            <TarjetaCalidad
                                label="Sin teléfono"
                                value={sinTelefono ?? 0}
                                color="#e65100"
                                icon={faPhone}
                                desglose={sinTelefonoDesglose}
                                dlKey="sinTelefono"
                                descargando={descargando}
                                onDescargar={() => descargar('sinTelefono', null, 'Sin_telefono')}
                            />
                            <TarjetaCalidad
                                label="Sin correo"
                                value={sinCorreo ?? 0}
                                color="#f57f17"
                                icon={faEnvelope}
                                desglose={sinCorreoDesglose}
                                dlKey="sinCorreo"
                                descargando={descargando}
                                onDescargar={() => descargar('sinCorreo', null, 'Sin_correo')}
                            />
                        </div>
                    </div>

                    {/* ── BLOQUE 3: Estado de la base ──────────────────────── */}
                    <div className="rpt-seccion">
                        <h2>Estado de la base</h2>
                        <div className="rpt-grid">
                            <Tarjeta
                                label="Disponibles"
                                value={porEstado?.disponible ?? 0}
                                color="#9e9e9e"
                                icon={faDatabase}
                                dlKey="estado_disponible"
                                descargando={descargando}
                                onDescargar={() => descargar('estado', 'disponible', 'Disponibles')}
                            />
                            <Tarjeta
                                label="Asignadas"
                                value={porEstado?.asignada ?? 0}
                                color="#1565c0"
                                icon={faUsers}
                                dlKey="estado_asignada"
                                descargando={descargando}
                                onDescargar={() => descargar('estado', 'asignada', 'Asignadas')}
                            />
                            <Tarjeta
                                label="Trabajadas"
                                value={porEstado?.trabajada ?? 0}
                                color="#2e7d32"
                                icon={faClipboardList}
                                dlKey="estado_trabajada"
                                descargando={descargando}
                                onDescargar={() => descargar('estado', 'trabajada', 'Trabajadas')}
                            />
                            <Tarjeta
                                label="Asignadas sin tipificar +7d"
                                value={asignadasSinTipificar ?? 0}
                                color="#f57f17"
                                icon={faExclamationTriangle}
                                dlKey="asignadasSinTipificar"
                                descargando={descargando}
                                onDescargar={() => descargar('asignadasSinTipificar', null, 'Asignadas_sin_tipificar')}
                            />
                            <Tarjeta
                                label="Fichas sin oportunidades"
                                value={fichasSinOportunidades ?? 0}
                                color="#757575"
                                icon={faClipboardList}
                                dlKey="fichasSinOportunidades"
                                descargando={descargando}
                                onDescargar={() => descargar('fichasSinOportunidades', null, 'Fichas_sin_oportunidades')}
                            />
                            <Tarjeta
                                label="Fichas en funnel"
                                value={fichasEnFunnel ?? 0}
                                color="#6a1b9a"
                                icon={faFunnelDollar}
                                dlKey="fichasEnFunnel"
                                descargando={descargando}
                                onDescargar={() => descargar('fichasEnFunnel', null, 'Fichas_en_funnel')}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reportes;
