import { Router } from "express";
const router = Router();
import pool from "../db.js";
import { recordatorioDeTurno, cancelarRecordatorioDeTurno } from "../Utils/recordatorios.js";
import { enviarMailConfirmacionTurno, enviarMailCancelacionTurno, enviarMailSolicitudExpress, enviarMailConfirmacionTurnoExpress, enviarMailEsperaTurnoExpress } from "../Utils/mailer.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";
import { obtenerDiaSemana } from "../Utils/obtenerDiaSemana.js";

import { authMiddleware } from "../middleware/auth.js";




/**
 * @swagger
 * /buscarTurno:
 *   get:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Trae todos los turnos del paciente logueado."
 *     description: "Busca todos los turnos existentes para el usuario autenticado."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: token
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 *                 estado: "confirmado",
 *                 tipo: "consulta"
 *               }
 *       404:
 *         description: "Turno no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "El usuario no tiene turnos"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al buscar turno"
 *               result: false
 */
router.get("/buscarTurno", authMiddleware, async (req, res) => {
    try {

        logToPage(`Buscando turnos para el usuario email: ${req.user.email}`);
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
                t.expressAceptado,
                up.nombre AS nombreProfesional,
                up.apellido AS apellidoProfesional
            FROM turno t
            JOIN usuario u ON t.paciente_ID = u.ID
            JOIN usuario up ON t.profesional_ID = up.ID
            WHERE u.ID = ?
            `, [req.user.id]);


        if (turnos.length === 0) {
            logToPage(`El usuario con email ${req.user.email} no tiene turnos.`);
            return res.status(404).json({
                message: "El usuario no tiene turnos",
                result: false
            });
        }

        logToPage(`Turnos encontrados para el usuario con email ${req.user.email}: ${turnos.length} turnos.`);
        res.json({
            message: "Turnos encontrados",
            result: true,
            turnos: turnos
        });
    } catch (error) {
        logErrorToPage("Error al buscar turno:", error);
        res.status(500).json({
            message: "Error al buscar turno",
            result: false
        });
    }
});

/**
 * @swagger
 * /obtenerMisTurnosConfirmados:
 *   get:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Obtener mis turnos confirmados"
 *     description: "Devuelve una lista de turnos confirmados para el profesional autenticado."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Turnos confirmados encontrados"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turnos confirmados encontrados"
 *               result: true
 *               turnos:
 *                 - turnoId: 123
 *                   nombrePaciente: "Juan"
 *                   apellidoPaciente: "Pérez"
 *                   fechaTurno: "2025-10-03"
 *                   hora_inicio: "09:00"
 *                   hora_fin: "09:30"
 *                   estado: "confirmado"
 *                   tipo: "consulta"
 *       404:
 *         description: "El profesional no tiene turnos confirmados"
 *         content:
 *           application/json:
 *             example:
 *               message: "El profesional no tiene turnos confirmados"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al buscar turno"
 *               result: false
 */
router.get("/obtenerMisTurnosConfirmado", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado

        logToPage(`Buscando turnos confirmados para el profesional con email: ${user.email}`);
        const [turnos] = await pool.query(`SELECT
            t.ID AS turnoId, 
            u.nombre AS nombrePaciente, 
            u.apellido AS apellidoPaciente, 
            DATE_FORMAT(t.fecha, '%d-%m-%Y') AS fechaTurno, 
            t.hora_inicio, 
            t.hora_fin, 
            t.estado, 
            t.tipo,
            t.expressAceptado
            FROM turno t 
            JOIN usuario u ON t.paciente_ID = u.ID 
            JOIN usuario up ON t.profesional_ID = up.ID 
            WHERE up.ID = ? AND t.estado = 'confirmado'`, [user.id]);

        if (turnos.length === 0) {
            logToPage(`El profesional con email ${user.email} no tiene turnos confirmados.`);
            return res.status(404).json({
                message: "El profesional no tiene turnos confirmados",
                result: false
            });
        } else {
            logToPage(`Turnos confirmados encontrados para el profesional con email ${user.email}: ${turnos.length} turnos.`);
            res.json({
                message: "Turnos confirmados encontrados",
                result: true,
                turnos: turnos
            });
        }

    } catch (error) {
        res.status(500).json({
            message: "Error al buscar turno",
            result: false
        });
    }
});

/**
 * @swagger
 * /obtenerMisTurnos:
 *   get:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Obtener mis turnos"
 *     description: "Devuelve una lista de TODOS los turnos para el usuario autenticado. (confirmados, pendientes, cancelados, realizados )"
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Turnos encontrados"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turnos encontrados"
 *               result: true
 *               turnos:
 *                 - turnoId: 123
 *                   nombrePaciente: "Juan"
 *                   apellidoPaciente: "Pérez"
 *                   fechaTurno: "2025-10-03"
 *                   hora_inicio: "09:00"
 *                   hora_fin: "09:30"
 *                   estado: "pendiente"
 *                   tipo: "consulta"
 *       404:
 *         description: "El usuario no tiene turnos "
 *         content:
 *           application/json:
 *             example:
 *               message: "El profesional no tiene turnos confirmados"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al buscar turno"
 *               result: false
 */
router.get("/obtenerMisTurnos", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado

        logToPage(`Buscando turnos confirmados para el profesional con email: ${user.email}`);
        const [turnos] = await pool.query(`SELECT
            t.ID AS turnoId, 
            u.nombre AS nombrePaciente, 
            u.apellido AS apellidoPaciente, 
            DATE_FORMAT(t.fecha, '%d-%m-%Y') AS fechaTurno, 
            t.hora_inicio, 
            t.hora_fin, 
            t.estado, 
            t.tipo,
            t.expressAceptado
            FROM turno t 
            JOIN usuario u ON t.paciente_ID = u.ID 
            JOIN usuario up ON t.profesional_ID = up.ID 
            WHERE up.ID = ?`, [user.id]);

        if (turnos.length === 0) {
            logToPage(`El profesional con email ${user.email} no tiene turnos.`);
            return res.status(404).json({
                message: "El profesional no tiene turnos",
                result: false
            });
        } else {
            logToPage(`Turnos encontrados para el profesional con email ${user.email}: ${turnos.length} turnos.`);
            res.json({
                message: "Turnos encontrados",
                result: true,
                turnos: turnos
            });
        }

    } catch (error) {
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
 *     summary: "Crear nuevo turno, pago y programa recordatorio 1 hora antes de la hora de inicio"
 *     description: "Crea un nuevo turno y pago en el sistema. Requiere autenticación. Además, genera un recordatorio una hora antes del inicio del turno."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailProfesional
 *               - fecha
 *               - hora_inicio
 *               - hora_fin
 *               - tipo
 *             properties:
 *               emailProfesional:
 *                 type: string
 *                 example: "doctor@mail.com"
 *                 description: "Correo electrónico del profesional"
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-03"
 *                 description: "Fecha del turno (YYYY-MM-DD)"
 *               hora_inicio:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *                 description: "Hora de inicio del turno (HH:mm)"
 *               hora_fin:
 *                 type: string
 *                 format: time
 *                 example: "09:30"
 *                 description: "Hora de finalización del turno (HH:mm)"
 *               tipo:
 *                 type: string
 *                 example: "consulta"
 *                 description: "Tipo de turno (consulta, control, etc.)"
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
    const conexión = await pool.getConnection();
    try {
        const user = req.user; // Usuario autenticado
        const { emailProfesional, fecha, hora_inicio, hora_fin, tipo } = req.body;
        const diaSemana = obtenerDiaSemana(fecha);

        if (!emailProfesional || !fecha || !hora_inicio || !hora_fin || !tipo)
            return res.status(400).json({
                message: "Faltan datos obligatorios",
                result: false
            });

        logToPage(`Verificando disponibilidad del profesional con email ${emailProfesional} para el ${diaSemana} de ${hora_inicio} a ${hora_fin}`);
        const [result] = await pool.query(
            "SELECT * FROM disponibilidad d JOIN usuario u ON d.profesional_ID = u.ID WHERE u.email = ? AND d.dia_semana = ? AND d.hora_inicio <= ? AND d.hora_fin >= ?",
            [emailProfesional, diaSemana, hora_inicio, hora_fin]
        );

        let idProfesional;
        let turnoExistente;
        if (result.length > 0) {
            logToPage(`El profesional con email ${emailProfesional} tiene disponibilidad el ${diaSemana} de ${hora_inicio} a ${hora_fin}`);
            idProfesional = result[0].profesional_ID;
            logToPage(`Verificando si ya existe un turno para el profesional con email ${emailProfesional} el ${fecha} de ${hora_inicio} a ${hora_fin}`);
            [turnoExistente] = await pool.query(
                "SELECT * FROM turno t JOIN usuario u ON u.ID = t.profesional_ID WHERE u.email = ? AND fecha = ? AND (? = t.hora_fin AND ? = t.hora_inicio)",
                [emailProfesional, fecha, hora_fin, hora_inicio]
            );
        } else {
            logErrorToPage(`El profesional con email ${emailProfesional} no tiene disponibilidad el ${diaSemana} de ${hora_inicio} a ${hora_fin}`);
            return res.status(400).json({
                message: "El profesional no tiene disponibilidad en ese horario",
                result: false
            });
        }


        if (turnoExistente.length > 0) {
            logErrorToPage(`Ya existe un turno para el profesional con email ${emailProfesional} el ${fecha} de ${hora_inicio} a ${hora_fin}`);
            return res.status(400).json({
                message: "Ya existe un turno en ese horario",
                result: false
            });
        }
        // Insertar el nuevo turno
        logToPage(`Creando nuevo turno para el usuario ${user.email} con el profesional ${emailProfesional} el ${fecha} de ${hora_inicio} a ${hora_fin}`);

        await conexión.beginTransaction();
        const [reserva] = await conexión.query(
            "INSERT INTO turno (paciente_ID, profesional_ID, fecha, hora_inicio, hora_fin, tipo) VALUES (?, ?, ?, ?, ?, ?)",
            [user.id, idProfesional, fecha, hora_inicio, hora_fin, tipo]
        );
        if (reserva.affectedRows === 1) {
            logToPage(`Turno creado exitosamente con ID ${reserva.insertId}`);

            logToPage("Generando pago relacionado al turno en PENDIENTE.")

            const [pago] = await conexión.query("INSERT INTO pago (turno_ID, monto, estado) VALUES (?,(SELECT valorConsulta FROM profesional WHERE ID = ?), 'pendiente')", [reserva.insertId, idProfesional]);

            if (pago.affectedRows === 1) {
                logToPage(`Pago generado exitosamente con ID ${pago.insertId}`);
            } else {
                conexión.rollback();
                logErrorToPage(`Error al generar pago para el turno ID ${reserva.insertId}`);
            }

            // Obtener el nombre del paciente y del profesional
            const [pacienteRows] = await pool.query("SELECT nombre FROM usuario WHERE email = ?", [user.email]);
            const [profesionalRows] = await pool.query("SELECT nombre, apellido FROM usuario WHERE id = ?", [idProfesional]);

            // Programar el recordatorio
            logToPage(`Programando recordatorio para el turno ID ${reserva.insertId}`);
            recordatorioDeTurno(pacienteRows[0].nombre, user.email, profesionalRows[0], fecha, hora_inicio, reserva.insertId);

            // Enviar mail de confirmación
            logToPage(`Enviando mail de confirmación al paciente ${user.email}`);
            enviarMailConfirmacionTurno(user.email, pacienteRows[0].nombre, profesionalRows[0], hora_inicio, fecha);
            res.status(201).json({
                message: "Turno creado exitosamente",
                turnoId: reserva.insertId,
                result: true
            });
        }

        await conexión.commit();
    } catch (error) {
        await conexión.rollback();
        logErrorToPage("Error al crear turno:", error);
        res.status(500).json({
            message: "Error al crear turno: " + error.message,
            result: false
        });
    } finally {
        await conexión.release();
    }
});

/**
 * @swagger
 * /solicitarNuevoTurnoExpress:
 *   post:
 *     tags:
 *       - CRUD Turnos Express
 *     summary: "Crear nuevo turno tipo express, le manda un mail al profesional notificando la solicitud"
 *     description: "Crea un nuevo turno tipo express y notifica al profesional. Requiere autenticación."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailProfesional
 *             properties:
 *               emailProfesional:
 *                 type: string
 *                 example: "doctor@mail.com"
 *                 description: "Correo electrónico del profesional"
 *     responses:
 *       200:
 *         description: "Turno express solicitado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turno express solicitado exitosamente"
 *               result: true
 *               turnoId: 123
 *       400:
 *         description: "Faltan datos obligatorios"
 *         content:
 *           application/json:
 *             example:
 *               message: "Faltan datos obligatorios"
 *               result: false
 *       500:
 *         description: "Error al crear turno express"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al crear turno express"
 *               result: false
 */
router.post("/solicitarNuevoTurnoExpress", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado
        const { emailProfesional } = req.body;
        const [profesionalRows] = await pool.query("SELECT ID, nombre, apellido FROM usuario WHERE email = ?", [emailProfesional]);

        if (!emailProfesional) {
            logToPage("Faltan datos obligatorios para solicitar turno express.");
            return res.status(400).json({
                message: "Faltan datos obligatorios",
                result: false
            });
        }

        const [expressExistente] = await pool.query("SELECT * FROM turno t JOIN usuario u ON u.ID = t.profesional_ID WHERE u.email = ? AND t.tipo = 'express' AND t.paciente_ID = ? AND t.estado = 'pendiente'", [emailProfesional, user.id]);

        if (expressExistente.length > 0) {
            logToPage("Ya existe un turno express solicitado con este profesional.");
            return res.status(400).json({
                message: "Ya existe un turno express solicitado con este profesional",
                result: false
            });
        }

        logToPage(`Solicitando turno express para el usuario ${user.email} con el profesional ${emailProfesional}`);
        const [reserva] = await pool.query(
            "INSERT INTO turno (paciente_ID, profesional_ID, fecha, hora_inicio, hora_fin, tipo, estado, expressAceptado) VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '00:00:00', '00:00:00', 'express', 'pendiente', 0 )",
            [user.id, profesionalRows[0].ID]
        );

        logToPage(`Turno express solicitado exitosamente`);
        if (reserva.affectedRows === 1) {
            enviarMailSolicitudExpress(emailProfesional, user.name, profesionalRows[0]);
            res.status(200).json({
                message: "Turno express solicitado exitosamente",
                turnoId: reserva.insertId,
                result: true
            });
        }

    } catch (error) {
        logErrorToPage("Error al solicitar turno express:", error);
        res.status(500).json({
            message: "Error al solicitar turno express: " + error.message,
            result: false
        });
    }
});

/**
 * @swagger
 * /cancelarTurno:
 *   put:
 *     tags:
 *       - CRUD Turnos  
 *     summary: "Actualizar estado del turno a cancelado y recordatorios eliminados"
 *     description: "Actualiza el estado de un turno existente a cancelado (requiere autenticación) y elimina el recordatorio asociado"
 *     parameters:
 *       - in: body
 *         name: body
 *         description: "ID del turno a cancelar"
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
router.put("/cancelarTurno", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado
        const { turnoId } = req.body;
        const [rows] = await pool.query("SELECT u.ID, u.email, u.nombre, u.apellido, t.hora_inicio, DATE_FORMAT(t.fecha, '%d-%m-%Y') AS fecha FROM turno t JOIN usuario u ON t.profesional_ID = u.ID WHERE t.ID = ? AND t.paciente_ID = ?", [turnoId, user.id]);

        if (rows.length === 0) {
            logErrorToPage(`El turno con ID ${turnoId} no existe o no pertenece al usuario con email ${user.email}`);
            return res.status(404).json({
                message: "Turno no encontrado para cancelar",
                result: false
            });
        }

        // Eliminar el turno de la base de datos
        const [result] = await pool.query("UPDATE turno SET estado = 'cancelado' WHERE id = ? AND paciente_ID = ?", [turnoId, user.id]);

        if (result.changedRows === 1) {
            logToPage(`Turno con ID ${turnoId} cancelado exitosamente para el usuario con email ${user.email}`);
            enviarMailCancelacionTurno(rows[0].email, user.name, rows[0].nombre, rows[0].apellido, rows[0].hora_inicio, rows[0].fecha);
            // Cancelar el recordatorio
            const recordatorio = cancelarRecordatorioDeTurno(turnoId);
            if (recordatorio) {
                logToPage("Recordatorio cancelado exitosamente");
            } else {
                logErrorToPage("No se pudo cancelar el recordatorio o no existía");
            }
            res.status(200).json({
                message: "Turno cancelado exitosamente",
                result: true
            });
        } else {
            logErrorToPage(`No se pudo encontrar el turno con ID ${turnoId} para el usuario con email ${user.email}`);
            res.status(404).json({
                message: "Turno no encontrado",
                result: false
            });
        }
    } catch (error) {
        logErrorToPage("Error al cancelar turno:", error);
        res.status(500).json({
            message: "Error al cancelar turno: " + error.message,
            result: false
        });
    }
});

/**
 * @swagger
 * /aceptarTurnoExpress:
 *   put:
 *     tags:
 *       - CRUD Turnos Express
 *     summary: "Actualizar el horario del turno proporcionado por el profesional y el turno queda a la espera de respuesta del paciente."
 *     description: "Actualizar el horario del turno proporcionado por el profesional y el turno queda a la espera de respuesta del paciente."
 *     parameters:
 *       - in: body
 *         name: body
 *         description: "ID del turno a aceptar"
 *         required:
 *           - token
 *           - turnoId
 *           - inicio
 *           - fin
 *           - fecha
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             turnoId:
 *               type: integer
 *               example: 1
 *             inicio:
 *               type: string
 *               example: "10:00"
 *             fin:
 *               type: string
 *               example: "10:30"
 *             fecha:
 *               type: string
 *               example: "2024-06-15"
 *     responses:
 *       200:
 *         description: "Turno Aceptado exitosamente"
 *       404:
 *         description: "Turno no encontrado"
 *       500:
 *         description: "Error al aceptar turno"
 */
router.put("/aceptarTurnoExpress", authMiddleware, async (req, res) => {
    try {
        const user = req.user; // Usuario autenticado
        const { turnoId, inicio, fin, fecha } = req.body;
        const [rows] = await pool.query("SELECT u.ID, u.email, u.nombre, u.apellido, t.hora_inicio, DATE_FORMAT(t.fecha, '%d-%m-%Y') AS fecha, expressAceptado FROM turno t JOIN usuario u ON t.profesional_ID = u.ID WHERE t.ID = ? AND t.profesional_ID = ?", [turnoId, user.id]);

        if (rows.length === 0) {
            logErrorToPage(`El turno con ID ${turnoId} no existe o no pertenece al usuario con email ${user.email}`);
            return res.status(404).json({
                message: "Turno no encontrado para aceptar",
                result: false
            });
        }

        if(rows[0].expressAceptado){
            logToPage("Este turno ya fue aceptado previamente.");
            return  res.status(400).json({
                message: "Este turno ya fue aceptado previamente.",
                result: false
            });
        }


        const [paciente] = await pool.query("SELECT nombre, email FROM usuario WHERE id = (SELECT paciente_ID FROM turno WHERE id = ?)", [turnoId]);

        // aceptar el turno de la base de datos
        const [result] = await pool.query("UPDATE turno SET hora_inicio = ?, hora_fin = ?, fecha = ?, expressAceptado = 1 WHERE id = ? AND profesional_ID = ?", [inicio, fin, fecha, turnoId, user.id]);




        if (result.changedRows === 1) {
            logToPage(`Turno con ID ${turnoId} aceptado exitosamente. horarios y fechas actualizados por el profesional con email ${user.email}`);
            enviarMailEsperaTurnoExpress(paciente[0].email, paciente[0].nombre, user.name, fecha, inicio, fin);
            res.status(200).json({
                message: "Turno aceptado exitosamente",
                result: true
            });
        } else {

            logErrorToPage(`No se pudo encontrar el turno con ID ${turnoId} para el usuario con email ${user.email}`);
            res.status(404).json({
                message: "Turno no encontrado",
                result: false
            });
        }
    } catch (error) {
        logErrorToPage("Error al confirmar el turno:", error);
        res.status(500).json({
            message: "Error al confirmar el turno: " + error.message,
            result: false
        });
    }
});

/**
 * @swagger
 * /confirmarTurnoExpress:
 *   put:
 *     tags:
 *       - CRUD Turnos Express
 *     summary: "Confirmar turno express"
 *     description: "Confirma un turno de tipo 'express' (debe estar en estado 'pendiente'), genera el pago en estado 'pendiente' y programa el recordatorio."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - turnoId
 *             properties:
 *               turnoId:
 *                 type: integer
 *                 example: 123
 *                 description: "ID del turno express a confirmar"
 *     responses:
 *       200:
 *         description: "Turno confirmado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turno confirmado exitosamente"
 *               result: true
 *       400:
 *         description: "Faltan datos obligatorios o el turno no está en estado pendiente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Faltan datos obligatorios"
 *               result: false
 *       404:
 *         description: "Turno no encontrado o no es de tipo express"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turno no encontrado para confirmar"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al confirmar el turno: <detalle>"
 *               result: false
 */
router.put("/confirmarTurnoExpress", authMiddleware, async (req, res) => {
    const conexión = await pool.getConnection();
    try {
        const { turnoId } = req.body;
        const user = req.user; // Usuario autenticado

        if (!turnoId) {
            logErrorToPage("Faltan datos obligatorios para confirmar turno express.");
            return res.status(400).json({
                message: "Faltan datos obligatorios",
                result: false
            });
        }

        const [turnoRows] = await pool.query("SELECT ID, estado, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, hora_inicio, expressAceptado FROM turno WHERE ID = ? AND tipo = 'express'", [turnoId]);


        if (turnoRows.length === 0) {
            logErrorToPage(`El turno con ID ${turnoId} no existe o no es de tipo express.`);
            return res.status(404).json({
                message: "Turno no encontrado para confirmar",
                result: false
            });
        } else if (turnoRows[0].expressAceptado !== 1) {
            logErrorToPage(`El turno con ID ${turnoId} no está en estado aceptado y no puede ser confirmado.`);
            return res.status(400).json({
                message: "El turno no fue aceptado por el profesional y no puede ser confirmado.",
                result: false
            });
        }

        await conexión.beginTransaction();
        logToPage(`Confirmando turno express con ID ${turnoId}`);
        const [result] = await conexión.query("UPDATE turno SET estado = 'confirmado' WHERE ID = ?", [turnoId]);

        const [paciente] = await pool.query("SELECT nombre, email FROM usuario WHERE id = (SELECT paciente_ID FROM turno WHERE id = ?)", [turnoId]);
        const [profesional] = await pool.query("SELECT nombre, apellido, email FROM usuario WHERE id = (SELECT profesional_ID FROM turno WHERE id = ?)", [turnoId]);

        if (result.changedRows === 1) {

            logToPage(`Programando recordatorio para el turno ID ${turnoRows[0].ID}`);
            recordatorioDeTurno(paciente[0].nombre, user.email, profesional[0], turnoRows[0].fecha, turnoRows[0].hora_inicio, turnoRows[0].ID);

            enviarMailConfirmacionTurnoExpress(paciente[0].email, paciente[0].nombre, turnoRows[0].fecha, turnoRows[0].hora_inicio)//paciente
            enviarMailConfirmacionTurnoExpress(profesional[0].email, profesional[0].nombre, turnoRows[0].fecha, turnoRows[0].hora_inicio)//profesional
            logToPage(`Turno con ID ${turnoId} confirmado exitosamente.`);


            logToPage("Generando pago relacionado al turno en PENDIENTE.")

            const [pago] = await conexión.query("INSERT INTO pago (turno_ID, monto, estado) VALUES (?,(SELECT valorConsultaExpress FROM profesional WHERE ID = (SELECT profesional_ID FROM turno WHERE ID = ?)), 'pendiente')", [turnoId, turnoId]);

            if (pago.affectedRows === 1) {
                logToPage(`Pago generado exitosamente con ID ${pago.insertId}`);
            } else {
                conexión.rollback();
                logErrorToPage(`Error al generar pago para el turno ID ${reserva.insertId}`);
            }

            conexión.commit();
            res.status(200).json({
                message: "Turno confirmado exitosamente",
                result: true
            });
        }
    } catch (error) {
        conexión.rollback();
        logErrorToPage("Error al confirmar el turno:", error);
        res.status(500).json({
            message: "Error al confirmar el turno: " + error.message,
            result: false
        });
    } finally {
        await conexión.release();
    }









});








export default router;