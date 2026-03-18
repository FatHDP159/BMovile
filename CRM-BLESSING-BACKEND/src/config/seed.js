const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../domain/users/user.model');
require('dotenv').config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado');

        // Limpiar usuarios existentes
        await User.deleteMany();

        // Encriptar contraseña
        const hash = await bcrypt.hash('admin123', 10);

        // Crear usuario TI
        await User.create({
            nombre_user: 'Admin TI',
            dni_user: '00000001',
            correo_user: 'ti@crm.com',
            contraseña_user: hash,
            rol_user: 'sistemas',
            estado_user: 'activo',
        });

        console.log('✅ Usuario TI creado correctamente');
        console.log('📧 Correo: ti@crm.com');
        console.log('🔑 Contraseña: admin123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seed();