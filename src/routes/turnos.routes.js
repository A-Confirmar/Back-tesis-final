import { Router } from "express";
const router = Router();
import pool from "../db.js";
import dayjs from "dayjs";
import { recordatorioDeTurno, cancelarRecordatorioDeTurno } from "../Utils/recordatorios.js";
import { enviarMailConfirmacionTurno } from "../Utils/mailer.js";

import { authMiddleware } from "../middleware/auth.js";

function obtenerDiaSemana(fechaStr) {
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const d = dayjs(fechaStr);
    return dias[d.day()];
}


/**
 * @swagger
 * /buscarTurno:
 *   get:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Buscar turno por usuario"
 *     description: "Busca todos los turnos existentes para el usuario autenticado."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Turno encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turno encontrado"
 *               result: true
 *               turno: {
 *                 id: 123,
 *                 fecha: "2025-10-03",
 *                 hora_inicio: "09:00",
 *                 hora_fin: "09:30",
 *                 estado: "pendiente",
 *                 tipo: "consulta"
 *               }
 *       404:
 *         description: "Turno no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "El usuario no tiene turnos"
 *               result: false
 */
router.get("/buscarTurno", authMiddleware, async (req, res) => {
    try {

        const [turnos] = await pool.query(`
            SELECT 
                t.ID AS turnoId,
                u.nombre AS nombrePaciente,
                u.apellido AS apellidoPaciente,
                DATE_FORMAT(t.fecha, '%d-%m-%Y') AS fechaTurno,
                t.hora_inicio,
                t.hora_fin,
                t.estado,
                t.tipo,
                up.nombre AS nombreProfesional,
                up.apellido AS apellidoProfesional
            FROM Turno t
            JOIN Usuario u ON t.paciente_ID = u.ID
            JOIN Usuario up ON t.profesional_ID = up.ID
            WHERE u.ID = ?
            `, [req.user.id]);


        if (turnos.length === 0) {
            return res.status(404).json({
                message: "El usuario no tiene turnos",
                result: false
            });
        }

        res.json({
            message: "Turnos encontrados",
            result: true,
            turnos: turnos
        });
    } catch (error) {
        console.error("Error al buscar turno:", error);
        res.status(500).json({
            message: "Error al buscar turno",
            result: false
        });
    }
});

/**
 * @swagger
 * /nuevoTurno:
 *   post:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Crear nuevo turno y programa recordatorio 1 hora antes"
 *     description: "Crea un nuevo turno en el sistema.(requiere autenticación) Y generar recordatorio una hora antes"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - emailProfesional
 *               - fecha
 *               - hora_inicio
 *               - hora_fin
 *               - estado
 *               - tipo
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               emailProfesional:
 *                 type: string
 *                 example: "doctor@mail.com"
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-03"
 *               hora_inicio:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *               hora_fin:
 *                 type: string
 *                 format: time
 *                 example: "09:30"
 *               estado:
 *                 type: string
 *                 example: "pendiente"
 *               tipo:
 *                 type: string
 *                 example: "consulta"
 *     responses:
 *       201:
 *         description: "Turno creado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turno creado exitosamente"
 *               result: true
 *               turnoId: 123
 *       400:
 *         description: "Faltan datos obligatorios o conflicto de horario"
 *         content:
 *           application/json:
 *             example:
 *               message: "Faltan datos obligatorios"
 *               result: false
 *       401:
 *         description: "Token inválido o no enviado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Token requerido"
 *               result: false
 *       500:
 *         description: "Error al crear turno"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al crear turno"
 *               result: false
 */
router.post("/nuevoTurno", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado
        const { emailProfesional, fecha, hora_inicio, hora_fin, estado, tipo } = req.body;
        const diaSemana = obtenerDiaSemana(fecha);

        if (!emailProfesional || !fecha || !hora_inicio || !hora_fin || !estado || !tipo)
            return res.status(400).json({
                message: "Faltan datos obligatorios",
                result: false
            });

        const [result] = await pool.query(
            "SELECT * FROM Disponibilidad d JOIN Usuario u ON d.profesional_ID = u.ID WHERE u.email = ? AND d.dia_semana = ? AND d.hora_inicio <= ? AND d.hora_fin >= ?",
            [emailProfesional, diaSemana, hora_inicio, hora_fin]
        );

        let idProfesional;
        let turnoExistente;
        if (result.length > 0) {
            idProfesional = result[0].profesional_ID;
            // Verificar si ya existe un turno en el mismo horario
            [turnoExistente] = await pool.query(
                "SELECT * FROM Turno t JOIN Usuario u ON u.ID = t.profesional_ID WHERE u.email = ?AND fecha = ?AND (? < t.hora_fin AND? > t.hora_inicio)",
                [emailProfesional, fecha, hora_inicio, hora_fin]
            );
        } else {
            return res.status(400).json({
                message: "El profesional no tiene disponibilidad en ese horario",
                result: false
            });
        }

        if (turnoExistente.length > 0) {
            return res.status(400).json({
                message: "Ya existe un turno en ese horario",
                result: false
            });
        }
        // Insertar el nuevo turno
        const [reserva] = await pool.query(
            "INSERT INTO Turno (paciente_ID, profesional_ID, fecha, hora_inicio, hora_fin, estado, tipo) VALUES (?,?, ?, ?, ?, ?, ?)",
            [user.id, idProfesional, fecha, hora_inicio, hora_fin, estado, tipo]
        );
        if (reserva.affectedRows === 1) {

            // Obtener el nombre del paciente y del profesional
            const [pacienteRows] = await pool.query("SELECT nombre FROM Usuario WHERE email = ?", [user.email]);
            const [profesionalRows] = await pool.query("SELECT nombre, apellido FROM Usuario WHERE id = ?", [idProfesional]);

            // Programar el recordatorio
            recordatorioDeTurno(pacienteRows[0].nombre, user.email, profesionalRows[0], fecha, hora_inicio, reserva.insertId);

            // Enviar mail de confirmación
            enviarMailConfirmacionTurno(user.email, pacienteRows[0].nombre, profesionalRows[0], hora_inicio, fecha);
            res.status(201).json({
                message: "Turno creado exitosamente",
                result: true
            });
        }

    } catch (error) {
        console.error("Error al crear turno:", error);
        res.status(500).json({
            message: "Error al crear turno: " + error.message,
            result: false
        });
    }
});

/**
 * @swagger
 * /eliminarTurno:
 *   delete:
 *     tags:
 *       - CRUD Turnos  
 *     summary: "Eliminar turno y recordatorio"
 *     description: "Elimina un turno existente (requiere autenticación) Y elimina el recordatorio asociado"
 *     parameters:
 *       - in: body
 *         name: body
 *         description: "ID del turno a eliminar"
 *         required:
 *           - token
 *           - turnoId
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             turnoId:
 *               type: integer
 *               example: 1
 *     responses:
 *       200:
 *         description: "Turno eliminado exitosamente"
 *       404:
 *         description: "Turno no encontrado"
 *       500:
 *         description: "Error al eliminar turno"
 */
router.delete("/eliminarTurno", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado
        const { turnoId } = req.body;
        const [check] = await pool.query("SELECT ID FROM Turno WHERE ID = ? AND paciente_ID = ?", [turnoId, user.id]);

        if (check.length === 0) {
            return res.status(404).json({
                message: "Turno no encontrado",
                result: false
            });
        }

        // Eliminar el turno de la base de datos
        const [result] = await pool.query("DELETE FROM Turno WHERE id = ? AND paciente_ID = ?", [turnoId, user.id]);
        if (result.affectedRows === 1) {
            // Cancelar el recordatorio
            const recordatorio = cancelarRecordatorioDeTurno(turnoId);
            if (recordatorio) {
                console.log("Recordatorio cancelado exitosamente");
            } else {
                console.log("No se pudo cancelar el recordatorio o no existía");
            }
            res.status(200).json({
                message: "Turno eliminado exitosamente",
                result: true
            });
        } else {
            res.status(404).json({
                message: "Turno no encontrado",
                result: false
            });
        }
    } catch (error) {
        console.error("Error al eliminar turno:", error);
        res.status(500).json({
            message: "Error al eliminar turno: " + error.message,
            result: false
        });
    }
});









export default router;