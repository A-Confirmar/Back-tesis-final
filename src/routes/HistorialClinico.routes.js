import { Router } from "express";
const router = Router();

import { authMiddleware } from "../middleware/auth.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";
import pool from "../db.js";

/**
 * @swagger
 * /obtenerTodosMisHistorialesClinicos:
 *   get:
 *     tags:
 *       - Historial Clinico
 *     summary: Obtener todos los historiales clínicos del paciente autenticado
 *     description: Devuelve todos los registros de historia clínica asociados al paciente autenticado.
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Historial clínico obtenido exitosamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Historial clinico obtenido exitosamente"
 *               result: true
 *               historial:
 *                 - ID: 1
 *                   paciente_ID: 10
 *                   profesional_ID: 5
 *                   fecha_ultima_actualizacion: "14-11-2025"
 *                   diagnostico: "Diagnóstico ejemplo"
 *                   tratamiento: "Tratamiento ejemplo"
 *                   evolucion: "En mejora"
 *       404:
 *         description: No se encontró historial clínico
 *       500:
 *         description: Error interno del servidor
 */
router.get("/obtenerTodosMisHistorialesClinicos", authMiddleware, async (req, res) => {
    logToPage("Obteniendo historial clinico...");
    const pacienteID = req.user.id;
    try {
        logToPage("Obteniendo historial clinico del paciente...");
        const [historialRows] = await pool.query("SELECT ID, paciente_ID, profesional_ID, DATE_FORMAT(fecha_ultima_actualizacion, '%d-%m-%Y') AS fecha_ultima_actualizacion, diagnostico, tratamiento, evolucion FROM historiaclinica WHERE paciente_ID = ?", [pacienteID]);
        if (historialRows.length === 0) {
            logErrorToPage("El paciente no tiene un historial clinico.");
            return res.status(404).json({ message: "El paciente no tiene un historial clinico.", result: false });
        }
        return res.status(200).json({ message: "Historial clinico obtenido exitosamente", result: true, historial: historialRows });

    } catch (error) {
        logErrorToPage("Error al obtener historial clinico: " + error);
        return res.status(500).json({ message: "Error del servidor", result: false });
    }

});

/**
 * @swagger
 * /obtenerHistorialClinicoDelPaciente:
 *   get:
 *     tags:
 *       - Historial Clinico
 *     summary: Obtener historial clínico de un paciente para el profesional autenticado
 *     description: Busca el historial clínico del paciente identificado por su email y asociado al profesional autenticado.
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - name: pacienteMail
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "paciente@ejemplo.com"
 *     responses:
 *       200:
 *         description: Historial clínico encontrado
 *         content:
 *           application/json:
 *             example:
 *               message: "Historial clinico obtenido exitosamente"
 *               result: true
 *               historial:
 *                 ID: 1
 *                 paciente_ID: 10
 *                 profesional_ID: 5
 *                 fecha_ultima_actualizacion: "14-11-2025"
 *                 diagnostico: "Diagnóstico ejemplo"
 *                 tratamiento: "Tratamiento ejemplo"
 *                 evolucion: "En mejora"
 *       400:
 *         description: Datos de entrada inválidos / paciente no existe
 *       404:
 *         description: No se encontró historial clínico con ese profesional
 *       500:
 *         description: Error interno del servidor
 */
router.get("/obtenerHistorialClinicoDelPaciente", authMiddleware, async (req, res) => {
    logToPage("Obteniendo historial clinico...");
    const profesionalID = req.user.id;
    const { pacienteMail } = req.query;
    try {
        if (!pacienteMail) {
            logErrorToPage("Faltan datos obligatorios");
            return res.status(400).json({ message: "Faltan datos obligatorios", result: false });
        }
        logToPage("Obteniendo ID del paciente...");
        const [pacienteRows] = await pool.query("SELECT ID FROM usuario WHERE email = ?", [pacienteMail]);
        if (pacienteRows.length === 0) {
            logErrorToPage("El paciente no existe");
            return res.status(400).json({ message: "El paciente no existe", result: false });
        }
        logToPage("Paciente encontrando: " + pacienteRows[0].ID);
        logToPage("Obteniendo historial clinico del paciente...");
        const [historialRows] = await pool.query("SELECT ID, paciente_ID, profesional_ID, DATE_FORMAT(fecha_ultima_actualizacion, '%d-%m-%Y') AS fecha_ultima_actualizacion, diagnostico, tratamiento, evolucion FROM historiaclinica WHERE paciente_ID = ? AND profesional_ID = ?", [pacienteRows[0].ID, profesionalID]);
        if (historialRows.length === 0) {
            logErrorToPage("El paciente no tiene un historial clinico con este profesional");
            return res.status(404).json({ message: "El paciente no tiene un historial clinico con este profesional", result: false });
        }
        return res.status(200).json({ message: "Historial clinico obtenido exitosamente", result: true, historial: historialRows[0] });

    } catch (error) {
        logErrorToPage("Error al obtener historial clinico: " + error);
        return res.status(500).json({ message: "Error del servidor", result: false });
    }

});

/**
 * @swagger
 * /nuevoHistorialClinico:
 *   post:
 *     tags:
 *       - Historial Clinico
 *     summary: Crear un nuevo historial clínico para un paciente
 *     description: Crea un nuevo registro de historia clínica asociado al profesional autenticado y al paciente indicado por email.
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
 *               pacienteMail:
 *                 type: string
 *                 example: "paciente@ejemplo.com"
 *               diagnostico:
 *                 type: string
 *                 example: "Diagnóstico ejemplo"
 *               tratamiento:
 *                 type: string
 *                 example: "Tratamiento ejemplo"
 *               evolucion:
 *                 type: string
 *                 example: "En mejora"
 *     responses:
 *       201:
 *         description: Historial clínico creado exitosamente
 *       400:
 *         description: Datos faltantes o paciente ya tiene historial con este profesional
 *       500:
 *         description: Error interno del servidor
 */
router.post("/nuevoHistorialClinico", authMiddleware, async (req, res) => {
    logToPage("Creando nuevo historial clinico...");
    const profesionalID = req.user.id;
    const { pacienteMail, diagnostico, tratamiento, evolucion } = req.body;
    try {
        if (!pacienteMail || !diagnostico || !tratamiento || !evolucion) {
            logErrorToPage("Faltan datos obligatorios");
            return res.status(400).json({ message: "Faltan datos obligatorios", result: false });
        }
        logToPage("Obteniendo ID del paciente...");
        const [pacienteRows] = await pool.query("SELECT ID FROM usuario WHERE email = ?", [pacienteMail]);
        if (pacienteRows.length === 0) {
            logErrorToPage("El paciente no existe");
            return res.status(400).json({ message: "El paciente no existe", result: false });
        }
        logToPage("Paciente encontrando: " + pacienteRows[0].ID);

        logToPage("Verifico que no tenga un historial clinico previo...");
        const [existingHistorial] = await pool.query("SELECT * FROM historiaclinica WHERE paciente_ID = ? AND profesional_ID = ?", [pacienteRows[0].ID, profesionalID]);
        if (existingHistorial.length > 0) {
            logErrorToPage("El paciente ya tiene un historial clinico con este profesional");
            return res.status(400).json({ message: "El paciente ya tiene un historial clinico con este profesional", result: false });
        }

        logToPage("Creando nuevo historial clinico...");
        const [result] = await pool.query("INSERT INTO historiaClinica (paciente_ID, profesional_ID, fecha_ultima_actualizacion, diagnostico, tratamiento, evolucion) VALUES (?, ?, CURDATE(), ?, ?, ?)", [pacienteRows[0].ID, profesionalID, diagnostico, tratamiento, evolucion]);
        if (result.affectedRows > 0) {
            return res.status(201).json({ message: "Nuevo historial clinico creado exitosamente", result: true });
        } else {
            logErrorToPage("Error al crear nuevo historial clinico");
            return res.status(500).json({ message: "Error al crear nuevo historial clinico", result: false });
        }

    } catch (error) {
        logErrorToPage("Error al crear nuevo historial clinico: " + error);
        return res.status(500).json({ message: "Error del servidor", result: false });
    }




});

/**
 * @swagger
 * /actualizarHistorialClinicoDelPaciente:
 *   put:
 *     tags:
 *       - Historial Clinico
 *     summary: Actualizar historial clínico del paciente
 *     description: Actualiza el registro de historia clínica del paciente asociado al profesional autenticado.
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
 *               pacienteMail:
 *                 type: string
 *                 example: "paciente@ejemplo.com"
 *               diagnostico:
 *                 type: string
 *                 example: "Diagnóstico actualizado"
 *               tratamiento:
 *                 type: string
 *                 example: "Nuevo tratamiento"
 *               evolucion:
 *                 type: string
 *                 example: "En revisión"
 *     responses:
 *       200:
 *         description: Historial clínico actualizado exitosamente
 *       400:
 *         description: Datos faltantes o paciente no existe
 *       500:
 *         description: Error interno del servidor
 */
router.put("/actualizarHistorialClinicoDelPaciente", authMiddleware, async (req, res) => {
    const profesionalID = req.user.id;
    const { pacienteMail, diagnostico, tratamiento, evolucion } = req.body;
    try {
        if (!pacienteMail || !diagnostico || !tratamiento || !evolucion) {
            logErrorToPage("Faltan datos obligatorios");
            return res.status(400).json({ message: "Faltan datos obligatorios", result: false });
        }

        logToPage("Obteniendo ID del paciente...");
        const [pacienteRows] = await pool.query("SELECT ID FROM usuario WHERE email = ?", [pacienteMail]);
        if (pacienteRows.length === 0) {
            logErrorToPage("El paciente no existe");
            return res.status(400).json({ message: "El paciente no existe", result: false });
        }
        logToPage("Paciente encontrando: " + pacienteRows[0].ID);
        logToPage("Actualizando historial clinico del paciente...");
        const [result] = await pool.query("UPDATE historiaclinica SET fecha_ultima_actualizacion = CURDATE(), diagnostico = ?, tratamiento = ?, evolucion = ? WHERE paciente_ID = ? AND profesional_ID = ?", [diagnostico, tratamiento, evolucion, pacienteRows[0].ID, profesionalID]);
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Historial clinico actualizado exitosamente", result: true });
        } else {
            logErrorToPage("Error al actualizar historial clinico");
            return res.status(500).json({ message: "Error al actualizar historial clinico", result: false });
        }
    } catch (error) {
        logErrorToPage("Error al actualizar historial clinico: " + error);
        return res.status(500).json({ message: "Error del servidor", result: false });
    }




});

/**
 * @swagger
 * /eliminarHistorialClinico:
 *   delete:
 *     tags:
 *       - Historial Clinico
 *     summary: Eliminar un historial clínico
 *     description: Permite eliminar un registro de historia clínica por su ID.
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
 *               historialID:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Historial clínico eliminado exitosamente
 *       400:
 *         description: Datos faltantes
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/eliminarHistorialClinico", authMiddleware, async (req, res) => {
    const {historialID} = req.body;
    try {
        if (!historialID) {
            logErrorToPage("Faltan datos obligatorios");
            return res.status(400).json({ message: "Faltan datos obligatorios", result: false });
        }
        logToPage("Eliminando historial clinico...");
        const [result] = await pool.query("DELETE FROM historiaclinica WHERE ID = ?", [historialID]);
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Historial clinico eliminado exitosamente", result: true });
        } else {
            logErrorToPage("Error al eliminar historial clinico");
            return res.status(500).json({ message: "Error al eliminar historial clinico", result: false });
        }

    }catch (error) {
        logErrorToPage("Error al eliminar historial clinico: " + error);
        return res.status(500).json({ message: "Error del servidor", result: false });
    }

});









export default router;