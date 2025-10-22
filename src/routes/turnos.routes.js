import { Router } from "express";
const router = Router();
import pool from "../db.js";
import { recordatorioDeTurno, cancelarRecordatorioDeTurno } from "../Utils/recordatorios.js";
import { enviarMailConfirmacionTurno, enviarMailCancelacionTurno, enviarMailSolicitudExpress, enviarMailConfirmacionTurnoExpress } from "../Utils/mailer.js";
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
            t.tipo 
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
            t.tipo 
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
 * /nuevoTurno:
 *   post:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Crear nuevo turno tipo express, le manda un mail al profesional notificando la solicitud (no se genera pago hasta que confirme el turno)"
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
 *               - fecha
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
 *     responses:
 *       201:
 *         description: "Turno express creado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Turno express creado exitosamente"
 *               result: true
 *               turnoId: 123
 *       400:
 *         description: "Faltan datos obligatorios"
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
 *         description: "Error al crear turno express"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al crear turno express"
 *               result: false
 */
router.post("/nuevoTurnoExpress", authMiddleware, async (req, res) => {
    const conexión = await pool.getConnection();
    try {
        const user = req.user; // Usuario autenticado
        const { emailProfesional } = req.body;

        if (!emailProfesional)
            return res.status(400).json({
                message: "Faltan datos obligatorios",
                result: false
            });

        await conexión.beginTransaction();
        await conexión.query("set lc_time_names = 'es_ES';");
        await conexión.query("SET time_zone = '-03:00'");
        logToPage(`Verificando que sea fuera de la  disponibilidad del profesional con email ${emailProfesional}`);
        const [disponiblesAhora] = await conexión.query(`
                  SELECT *
                  FROM disponibilidad d
                  JOIN usuario u ON d.profesional_ID = u.ID
                  WHERE u.email = ?
                  AND LOWER(d.dia_semana) = LOWER(DAYNAME(CURDATE()))
                  AND CURTIME() BETWEEN d.hora_inicio AND d.hora_fin
                `, [emailProfesional]);



        let turnoExistente;
        if (disponiblesAhora.length === 0) {
            logToPage(`El profesional con email ${emailProfesional} no esta dentro del rango de disponibilidad.`);
            logToPage(`Verificando si ya existe un turno para el profesional con email ${emailProfesional}`);
            [turnoExistente] = await conexión.query(
                "SELECT * FROM turno t JOIN usuario u ON u.ID = t.profesional_ID WHERE u.email = ? AND fecha = CURDATE() AND CURTIME() BETWEEN t.hora_inicio AND t.hora_fin",
                [emailProfesional]
            );
        } else {
            logErrorToPage(`El profesional con email ${emailProfesional} tiene disponibilidad ahora mismo. no es necesario crear un turno express.`);
            return res.status(400).json({
                message: "El profesional SÍ tiene disponibilidad en ese horario. no es necesario crear un turno express.",
                result: false
            });
        }

        const [profesionalRows] = await conexión.query("SELECT ID, nombre, apellido FROM usuario WHERE email = ?", [emailProfesional]);

        if (turnoExistente.length > 0) {
            logErrorToPage(`Ya existe un turno para el profesional con email ${emailProfesional} en este momento.`);
            return res.status(400).json({
                message: "Ya existe un turno en este momento actual.",
                result: false
            });
        }
        // Insertar el nuevo turno
        logToPage(`Creando nuevo turno para el usuario ${user.email} con el profesional ${emailProfesional} en este momento. (ESTADO PENDIENTE A LA ESPERA DE RESPUESTA DEL PROFESIONAL)`);


        const [reserva] = await conexión.query(
            "INSERT INTO turno (paciente_ID, profesional_ID, fecha, hora_inicio, hora_fin, tipo, estado) VALUES (?, ?, CURDATE(), CURTIME(), CURTIME() + INTERVAL 30 MINUTE, 'Express', 'pendiente')",
            [user.id, profesionalRows[0].ID]
        );

        if (reserva.affectedRows === 1) {
            logToPage(`Turno creado exitosamente con ID ${reserva.insertId}, a la espera de confirmación del profesional.`);

            logToPage("Enviando solicitud de confirmación al profesional.");
            enviarMailSolicitudExpress(emailProfesional, user.name, profesionalRows[0]);
            res.status(201).json({
                message: "Turno express creado exitosamente, esperando respuesta del profesional:" + profesionalRows[0].nombre + " " + profesionalRows[0].apellido,
                turnoId: reserva.insertId,
                result: true
            });
        }

        await conexión.commit();
    } catch (error) {
        await conexión.rollback();
        logErrorToPage("Error al crear turno express:", error);
        res.status(500).json({
            message: "Error al crear turno express: " + error.message,
            result: false
        });
    } finally {
        await conexión.release();
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
 * /confirmarTurnoExpress:
 *   put:
 *     tags:
 *       - CRUD Turnos
 *     summary: "Actualizar estado del turno express a confirmado"
 *     description: "Actualiza el estado de un turno express existente a confirmado (requiere autenticación profesional)"
 *     parameters:
 *       - in: body
 *         name: body
 *         description: "ID del turno a confirmar"
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
 *         description: "Turno confirmado exitosamente"
 *       404:
 *         description: "Turno no encontrado"
 *       500:
 *         description: "Error al confirmar turno"
 */
router.put("/confirmarTurnoExpress", authMiddleware, async (req, res) => {
    const conexión = await pool.getConnection();
    try {
        const user = req.user; // Usuario autenticado
        const { turnoId } = req.body;
        const [rows] = await pool.query("SELECT u.ID, u.email, u.nombre, u.apellido, t.hora_inicio, DATE_FORMAT(t.fecha, '%d-%m-%Y') AS fecha FROM turno t JOIN usuario u ON t.profesional_ID = u.ID WHERE t.ID = ? AND t.profesional_ID = ?", [turnoId, user.id]);

        if (rows.length === 0) {
            logErrorToPage(`El turno con ID ${turnoId} no existe o no pertenece al usuario con email ${user.email}`);
            return res.status(404).json({
                message: "Turno no encontrado para confirmar",
                result: false
            });
        }

        logToPage("Generando pago relacionado al turno en PENDIENTE.")

        const [pago] = await conexión.query("INSERT INTO pago (turno_ID, monto, estado) VALUES (?,(SELECT valorConsultaExpress FROM profesional WHERE ID = ?), 'pendiente')", [turnoId, user.id]);

        if (pago.affectedRows === 1) {
            logToPage(`Pago generado exitosamente con ID ${pago.insertId}`);
        } else {
            conexión.rollback();
            logErrorToPage(`Error al generar pago para el turno ID ${reserva.insertId}`);
        }

        const [paciente] = await pool.query("SELECT nombre, email FROM usuario WHERE id = (SELECT paciente_ID FROM turno WHERE id = ?)", [turnoId]);

        // Confirmar el turno de la base de datos
        const [result] = await conexión.query("UPDATE turno SET estado = 'confirmado' WHERE id = ? AND profesional_ID = ?", [turnoId, user.id]);



        await conexión.commit();
        if (result.changedRows === 1) {
            logToPage(`Turno con ID ${turnoId} confirmado exitosamente para el usuario con email ${user.email}`);
            enviarMailConfirmacionTurnoExpress(paciente[0].email, paciente[0].nombre, user.name);
            res.status(200).json({
                message: "Turno confirmado exitosamente",
                result: true
            });
        } else {
            conexión.rollback();
            logErrorToPage(`No se pudo encontrar el turno con ID ${turnoId} para el usuario con email ${user.email}`);
            res.status(404).json({
                message: "Turno no encontrado",
                result: false
            });
        }
    } catch (error) {
        conexión.rollback();
        logErrorToPage("Error al confirmar el turno:", error);
        res.status(500).json({
            message: "Error al confirmar el turno: " + error.message,
            result: false
        });
    }finally {
        await conexión.release();
    }
});









export default router;