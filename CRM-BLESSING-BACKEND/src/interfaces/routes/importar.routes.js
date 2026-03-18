const express = require('express');
const router = express.Router();
const upload = require('../../infrastructure/middlewares/upload.middleware');
const importarRepository = require('../../infrastructure/repositories/importar.repository');
const { verifyToken } = require('../../infrastructure/middlewares/auth.middleware');
const { verifyRole } = require('../../infrastructure/middlewares/roles.middleware');

// POST - Importar Excel (solo sistemas)
router.post('/', verifyToken, verifyRole('sistemas'), (req, res) => {
    upload.single('archivo')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: 'Error al subir archivo', error: err.message });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No se subió ningún archivo' });
            }

            const resultados = await importarRepository.importarExcel(req.file.buffer);

            res.json({
                message: 'Importación completada',
                insertados: resultados.insertados,
                actualizados: resultados.actualizados,
                errores: resultados.errores,
            });

        } catch (error) {
            res.status(500).json({ message: 'Error al importar', error: error.message });
        }
    });
});

module.exports = router;