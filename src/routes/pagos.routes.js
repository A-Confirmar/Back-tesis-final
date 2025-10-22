import { Router } from "express";
const router = Router();

import { authMiddleware } from "../middleware/auth.js";
import pool from "../db.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";


/**
 * @swagger
 * /VerPagos:
 *   get:
 *     tags:
 *       - CRUD Pagos
 *     summary: "Ver pagos del paciente autenticado"
 *     description: "Obtiene todos los pagos realizados por el paciente autenticado. Requiere autenticación."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Pagos obtenidos exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 turno_ID: 123
 *                 estado: "pagado"
 *                 fecha: "2025-10-19"
 *                 monto: 500
 *       404:
 *         description: "No se encontraron pagos"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se encontraron pagos."
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener los pagos."
 */
router.get("/VerPagos", authMiddleware, async (req, res) => {
    try{
        logToPage(`Obteniendo los pagos del paciente ID ${req.user.id}`);
        const [pagos] = await pool.query(`SELECT p.id, p.turno_ID, p.estado AS estadoPago, DATE_FORMAT(p.fecha, '%d-%m-%Y') AS fechaPago, p.monto, t.tipo AS tipoTurno, t.estado AS estadoTurno FROM pago p JOIN turno t ON p.turno_ID = t.ID WHERE t.paciente_ID = ?`, [req.user.id]);

        if(pagos.length === 0){
            logToPage(`No se encontraron pagos para el paciente ID ${req.user.id}`);
            return res.status(404).json({ message: "No se encontraron pagos." });
        }

        logToPage(`Pagos obtenidos exitosamente para el paciente ID ${req.user.id}`);
        res.status(200).json(pagos);
    }catch(error){
        logErrorToPage(`Error al obtener los pagos del paciente ID ${req.user.id}: ${error.message}`);
        res.status(500).json({ message: "Error al obtener los pagos." });
    }
});

/**
 * @swagger
 * /VerPagosProfesional:
 *   get:
 *     tags:
 *       - CRUD Pagos
 *     summary: "Ver pagos del profesional autenticado"
 *     description: "Obtiene todos los pagos de los turnos del profesional autenticado. Requiere autenticación."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Pagos obtenidos exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 turno_ID: 123
 *                 estado: "pagado"
 *                 fecha: "2025-10-19"
 *                 monto: 500
 *       404:
 *         description: "No se encontraron pagos"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se encontraron pagos."
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener los pagos."
 */
router.get("/VerPagosProfesional", authMiddleware, async (req, res) => {
    try{
        logToPage(`Obteniendo los pagos del profesional ID ${req.user.id}`);
        const [pagos] = await pool.query(`SELECT p.id, p.turno_ID, p.estado AS estadoPago, DATE_FORMAT(p.fecha, '%d-%m-%Y') AS fechaPago, p.monto, t.tipo AS tipoTurno, t.estado AS estadoTurno FROM pago p JOIN turno t ON p.turno_ID = t.ID WHERE t.profesional_ID = ?`, [req.user.id]);

        if(pagos.length === 0){
            logToPage(`No se encontraron pagos para el profesional ID ${req.user.id}`);
            return res.status(404).json({ message: "No se encontraron pagos." });
        }

        logToPage(`Pagos obtenidos exitosamente para el profesional ID ${req.user.id}`);
        res.status(200).json(pagos);
    }catch(error){
        logErrorToPage(`Error al obtener los pagos del profesional ID ${req.user.id}: ${error.message}`);
        res.status(500).json({ message: "Error al obtener los pagos." });
    }
});

/**
 * @swagger
 * /PagarTurno:
 *   put:
 *     tags:
 *       - CRUD Pagos
 *     summary: "Procesar el pago de un turno"
 *     description: "Permite procesar el pago de un turno específico. Requiere autenticación."
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
 *               turnoId:
 *                 type: integer
 *                 example: 123
 *                 description: "ID del turno a pagar"
 *     responses:
 *       200:
 *         description: "Pago procesado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Pago procesado exitosamente."
 *       404:
 *         description: "No se encontró el pago"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se encontró el pago."
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al procesar el pago."
 */
router.put("/PagarTurno", authMiddleware, async (req, res) => {
    try{
        const { turnoId } = req.body;
        logToPage(`Procesando pago para el turno ID ${turnoId} del paciente ID ${req.user.id}`);

        const [result] = await pool.query(`UPDATE pago SET estado = 'pagado', fecha = CURDATE() WHERE turno_ID = ?`, [turnoId]);

        if(result.affectedRows === 0){
            logToPage(`No se encontró el pago para el turno ID ${turnoId} del paciente ID ${req.user.id}`);
            return res.status(404).json({ message: "No se encontró el pago." });
        }

        logToPage(`Pago procesado exitosamente para el turno ID ${turnoId} del paciente ID ${req.user.id}`);
        res.status(200).json({ message: "Pago procesado exitosamente." });
    }catch(error){
        logErrorToPage(`Error al procesar el pago.`);
        res.status(500).json({ message: "Error al procesar el pago."+ error.message });
    }
});










export default router;