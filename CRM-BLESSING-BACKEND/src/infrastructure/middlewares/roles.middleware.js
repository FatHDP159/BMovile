const verifyRole = (...rolesPermitidos) => {
    return (req, res, next) => {
        const { rol_user } = req.user;

        if (!rolesPermitidos.includes(rol_user)) {
            return res.status(403).json({
                message: `❌ No tienes permisos para acceder a este módulo`,
            });
        }

        next();
    };
};

module.exports = { verifyRole };