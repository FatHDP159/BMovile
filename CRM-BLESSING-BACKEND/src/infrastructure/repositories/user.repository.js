const User = require('../../domain/users/user.model');

const userRepository = {
    // Buscar usuario por correo
    findByCorreo: async (correo_user) => {
        return await User.findOne({ correo_user });
    },

    // Buscar usuario por ID
    findById: async (id) => {
        return await User.findById(id).select('-contraseña_user');
    },

    // Crear usuario
    create: async (data) => {
        const user = new User(data);
        return await user.save();
    },

    // Listar todos los usuarios
    findAll: async () => {
        return await User.find().select('-contraseña_user');
    },

    // Actualizar usuario
    update: async (id, data) => {
        return await User.findByIdAndUpdate(id, data, { returnDocument: 'after' }).select('-contraseña_user');
    },

    // Cambiar estado usuario
    changeEstado: async (id, estado_user) => {
        return await User.findByIdAndUpdate(id, { estado_user }, { returnDocument: 'after' }).select('-contraseña_user');
    },

    // Eliminar usuario
    delete: async (id) => {
        return await User.findByIdAndDelete(id);
    },
};

module.exports = userRepository;