import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUserShield, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';
import './Usuarios.css';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showModalEditar, setShowModalEditar] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [form, setForm] = useState({ nombre_user: '', dni_user: '', correo_user: '', contraseña_user: '', rol_user: 'asesor' });
    const [formEditar, setFormEditar] = useState({ nombre_user: '', dni_user: '', correo_user: '', rol_user: '', contraseña_user: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [showModalEliminar, setShowModalEliminar] = useState(false);
    const [usuarioEliminar, setUsuarioEliminar] = useState(null);

    useEffect(() => { cargarUsuarios(); }, []);

    const cargarUsuarios = async () => {
        try {
            const res = await api.get('/users');
            setUsuarios(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const usuariosFiltrados = usuarios.filter(u =>
        u.nombre_user.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.dni_user.includes(busqueda)
    );

    const handleCrear = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            await api.post('/users', form);
            setSuccess('Usuario creado correctamente');
            setTimeout(() => {
                setShowModal(false);
                setForm({ nombre_user: '', dni_user: '', correo_user: '', contraseña_user: '', rol_user: 'asesor' });
                setSuccess('');
                cargarUsuarios();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Error desconocido');
        }
    };

    const handleEditar = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            await api.put(`/users/${usuarioEditando._id}`, formEditar);
            setSuccess('Usuario actualizado correctamente');
            setTimeout(() => {
                setShowModalEditar(false);
                setUsuarioEditando(null);
                setSuccess('');
                cargarUsuarios();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar usuario');
        }
    };

    const abrirEditar = (u) => {
        setUsuarioEditando(u);
        setFormEditar({ nombre_user: u.nombre_user, dni_user: u.dni_user, correo_user: u.correo_user, rol_user: u.rol_user, contraseña_user: '' });
        setError(''); setSuccess('');
        setShowModalEditar(true);
    };

    const handleEstado = async (id, estado_user) => {
        try {
            await api.patch(`/users/${id}/estado`, { estado_user });
            cargarUsuarios();
        } catch (err) { console.error(err); }
    };

    const handleEliminar = async () => {
        try {
            await api.delete(`/users/${usuarioEliminar._id}`);
            setShowModalEliminar(false);
            setUsuarioEliminar(null);
            cargarUsuarios();
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            <div className="page-header">
                <h1><FontAwesomeIcon icon={faUserShield} /> Usuarios</h1>
                <button className="btn-primary" onClick={() => { setError(''); setSuccess(''); setShowModal(true); }}>
                    <FontAwesomeIcon icon={faPlus} /> Nuevo Usuario
                </button>
            </div>
            <div className="search-bar">
                <input className="search-input" placeholder="Buscar por nombre o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>

            <div className="table-container">
                {loading ? <p style={{ padding: '20px' }}>Cargando...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>DNI</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.map((u) => (
                                <tr key={u._id}>
                                    <td>{u.nombre_user}</td>
                                    <td>{u.dni_user}</td>
                                    <td>{u.correo_user}</td>
                                    <td><span className={`badge badge-${u.rol_user}`}>{u.rol_user}</span></td>
                                    <td><span className={`badge badge-${u.estado_user}`}>{u.estado_user}</span></td>
                                    <td style={{ display: 'flex', gap: '6px' }}>
                                        <button className="btn-estado" style={{ backgroundColor: '#e8eaf6', color: '#283593' }} onClick={() => abrirEditar(u)}>
                                            <FontAwesomeIcon icon={faPen} />
                                        </button>
                                        {u.estado_user !== 'activo' && (
                                            <button className="btn-estado btn-activar" onClick={() => handleEstado(u._id, 'activo')}>Activar</button>
                                        )}
                                        {u.estado_user !== 'suspendido' && (
                                            <button className="btn-estado btn-suspender" onClick={() => handleEstado(u._id, 'suspendido')}>Suspender</button>
                                        )}
                                        <button className="btn-estado" style={{ backgroundColor: '#fce8e6', color: '#c62828' }}
                                            onClick={() => { setUsuarioEliminar(u); setShowModalEliminar(true); }}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Crear */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Nuevo Usuario</h2>
                        {success && <p style={{ color: 'green', marginBottom: '16px' }}>{success}</p>}
                        {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}
                        <form onSubmit={handleCrear}>
                            <div className="form-field"><label>Nombre completo</label>
                                <input className="form-input" value={form.nombre_user} onChange={(e) => setForm({ ...form, nombre_user: e.target.value })} required />
                            </div>
                            <div className="form-field"><label>DNI</label>
                                <input className="form-input" value={form.dni_user} onChange={(e) => setForm({ ...form, dni_user: e.target.value })} required />
                            </div>
                            <div className="form-field"><label>Correo</label>
                                <input type="email" className="form-input" value={form.correo_user} onChange={(e) => setForm({ ...form, correo_user: e.target.value })} required />
                            </div>
                            <div className="form-field"><label>Contraseña</label>
                                <input type="password" className="form-input" value={form.contraseña_user} onChange={(e) => setForm({ ...form, contraseña_user: e.target.value })} required />
                            </div>
                            <div className="form-field"><label>Rol</label>
                                <select className="form-input" value={form.rol_user} onChange={(e) => setForm({ ...form, rol_user: e.target.value })}>
                                    <option value="asesor">Asesor</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="sistemas">Sistemas</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Crear Usuario</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Eliminar */}
            {showModalEliminar && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Eliminar Usuario</h2>
                        <p style={{ margin: '16px 0', color: '#555' }}>
                            ¿Estás seguro que deseas eliminar a <strong>{usuarioEliminar?.nombre_user}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => { setShowModalEliminar(false); setUsuarioEliminar(null); }}>Cancelar</button>
                            <button className="btn-estado btn-desactivar" onClick={handleEliminar}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar */}
            {showModalEditar && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Editar Usuario</h2>
                        {success && <p style={{ color: 'green', marginBottom: '16px' }}>{success}</p>}
                        {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}
                        <form onSubmit={handleEditar}>
                            <div className="form-field"><label>Nombre completo</label>
                                <input className="form-input" value={formEditar.nombre_user} onChange={(e) => setFormEditar({ ...formEditar, nombre_user: e.target.value })} required />
                            </div>
                            <div className="form-field"><label>DNI</label>
                                <input className="form-input" value={formEditar.dni_user} onChange={(e) => setFormEditar({ ...formEditar, dni_user: e.target.value })} required />
                            </div>
                            <div className="form-field"><label>Correo</label>
                                <input type="email" className="form-input" value={formEditar.correo_user} onChange={(e) => setFormEditar({ ...formEditar, correo_user: e.target.value })} required />
                            </div>
                            <div className="form-field">
                                <label>Nueva Contraseña <span style={{ color: '#999', fontSize: '12px' }}>(dejar vacío para no cambiar)</span></label>
                                <input type="password" className="form-input" value={formEditar.contraseña_user} onChange={(e) => setFormEditar({ ...formEditar, contraseña_user: e.target.value })} placeholder="••••••••" />
                            </div>
                            <div className="form-field"><label>Rol</label>
                                <select className="form-input" value={formEditar.rol_user} onChange={(e) => setFormEditar({ ...formEditar, rol_user: e.target.value })}>
                                    <option value="asesor">Asesor</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="sistemas">Sistemas</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModalEditar(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;