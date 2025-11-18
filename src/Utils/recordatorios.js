import { enviarMailRecordatorioTurno } from "./mailer.js"
import pool from "../db.js";
import schedule from "node-schedule";
import { logErrorToPage, logToPage } from "./consolaViva.js";

// RECORDATORIO DE TURNO 1 HORA ANTES
export const recordatorioDeTurno = async (nombrePaciente, emailPaciente, profesionalRows, fecha, hora_inicio, turnoId) => {
    try {
        const jobName = `recordatorio-${turnoId}`;
        const [year, month, day] = fecha.split('-').map(Number);
        let [hours, minutes] = hora_inicio.split(':').map(Number);
        const seconds = 0;
        const fechaTurno = new Date(year, month - 1, day, hours, minutes, seconds);
        logToPage(`Fecha y hora del turno: ${fechaTurno}`);


        const fechaRecordatorio = new Date(fechaTurno.getTime() - 60 * 60 * 1000); // 1h antes

        // Recordatorio por mail
        const job = schedule.scheduleJob(jobName, fechaRecordatorio, async () => {
            try {

                await enviarMailRecordatorioTurno(emailPaciente, nombrePaciente, profesionalRows);
                logToPage(`📧 Recordatorio enviado a ${emailPaciente} para el turno a las ${hora_inicio} del ${fecha}`);

            } catch (error) {
                logErrorToPage("❌ Error al enviar el recordatorio:", error);
            }
        });

        // Actualizar estado del turno a 'realizado' automáticamente
        const jobEstadoRealizado = schedule.scheduleJob(`${jobName}-EstadoRealizado`, fechaTurno, async () => {
            try {
                await pool.query("DELETE FROM recordatorio WHERE turno_ID = ?", [turnoId]);
                logToPage(`Quitando recordatorio de la base de datos para el turno ${turnoId} ya que se está marcando como realizado.`);
                const [result] = await pool.query("UPDATE turno SET estado = 'realizado' WHERE ID = ?", [turnoId]);
                if (result.affectedRows > 0) {
                    logToPage(`🔄 Turno ${turnoId} cambio su estado de pendiente a realizado automáticamente (paciente ${emailPaciente})`);
                } else {
                    logToPage(`⚠️ No se encontró el turno ${turnoId} para cambiar su estado automáticamente`);
                }
            } catch (error) {
                logErrorToPage("❌ Error al cambiar el estado del turno automáticamente:", error);
            }
        });


        if (job) {
            const [recordatorioResult] = await pool.query("INSERT INTO recordatorio (turno_ID, fecha_envio, email, hora_envio, mensaje) VALUES (?, ?, ?, ?, ?)", [turnoId, fechaRecordatorio, emailPaciente, hora_inicio, jobName]);
            if (recordatorioResult.affectedRows > 0) {
                logToPage(`🕒 Recordatorio programado para ${job.nextInvocation()}`);
            } else {
                logErrorToPage(`❌ No se pudo registrar el recordatorio en la base de datos para el turno ${turnoId}`);
            }
        } else {
            logErrorToPage("⚠️ No se pudo programar el recordatorio");
        }

        if (jobEstadoRealizado) {
            logToPage(`🕒 Cambio de estado a realizado programado para ${jobEstadoRealizado.nextInvocation()}`);
        } else {
            logErrorToPage("⚠️ No se pudo programar el cambio de estado a realizado");
        }

    } catch (error) {
        logErrorToPage("❌ Error al programar el recordatorio:", error);
    }
};

export const cancelarRecordatorioDeTurno = async (turnoId) => {
    const jobName = `recordatorio-${turnoId}`;
    const job = schedule.scheduledJobs[jobName];
    const jobestado = schedule.scheduledJobs[jobName + "-EstadoRealizado"];
    if (job) {
        job.cancel();
        jobestado.cancel();
        await pool.query("DELETE FROM recordatorio WHERE turno_ID = ?", [turnoId]);
        logToPage(`Recordatorio y estado realizado para el turno ${turnoId} ha sido cancelado.`);
        return true;
    } else {
        logToPage(`No se encontró un recordatorio programado para el turno ${turnoId}.`);
        return false;
    }
};














export const cargarRecordatoriosPendientes = async () => {
    const conexion = await pool.getConnection();
    try {
        // Traer recordatorios futuros
        await conexion.query("SET time_zone = '-03:00'");
        const [rows] = await conexion.query(
            "SELECT r.turno_ID, r.email, r.hora_envio, r.fecha_envio, r.mensaje, t.fecha AS fecha_turno, t.estado, u.nombre AS nombrePaciente " +
            "FROM recordatorio r " +
            "JOIN turno t ON t.ID = r.turno_ID " +
            "JOIN usuario u ON u.ID = t.paciente_ID " +
            "WHERE r.fecha_envio > CURDATE() OR (r.fecha_envio = CURDATE() AND r.hora_envio >= CURTIME())"
        );
        const [curtime] = await conexion.query("SELECT NOW() AS ahora");
        logToPage(`⏰ Hora actual del sistema: ${curtime[0].ahora}`);
        await conexion.commit();
        await conexion.release();

        for (const r of rows) {
            // Fecha y hora del turno
            const fechaTurno = new Date(r.fecha_turno);
            // Hora de envío del recordatorio
            const [horas, minutos] = r.hora_envio.split(":").map(Number);
            fechaTurno.setHours(horas, minutos, 0);

            const fechaRecordatorio = new Date(fechaTurno.getTime() - 60 * 60 * 1000); // 1h antes

            // Programar recordatorio
            schedule.scheduleJob(`recordatorio-${r.turno_ID}`, fechaRecordatorio, async () => {
                try {
                    await enviarMailRecordatorioTurno(r.email, r.nombrePaciente, []);
                    logToPage(`📧 Recordatorio reenviado a ${r.email} para el turno a las ${r.hora_envio} del ${r.fecha_turno}`);
                } catch (err) {
                    logErrorToPage(err);
                }
            });

            // Programar cambio de estado
            schedule.scheduleJob(`recordatorio-${r.turno_ID}-EstadoRealizado`, fechaTurno, async () => {
                try {
                    await pool.query("UPDATE turno SET estado = 'realizado' WHERE ID = ?", [r.turno_ID]);
                    logToPage(`🔄 Turno ${r.turno_ID} marcado como realizado automáticamente`);
                    await pool.query("DELETE FROM recordatorio WHERE turno_ID = ?", [r.turno_ID]);
                } catch (err) {
                    logErrorToPage(err);
                }
            });
        }

        logToPage(`✅ Se cargaron ${rows.length} recordatorios pendientes desde la base de datos`);

    } catch (error) {
        logErrorToPage("❌ Error al cargar recordatorios pendientes:"+ error);
    }
};



