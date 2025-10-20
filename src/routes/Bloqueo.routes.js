import { Router } from "express";
const router = Router();
import pool from "../db.js";

import { authMiddleware } from "../middleware/auth.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";








/**
 * @swagger
 * /verBloqueados:
 *   get:
 *     tags:
 *       - Bloqueo
 *     summary: "Ver usuarios bloqueados por el profesional"
 *     description: "Devuelve una lista de usuarios bloqueados por el profesional autenticado. Requiere autenticación."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Usuarios bloqueados obtenidos exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               bloqueados:
 *                 - ID: 1
 *                   nombre: "Juan"
 *                   apellido: "Pérez"
 *                   email: "juan@mail.com"
 *                   motivo: "Incumplimiento de normas"
 *                   fecha: "2025-10-17"
 *               message: "Usuarios bloqueados obtenidos exitosamente"
 *               result: true
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno del servidor"
 *               result: false
 */
router.get("/verBloqueados", authMiddleware,  async (req, res) => {
    try {
        const userId = req.user.id;
        const [bloqueados] = await pool.query(
            `SELECT U.ID, U.nombre, U.apellido, U.email, B.motivo, B.fecha 
             FROM bloqueo B 
             JOIN usuario U ON B.paciente_ID = U.ID 
             WHERE B.profesional_ID = ?`,
            [userId]
        );
        logToPage(`Usuarios bloqueados obtenidos para profesional ID ${userId}`);
        res.status(200).json({ bloqueados: bloqueados, message: "Usuarios bloqueados obtenidos exitosamente", result: true });

    }catch (error) {
        logErrorToPage("Error al obtener usuarios bloqueados:", error);
        res.status(500).json({ message: "Error interno del servidor", result: false });
    }
});

/**
 * @swagger
 * /verProfesionalesQueMeTienenBloqueado:
 *   get:
 *     tags:
 *       - Bloqueo
 *     summary: "Ver profesionales que tienen bloqueado al usuario"
 *     description: "Devuelve una lista de profesionales que tienen bloqueado al usuario autenticado. Requiere autenticación."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Profesionales obtenidos exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               bloqueados:
 *                 - ID: 1
 *                   nombre: "Laura"
 *                   apellido: "García"
 *                   email: "laura@mail.com"
 *                   motivo: "Incumplimiento de normas"
 *                   fecha: "2025-10-17"
 *               message: "Profesionales obtenidos exitosamente"
 *               result: true
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno del servidor"
 *               result: false
 */
router.get("/verProfesionalesQueMeTienenBloqueado", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const [bloqueados] = await pool.query(
            `SELECT U.ID, U.nombre, U.apellido, U.email, B.motivo, B.fecha 
             FROM bloqueo B 
             JOIN usuario U ON B.profesional_ID = U.ID 
             WHERE B.paciente_ID = ?`,
            [userId]
        );

        if(bloqueados.length === 0){
            logToPage(`Ningun profesional tiene bloqueado al usuario ${userId}`);
            return  res.status(200).json({ bloqueados: [], message: "Ningun profesional tiene bloqueado al usuario", result: true });
        }

        logToPage(`profesionales que tienen bloqueado al usuario ${userId}`);
        res.status(200).json({ bloqueados: bloqueados, message: "profesionales que tienen bloqueado al usuario obtenidos exitosamente", result: true });

    } catch (error) {
        logErrorToPage("Error al obtener profesionales que tienen bloqueado al usuario:", error);
        res.status(500).json({ message: "Error interno del servidor", result: false });
    }
});

/**
 * @swagger
 * /bloquearUsuario:
 *   post:
 *     tags:
 *       - Bloqueo
 *     summary: "Bloquear un usuario"
 *     description: "Permite al profesional bloquear a un usuario especificando su email y el motivo del bloqueo. Requiere autenticación."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailPaciente:
 *                 type: string
 *                 example: "juan@mail.com"
 *               motivo:
 *                 type: string
 *                 example: "Incumplimiento de normas"
 *     responses:
 *       200:
 *         description: "Usuario bloqueado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario bloqueado exitosamente"
 *               result: true
 *       400:
 *         description: "Falta el email del paciente a bloquear"
 *         content:
 *           application/json:
 *             example:
 *               message: "Falta el email del paciente a bloquear"
 *               result: false
 *       404:
 *         description: "Usuario a bloquear no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario a bloquear no encontrado"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno del servidor"
 *               result: false
 */
router.post("/bloquearUsuario", authMiddleware, async (req, res) => {
    const {emailPaciente, motivo} = req.body;
    try {
        const userId = req.user.id;
        if(!emailPaciente){
            logErrorToPage("Falta el email del paciente a bloquear");
            return res.status(400).json({ message: "Falta el email del paciente a bloquear", result: false });
        }
        const [rows] = await pool.query("SELECT * from usuario WHERE email = ?", [emailPaciente]);
        if (rows.length === 0) {
            logErrorToPage("Usuario a bloquear no encontrado");
            return res.status(404).json({ message: "Usuario a bloquear no encontrado", result: false });
        }
        const pacienteId = rows[0].ID;

        // Verificar si ya está bloqueado
        const [bloqueoExistente] = await pool.query(
            "SELECT * FROM bloqueo WHERE profesional_ID = ? AND paciente_ID = ?",
            [userId, pacienteId]
        );
        if (bloqueoExistente.length > 0) {
            logErrorToPage("El usuario ya está bloqueado por este profesional");
            return res.status(400).json({ message: "El usuario ya está bloqueado por este profesional", result: false });
        }
        await pool.query(
            "INSERT INTO bloqueo (profesional_ID, paciente_ID,motivo,fecha) VALUES (?, ?, ?, ?)",
            [userId, pacienteId, motivo, new Date()]
        );
        logToPage(`Usuario con email ${emailPaciente} bloqueado por profesional ID ${userId}`);
        res.status(200).json({ message: "Usuario bloqueado exitosamente", result: true });


    } catch (error) {
        logErrorToPage("Error al bloquear usuario:", error);
        res.status(500).json({ message: "Error interno del servidor", result: false });
    }
});

/**
 * @swagger
 * /desbloquearUsuario:
 *   delete:
 *     tags:
 *       - Bloqueo
 *     summary: "Desbloquear un usuario"
 *     description: "Permite al profesional desbloquear a un usuario especificando su email. Requiere autenticación."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailPaciente:
 *                 type: string
 *                 example: "juan@mail.com"
 *     responses:
 *       200:
 *         description: "Usuario desbloqueado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario desbloqueado exitosamente"
 *               result: true
 *       400:
 *         description: "Falta el email del paciente a desbloquear"
 *         content:
 *           application/json:
 *             example:
 *               message: "Falta el email del paciente a desbloquear"
 *               result: false
 *       404:
 *         description: "Usuario a desbloquear no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario a desbloquear no encontrado"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno del servidor"
 *               result: false
 */
router.delete("/desbloquearUsuario", authMiddleware, async (req, res) => {
    try {
        const { emailPaciente } = req.body;
        const userId = req.user.id;
        if(!emailPaciente){
            logErrorToPage("Falta el email del paciente a desbloquear");
            return res.status(400).json({ message: "Falta el email del paciente a desbloquear", result: false });
        }

        const [paciente] = await pool.query("SELECT * from usuario WHERE email = ?", [emailPaciente]);
        
        if (paciente.length === 0) {
            logErrorToPage("Usuario a desbloquear no encontrado");
            return res.status(404).json({ message: "Usuario a desbloquear no encontrado", result: false });
        }

        const [pacienteBloqueado] = await pool.query("SELECT * from bloqueo WHERE paciente_ID = ?", [paciente[0].ID]);
        console.log(paciente);
        
        if(pacienteBloqueado.length === 0){
            logErrorToPage("Este paciente no esta bloqueado");
            return res.status(404).json({ message: "Este paciente no esta bloqueado", result: false });
        }

        const pacienteId = paciente[0].ID;
        await pool.query(
            "DELETE FROM bloqueo WHERE profesional_ID = ? AND paciente_ID = ?",
            [userId, pacienteId]
        );
        logToPage(`Usuario con email ${emailPaciente} desbloqueado por profesional ID ${userId}`);
        res.json({ message: "Usuario desbloqueado exitosamente", result: true });

    } catch (error) {
        logErrorToPage("Error al desbloquear usuario:", error);
        res.status(500).json({ message: "Error interno del servidor", result: false });
    }
});









export default router;