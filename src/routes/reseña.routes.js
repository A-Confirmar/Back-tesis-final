import { Router } from "express";
const router = Router();

import { authMiddleware } from "../middleware/auth.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";
import pool from "../db.js";

/**
 * @swagger
 * /verTodasLasResenias:
 *   get:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Ver todas las reseñas"
 *     description: "Obtiene todas las reseñas. Solo los administradores pueden acceder a este endpoint."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Reseñas obtenidas exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Reseñas obtenidas exitosamente"
 *               reseñas:
 *                 - ID: 1
 *                   turno_ID: 123
 *                   nombreProfesional: "Juan"
 *                   apellidoProfesional: "Pérez"
 *                   puntaje: 5
 *                   estado: "visible"
 *                   comentario: "Excelente atención"
 *                   fecha: "2025-10-20"
 *               result: true
 *       403:
 *         description: "Acceso denegado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Solo los administradores pueden ver todas las reseñas."
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener las reseñas."
 *               error: "Error detallado"
 *               result: false
 */
router.get("/verTodasLasResenias", authMiddleware, async (req, res) => {
    try {
        const [esAdmin] = await pool.query("SELECT u.ID FROM usuario u JOIN administrador a ON u.ID = a.ID WHERE u.ID = ?", [req.user.id]);

        if (esAdmin.length > 0) {
            logToPage("El usuario es administrador. Obteniendo todas las reseñas...");
            const [resenias] = await pool.query("SELECT r.ID, turno_ID, u.nombre AS nombreProfesional, u.apellido AS apellidoProfesional, r.puntaje, r.estado, r.comentario, r.fecha FROM reseña r JOIN usuario u ON u.ID = r.profesional_ID");
            res.status(200).json({ message: "Reseñas obtenidas exitosamente", reseñas: resenias, result: true });
        } else {
            logErrorToPage("❌ Error al obtener las reseñas: Solo los administradores pueden ver todas las reseñas");
            res.status(403).json({ message: "Solo los administradores pueden ver todas las reseñas.", result: false });
        }

    } catch (error) {
        logErrorToPage("❌ Error al obtener las reseñas:" + error);
        res.status(500).json({ message: "Error al obtener las reseñas.", error: error.message, result: false });
    }
});

/**
 * @swagger
 * /verTodasMisResenias:
 *   get:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Ver todas mis reseñas"
 *     description: "Obtiene todas las reseñas APROBADAS POR EL ADMIN del profesional autenticado."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Reseñas obtenidas exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Mis reseñas obtenidas exitosamente"
 *               resenias:
 *                 - ID: 1
 *                   turno_ID: 123
 *                   nombreProfesional: "Juan"
 *                   apellidoProfesional: "Pérez"
 *                   puntaje: 5
 *                   comentario: "Excelente atención"
 *                   fecha: "2025-10-20"
 *               result: true
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener mis reseñas."
 *               error: "Error detallado"
 *               result: false
 */
router.get("/verTodasMisResenias", authMiddleware, async (req, res) => {
    try {
        logToPage("Obteniendo todas mis reseñas...");
        const [resenias] = await pool.query("SELECT r.ID, r.turno_ID, u.nombre AS nombreProfesional, u.apellido AS apellidoProfesional, r.puntaje, r.comentario, r.fecha FROM reseña r JOIN usuario u ON u.ID = r.profesional_ID WHERE r.profesional_ID = ? AND r.estado = 'visible'", [req.user.id]);
        res.status(200).json({ message: "Mis reseñas obtenidas exitosamente", resenias: resenias, result: true });
    } catch (error) {
        logErrorToPage("❌ Error al obtener mis reseñas:" + error);
        res.status(500).json({ message: "Error al obtener mis reseñas.", error: error.message, result: false });
    }
});

/**
 * @swagger
 * /tieneResenia:
 *   get:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Devuelve un true si el usuario ya hizo la reseña al turno relacionado"
 *     description: "Verifica si el usuario autenticado ya ha realizado una reseña para el turno especificado."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - name: idTurno
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *     responses:
 *       200:
 *         description: "Respuesta exitosa"
 *         content:
 *           application/json:
 *             example:
 *               message: "Mis reseñas obtenidas exitosamente"
 *               result: true
 *       400:
 *        description: "Error en los datos enviados"
 *        content:
 *          application/json:
 *            example:
 *              message: "Faltan datos obligatorios para crear la reseña"
 *              result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener mis reseñas."
 *               error: "Error detallado"
 *               result: false
 */
router.get("/tieneResenia", authMiddleware, async (req, res) => {
    try {
        logToPage("Verificando si el usuario tiene reseña...");
        const { idTurno } = req.query;
        if (!idTurno) {
            return res.status(400).json({ message: "Faltan datos obligatorios para verificar la reseña", result: false });
        }
        const [turnoExiste] = await pool.query("SELECT * FROM turno WHERE ID = ?", [idTurno]);
        if (turnoExiste.length === 0) {
            return res.status(400).json({ message: "El turno especificado no existe", result: false });
        }
        const [result] = await pool.query("SELECT COUNT(*) as tieneResenia FROM reseña r JOIN turno t ON r.turno_ID = t.ID WHERE t.ID = ? AND t.paciente_ID = ?", [idTurno, req.user.id]);
        res.status(200).json({ message: "Verificación de reseña exitosa", result: result[0].tieneResenia > 0 });
    } catch (error) {
        logErrorToPage("❌ Error interno:" + error);
        res.status(500).json({ message: "Error al verificar la reseña.", error: error.message, result: false });
    }
});

/**
 * @swagger
 * /verReseñasDeProfesional:
 *   get:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Devuelve un true si el usuario ya hizo la reseña al turno relacionado"
 *     description: "Verifica si el usuario autenticado ya ha realizado una reseña para el turno especificado."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - name: idTurno
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "123"
 *     responses:
 *       200:
 *         description: "Respuesta exitosa"
 *         content:
 *           application/json:
 *             example:
 *               message: "Mis reseñas obtenidas exitosamente"
 *               result: true
 *       400:
 *        description: "Error en los datos enviados"
 *        content:
 *          application/json:
 *            example:
 *              message: "Faltan datos obligatorios para crear la reseña"
 *              result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener mis reseñas."
 *               error: "Error detallado"
 *               result: false
 */
router.get("/verReseniasDeProfesional", authMiddleware, async (req, res) => {
    const { profesionalMail } = req.query;
    try {
        logToPage("Verificando si el usuario tiene reseña...");
        if (!profesionalMail) {
            return res.status(400).json({ message: "Faltan datos obligatorios para verificar la reseña", result: false });
        }
        const [profesional] = await pool.query("SELECT ID FROM usuario WHERE email = ?", [profesionalMail]);
        
        console.log(profesional[0].ID);
        const [reseniaExiste] = await pool.query("SELECT * FROM reseña WHERE profesional_ID = ?", [profesional[0].ID]);
        logToPage(reseniaExiste);
        if (reseniaExiste.length === 0) {
            return res.status(400).json({ message: "El profesional no tiene reseñas", result: false });
        }
        res.status(200).json({ message: "Reseñas obtenidas exitosamente", data: reseniaExiste, result: true });
    } catch (error) {
        logErrorToPage("❌ Error interno:" + error);
        res.status(500).json({ message: "Error al verificar la reseña.", error: error.message, result: false });
    }
});

/**
 * @swagger
 * /crearResenia:
 *   post:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Crear una reseña"
 *     description: "Permite a un paciente crear una reseña para un turno específico. Es necesario el id del turno."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               turnoID:
 *                 type: integer
 *                 example: 123
 *                 description: "ID del turno asociado a la reseña"
 *               puntaje:
 *                 type: integer
 *                 example: 5
 *                 description: "Puntaje de la reseña (1-5)"
 *               comentario:
 *                 type: string
 *                 example: "Excelente atención"
 *                 description: "Comentario de la reseña"
 *     responses:
 *       201:
 *         description: "Reseña creada exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Reseña creada exitosamente"
 *               result: true
 *       400:
 *         description: "Error en los datos enviados"
 *         content:
 *           application/json:
 *             example:
 *               message: "Faltan datos obligatorios para crear la reseña"
 *               result: false
 *       403:
 *         description: "Acceso denegado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Solo los pacientes pueden crear reseñas o no existe el turno"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al crear la reseña."
 *               error: "Error detallado"
 */
router.post("/crearResenia", authMiddleware, async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { turnoID, puntaje, comentario } = req.body;


        const [esPaciente] = await pool.query("SELECT u.ID FROM usuario u JOIN turno t ON u.ID = t.paciente_ID WHERE u.ID = ? AND t.ID = ?", [req.user.id, turnoID]);
        const [yaHayReseña] = await pool.query("SELECT * FROM reseña WHERE turno_ID = ? AND profesional_ID = (SELECT profesional_ID FROM turno WHERE ID = ?)", [turnoID, turnoID]);

        if (esPaciente.length === 0) {
            logErrorToPage("❌ Error al crear la reseña: Solo los pacientes pueden crear reseñas o no existe el turno");
            return res.status(403).json({ message: "Solo los pacientes pueden crear reseñas o no existe el turno", result: false });
        }

        if (yaHayReseña.length > 0) {
            logErrorToPage("❌ Error al crear la reseña: Ya existe una reseña para este turno");
            return res.status(400).json({ message: "Ya existe una reseña para este turno", result: false });
        }

        if (!turnoID || !puntaje || !comentario) {
            logErrorToPage("❌ Error al crear la reseña: Faltan datos obligatorios");
            return res.status(400).json({ message: "Faltan datos obligatorios para crear la reseña", result: false });
        }

        conexion.beginTransaction();
        logToPage("Creando reseña para el turno ID: " + turnoID);
        const [result] = await conexion.query("INSERT INTO reseña (turno_ID, profesional_ID, puntaje, comentario, fecha) VALUES (?, (SELECT profesional_ID FROM turno WHERE ID = ?), ?, ?, CURDATE())", [turnoID, turnoID, puntaje, comentario]);

        if (result.affectedRows === 0) {
            logErrorToPage("❌ Error al crear la reseña: No se pudo insertar la reseña");
            await conexion.rollback();
            return res.status(400).json({ message: "Error al crear la reseña: No se pudo insertar la reseña", result: false });
        }

        logToPage("actualizando calificación promedio del profesional...");
        const [promedio] = await conexion.query("SELECT AVG(puntaje) AS promedio FROM reseña WHERE profesional_ID = (SELECT profesional_ID FROM turno WHERE ID = ?)", [turnoID]);
        const [resultCalificacion] = await conexion.query("UPDATE profesional SET calificacion_promedio = ? WHERE ID = (SELECT profesional_ID FROM turno WHERE ID = ?)", [promedio[0].promedio, turnoID]);

        if (resultCalificacion.affectedRows === 0) {
            logErrorToPage("❌ Error al actualizar la calificación promedio del profesional");
            await conexion.rollback();
            return res.status(400).json({ message: "Error al actualizar la calificación promedio del profesional", result: false });
        }

        await conexion.commit();
        res.status(201).json({ message: "Reseña creada exitosamente", result: true });
    } catch (error) {
        await conexion.rollback();
        logErrorToPage("❌ Error al crear la reseña:" + error);
        res.status(500).json({ message: "Error al crear la reseña.", error: error.message });
    } finally {
        conexion.release();
    }
});

/**
 * @swagger
 * /aprobarResenia:
 *   put:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Aprobar una reseña"
 *     description: "Permite a un administrador aprobar una reseña para que sea visible."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reseniaID:
 *                 type: integer
 *                 example: 1
 *                 description: "ID de la reseña a aprobar"
 *     responses:
 *       200:
 *         description: "Reseña aprobada exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Reseña aprobada exitosamente"
 *               result: true
 *       403:
 *         description: "Acceso denegado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Solo los administradores pueden aprobar reseñas."
 *               result: false
 *       404:
 *         description: "Reseña no encontrada"
 *         content:
 *           application/json:
 *             example:
 *               message: "Reseña no encontrada"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al aprobar la reseña."
 *               error: "Error detallado"
 */
router.put("/aprobarResenia", authMiddleware, async (req, res) => {
    const { reseniaID } = req.body;
    try {
        const [esAdmin] = await pool.query("SELECT u.ID FROM usuario u JOIN administrador a ON u.ID = a.ID WHERE u.ID = ?", [req.user.id]);

        if (esAdmin.length > 0) {
            logToPage("El usuario es administrador. modificando la reseña...");
            const [resenia] = await pool.query("UPDATE reseña SET estado = 'visible' WHERE ID = ?", [reseniaID]);
            if (resenia.affectedRows > 0) {
                res.status(200).json({ message: "Reseña aprobada exitosamente", result: true });
            } else {
                res.status(404).json({ message: "Reseña no encontrada", result: false });
            }

        } else {
            logErrorToPage("❌ Error al modificar la reseña: Solo los administradores pueden aprobar reseñas");
            res.status(403).json({ message: "Solo los administradores pueden aprobar reseñas.", result: false });
        }

    } catch (error) {
        logErrorToPage("❌ Error al aprobar la reseña:" + error);
        res.status(500).json({ message: "Error al aprobar la reseña.", error: error.message });
    }
});

/**
 * @swagger
 * /eliminarResenia:
 *   delete:
 *     tags:
 *       - CRUD Reseñas
 *     summary: "Eliminar una reseña"
 *     description: "Permite a un administrador o al propietario de la reseña eliminarla."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reseniaID:
 *                 type: integer
 *                 example: 1
 *                 description: "ID de la reseña a eliminar"
 *     responses:
 *       200:
 *         description: "Reseña eliminada exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Reseña eliminada exitosamente"
 *               result: true
 *       403:
 *         description: "Acceso denegado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Solo los administradores o el propietario pueden eliminar reseñas."
 *               result: false
 *       404:
 *         description: "Reseña no encontrada"
 *         content:
 *           application/json:
 *             example:
 *               message: "Reseña no encontrada"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al eliminar la reseña."
 *               error: "Error detallado"
 */
router.delete("/eliminarResenia", authMiddleware, async (req, res) => {
    try {
        const reseniaID = req.body.reseniaID;
        const [esAdminOPropietario] = await pool.query("SELECT u.ID FROM usuario u WHERE u.ID = ? AND (EXISTS (SELECT 1 FROM administrador a WHERE u.ID = a.ID) OR EXISTS (SELECT 1 FROM reseña r JOIN turno t ON t.ID = r.turno_ID WHERE r.ID = ? AND t.paciente_ID = u.ID))", [req.user.id, reseniaID]);

        if (esAdminOPropietario.length > 0) {
            logToPage("El usuario es administrador o propietario. Eliminando la reseña...");
            const [resenia] = await pool.query("DELETE FROM reseña WHERE ID = ?", [reseniaID]);
            if (resenia.affectedRows > 0) {
                res.status(200).json({ message: "Reseña eliminada exitosamente", result: true });
            } else {
                res.status(404).json({ message: "Reseña no encontrada", result: false });
            }
        } else {
            logErrorToPage("❌ Error al eliminar la reseña: Solo los administradores o el propietario pueden eliminar reseñas");
            res.status(403).json({ message: "Solo los administradores o el propietario pueden eliminar reseñas.", result: false });
        }

    } catch (error) {
        logErrorToPage("❌ Error al eliminar la reseña:" + error);
        res.status(500).json({ message: "Error al eliminar la reseña.", error: error.message });
    }
});











export default router;