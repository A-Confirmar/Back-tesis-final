import { Router } from "express";
const router = Router();
import pool from "../db.js";
import dayjs from "dayjs";

import { authMiddleware } from "../middleware/auth.js";

function obtenerDiaSemana(fechaStr) {
     const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
      const d = dayjs(fechaStr);
     return dias[d.day()];
}

/**
 * @swagger
 * /nuevoTurno:
 *   post:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Crear nuevo turno (requiere autenticación)"
 *     description: "Crea un nuevo turno en el sistema. Requiere un token JWT válido."
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

    if(!emailProfesional || !fecha || !hora_inicio || !hora_fin || !estado || !tipo)
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
        idProfesional= result[0].profesional_ID;
        // Verificar si ya existe un turno en el mismo horario
        [turnoExistente] = await pool.query(
            "SELECT * FROM Turno t JOIN Usuario u ON u.ID = t.profesional_ID WHERE u.email = ?AND fecha = ?AND (? < t.hora_fin AND? > t.hora_inicio)",
            [emailProfesional, fecha, hora_inicio, hora_fin]
        );
    }else{
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
    console.log("user:", user);
    // Insertar el nuevo turno
    const [reserva] = await pool.query(
        "INSERT INTO Turno (paciente_ID, profesional_ID, fecha, hora_inicio, hora_fin, estado, tipo) VALUES (?,?, ?, ?, ?, ?, ?)",
        [user.id, idProfesional, fecha, hora_inicio, hora_fin, estado, tipo]
    );
    if (reserva.affectedRows === 1) {
        res.status(201).json({
            message: "Turno creado exitosamente",
            result: true,
            turnoId: reserva.insertId
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









export default router;