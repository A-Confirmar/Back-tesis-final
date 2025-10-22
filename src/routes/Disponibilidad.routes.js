import { Router } from "express";
const router = Router();
import pool from "../db.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";
import { obtenerDiaSemana } from "../Utils/obtenerDiaSemana.js";


import { authMiddleware } from "../middleware/auth.js";

/**
 * @swagger
 * /obtenerDisponibilidadProfesional:
 *   get:
 *     tags:
 *       - CRUD disponibilidad profesional
 *     summary: "Obtener disponibilidad profesional (requiere autenticación)"
 *     description: "Obtiene la disponibilidad del profesional autenticado."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *         description: Token JWT de autenticación
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - name: email
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Email del profesional que se desea obtener la disponibilidad
 *         example: "doctor@mail.com"
 *     responses:
 *       200:
 *         description: "Disponibilidad encontrada"
 *         content:
 *           application/json:
 *             example:
 *               message: "Disponibilidad encontrada"
 *               disponibilidad:
 *                 - ID: 1
 *                   nombre: "Juan Pérez"
 *                   dia_semana: "lunes"
 *                   hora_inicio: "08:00:00"
 *                   hora_fin: "12:00:00"
 *               result: true
 *       404:
 *         description: "No se encontró disponibilidad para este profesional"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se encontró disponibilidad para este profesional"
 *               result: false
 *       500:
 *         description: "Error al obtener disponibilidad"
 *         content:
 *           application/json:
 *             example:
 *               error: "Error al obtener disponibilidad"
 *               result: false
 */
router.get("/obtenerDisponibilidadProfesional", authMiddleware, async (req, res) => {
    try {
        logToPage(`Buscando disponibilidad del profesional: ${req.query.email}`);
        const [rows] = await pool.query("SELECT d.ID, u.nombre + u.apellido AS nombre, d.dia_semana, d.hora_inicio, d.hora_fin FROM disponibilidad d JOIN usuario u ON d.profesional_ID = u.ID WHERE u.email = ?", [req.query.email]);

        if (rows.length === 0) {
            logErrorToPage("No se encontró disponibilidad para el profesional:", req.query.email);
            return res.status(404).json({ message: "No se encontró disponibilidad para este profesional", result: false });
        }

        if (rows.length > 0) {
            logToPage(`Disponibilidad encontrada para el profesional: ${req.query.email}`);
            return res.status(200).json({ message: "Disponibilidad encontrada", disponibilidad: rows, result: true });
        }

    } catch (error) {
        logErrorToPage("Error al obtener disponibilidad:", error);
        res.status(500).json({ error: "Error al obtener disponibilidad" });
    }
});

/**
 * @swagger
 * /obtenerDisponibilidadDisponible:
 *   post:
 *     tags:
 *       - CRUD disponibilidad profesional
 *     summary: "Obtiene la disponibilidad DISPONIBLE de un profesional con el email proporcionado"
 *     description: "Obtiene la disponibilidad DISPONIBLE del mail profesional proporcionado."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - name: email
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "profesional@example.com"
 *     responses:
 *       200:
 *         description: "Disponibilidad DISPONIBLE encontrada"
 *         content:
 *           application/json:
 *             example:
 *               message: "Disponibilidad DISPONIBLE encontrada"
 *               result: true
 *       400:
 *         description: "No se proporciono email válido"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se proporciono email válido"
 *               result: false
 *       500:
 *         description: "Error interno"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno"
 *               result: false
 */
router.get("/obtenerDisponibilidadDisponible", authMiddleware, async (req, res) => {
    const { email } = req.query;
    try {
        if (!email) {
            logErrorToPage("No se proporciono email válido");
            return res.status(400).json({ message: "No se proporciono email válido", result: false });
        }
        logToPage(`Buscando disponibilidad del profesional: ${email}`);
        const [disponibilidad] = await pool.query("SELECT d.ID,d.dia_semana, d.hora_inicio, d.hora_fin FROM disponibilidad d JOIN usuario u ON d.profesional_ID = u.ID WHERE u.email = ?", [email]);


        if (disponibilidad.length === 0) {
            logErrorToPage("No se encontró disponibilidad para el profesional");
            return res.status(404).json({ message: "No se encontró disponibilidad para este profesional", result: false });
        } else {
            logToPage(`Disponibilidad encontrada para el profesional.`);
        }

        logToPage("Buscando turnos RESERVADOS del profesional:" + email);
        const [turnos] = await pool.query("SELECT t.fecha, t.hora_inicio, t.hora_fin FROM turno t JOIN usuario u ON t.profesional_ID = u.ID WHERE u.email = ? AND t.estado = 'confirmado'", [email]);
        logToPage(`Turnos reservados encontrados para el profesional.`);




        logToPage("Filtrando disponibilidad para obtener solo horarios DISPONIBLES");
        const disponibilidadFiltrada = disponibilidad.filter(dia => {
            const turnosDelDia = turnos.filter(turno => obtenerDiaSemana(turno.fecha) === dia.dia_semana);
            let horaInicio = dia.hora_inicio;
            let horaFin = dia.hora_fin;
            for (const turno of turnosDelDia) {
                const turnoInicio = turno.hora_inicio;
                const turnoFin = turno.hora_fin;
                if (turnoInicio === horaInicio && turnoFin === horaFin) {
                    return false; // Quitar del arreglo principal
                }
            }

            return true; // Mantener en el arreglo principal
        });

        res.status(200).json({ disponibilidad: disponibilidadFiltrada, message: "Disponibilidad DISPONIBLE encontrada", result: true });
    } catch (error) {
        logErrorToPage("Error al obtener disponibilidad:" + error);
        res.status(500).json({ error: "Error al obtener disponibilidad" });
    }
});

//waloendpoint
router.get("/obtenerDisponibilidadDisponibleWalo", authMiddleware, async (req, res) => {
    const { email } = req.query;
    try {
        logToPage(`Buscando disponibilidad del profesional: ${email}`);

        await pool.query("set lc_time_names = 'es_ES';");
        const [disponibilidad] = await pool.query(`SELECT tur.*,
                                                          dis.*
                                                   FROM turno tur
                                                   LEFT JOIN disponibilidad dis ON dis.profesional_ID = tur.profesional_ID
                                                   WHERE tur.profesional_ID = (SELECT usu.ID
                                                                               FROM usuario usu
                                                                               WHERE usu.email = ${email})
                                                   AND NOT(LOWER(DAYNAME(tur.fecha)) = LOWER(dis.dia_semana) AND dis.hora_inicio = tur.hora_inicio AND dis.hora_fin = tur.hora_fin);`);

        res.status(200).json({ res: disponibilidad });

    } catch (error) {
        logErrorToPage("Error al obtener disponibilidad:" + error);
        res.status(500).json({ error: "Error al obtener disponibilidad" });
    }
});

/**
 * @swagger
 * /establecerDisponibilidadProfesional:
 *   post:
 *     tags:
 *       - CRUD disponibilidad profesional
 *     summary: "Establecer disponibilidad profesional (requiere autenticación)"
 *     description: "Establece la disponibilidad para el profesional autenticado. Si hay horarios existentes, los reemplaza por los nuevos."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token JWT de autenticación
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               horarios:
 *                 type: object
 *                 description: Horarios de disponibilidad por día de la semana
 *                 properties:
 *                   lunes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inicio:
 *                           type: string
 *                           example: "08:15"
 *                         fin:
 *                           type: string
 *                           example: "20:00"
 *                   martes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inicio:
 *                           type: string
 *                           example: "08:15"
 *                         fin:
 *                           type: string
 *                           example: "20:00"
 *                   miercoles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inicio:
 *                           type: string
 *                           example: "08:15"
 *                         fin:
 *                           type: string
 *                           example: "20:00"
 *                   jueves:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inicio:
 *                           type: string
 *                           example: "08:15"
 *                         fin:
 *                           type: string
 *                           example: "20:00"
 *                   viernes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inicio:
 *                           type: string
 *                           example: "08:15"
 *                         fin:
 *                           type: string
 *                           example: "20:00"
 *                   sabado:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inicio:
 *                           type: string
 *                           example: "09:00"
 *                         fin:
 *                           type: string
 *                           example: "14:00"
 *                   domingo:
 *                     nullable: true
 *                     example: null
 *     responses:
 *       201:
 *         description: "Disponibilidad actualizada"
 *         content:
 *           application/json:
 *             example:
 *               message: "Disponibilidad actualizada"
 *               result: true
 *       400:
 *         description: "No se proporcionaron horarios válidos"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se proporcionaron horarios válidos"
 *               result: false
 *       500:
 *         description: "Error interno"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno"
 *               result: false
 */
router.post("/establecerDisponibilidadProfesional", authMiddleware, async (req, res) => {
    let connection;
    logToPage(`Estableciendo disponibilidad para el profesional: ${req.user.email}`);
    try {
        const idProfesional = req.user.id;

        const { horarios } = req.body;

        if (!horarios) {
            logErrorToPage("No se proporcionaron horarios" + horarios);
            return res.status(400).json({ message: "Debe enviar horarios", result: false });
        }

        const values = [];
        for (const dia in horarios) {
            for (const intervalo of horarios[dia] || []) {
                values.push([idProfesional, dia, intervalo.inicio, intervalo.fin]);
            }
        }

        if (values.length === 0) {
            logErrorToPage("No se proporcionaron horarios válidos" + values);
            return res.status(400).json({ message: "No se proporcionaron horarios válidos", result: false });
        }


        connection = await pool.getConnection();
        await connection.beginTransaction();


        await connection.query(
            "DELETE FROM disponibilidad WHERE profesional_ID = ?",
            [idProfesional]
        );
        const [result] = await connection.query(
            "INSERT INTO disponibilidad (profesional_ID, dia_semana, hora_inicio, hora_fin) VALUES ?",
            [values]
        );


        if (result.affectedRows === 0) {
            connection.rollback();
            return res.status(400).json({ message: "No se pudo agregar la disponibilidad", result: false });
        }

        connection.commit();
        logToPage(`Disponibilidad actualizada para el profesional: ${req.user.email}`);
        res.status(201).json({ message: "Disponibilidad actualizada", result: true });

    } catch (error) {
        if (connection) await connection.rollback();
        logErrorToPage("Error al actualizar disponibilidad:", error);
        res.status(500).json({ message: "Error interno" + error, result: false });
    } finally {
        if (connection) connection.release();
    }
});







export default router;

