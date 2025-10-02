import { Router } from "express";
const router = Router();
import pool from "../db.js";


import { authMiddleware } from "../middleware/auth.js";




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
// Ruta protegida, solo accesible con token válido
router.post("/establecerDisponibilidadProfesional", authMiddleware, async (req, res) => {
    let connection;
    try {
        const idProfesional = req.user.id;

        const { horarios } = req.body;
        // const horarios = {
        //     "lunes": [
        //         { "inicio": "08:15", "fin": "20:00" },
        //         { "inicio": "08:15", "fin": "20:00" }
        //     ],
        //     "martes": [
        //         { "inicio": "08:15", "fin": "20:00" },
        //         { "inicio": "08:15", "fin": "20:00" }
        //     ],
        //     "miercoles": [
        //         { "inicio": "08:15", "fin": "20:00" },
        //         { "inicio": "08:15", "fin": "20:00" }
        //     ],
        //     "jueves": [
        //         { "inicio": "08:15", "fin": "20:00" },
        //         { "inicio": "08:15", "fin": "20:00" }
        //     ],
        //     "viernes": [
        //         { "inicio": "08:15", "fin": "20:00" },
        //         { "inicio": "08:15", "fin": "20:00" }
        //     ],
        //     "sabado": [
        //         { "inicio": "09:00", "fin": "14:00" }
        //     ],
        //     "domingo": null
        // };

        if (!horarios) {
            return res.status(400).json({ message: "Debe enviar horarios", result: false });
        }

        const values = [];
        for (const dia in horarios) {
            for (const intervalo of horarios[dia] || []) {
                values.push([idProfesional, dia, intervalo.inicio, intervalo.fin]);
            }
        }

        if (values.length === 0) {
            return res.status(400).json({ message: "No se proporcionaron horarios válidos", result: false });
        }


        connection = await pool.getConnection();
        await connection.beginTransaction();


        await connection.query(
            "DELETE FROM Disponibilidad WHERE profesional_ID = ?",
            [idProfesional]
        );
        const [result] = await connection.query(
            "INSERT INTO Disponibilidad (profesional_ID, dia_semana, hora_inicio, hora_fin) VALUES ?",
            [values]
        );


        if (result.affectedRows === 0) {
            connection.rollback();
            return res.status(400).json({ message: "No se pudo agregar la disponibilidad", result: false });
        }

        connection.commit();
        res.status(201).json({ message: "Disponibilidad actualizada", result: true });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al actualizar disponibilidad:", error);
        res.status(500).json({ message: "Error interno", error, result: false });
    } finally {
        if (connection) connection.release();
    }
});









export default router;

