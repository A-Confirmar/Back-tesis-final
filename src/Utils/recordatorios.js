import { enviarMailRecordatorioTurno } from "./mailer.js"
import pool from "../db.js";
import schedule from "node-schedule";

// RECORDATORIO DE TURNO 1 HORA ANTES
export const recordatorioDeTurno = async (nombrePaciente, emailPaciente, profesionalRows, fecha, hora_inicio, turnoId) => {
    try {
        const jobName = `recordatorio-${turnoId}`;
        const fechaTurno = new Date(`${fecha}T${hora_inicio}`);
        const fechaRecordatorio = new Date(fechaTurno.getTime() - 60 * 60 * 1000); // 1h antes

        // Recordatorio por mail
        const job = schedule.scheduleJob(jobName, fechaRecordatorio, async () => {
            try {
                await enviarMailRecordatorioTurno(emailPaciente, nombrePaciente, profesionalRows);
                console.log(`📧 Recordatorio enviado a ${emailPaciente} para el turno a las ${hora_inicio} del ${fecha}`);
            } catch (error) {
                console.error("❌ Error al enviar el recordatorio:", error);
            }
        });

                // Eliminación cambio de estado del turno
        const jobEstadoFinalizado = schedule.scheduleJob(`${jobName}-EstadoFinalizado`, fechaTurno, async () => {
            try {
                const [result] = await pool.query("UPDATE Turno SET estado = 'finalizado' WHERE ID = ?", [turnoId]);
                if (result.affectedRows > 0) {
                    console.log(`🔄 Turno ${turnoId} cambio si estado de pendiente a finalizado automáticamente (paciente ${emailPaciente})`);
                } else {
                    console.warn(`⚠️ No se encontró el turno ${turnoId} para cambiar su estado automáticamente`);
                }
            } catch (error) {
                console.error("❌ Error al cambiar el estado del turno automáticamente:", error);
            }
        });


        if (job) {
            console.log(`🕒 Recordatorio programado para ${job.nextInvocation()}`);
        } else {
            console.error("⚠️ No se pudo programar el recordatorio");
        }

    } catch (error) {
        console.error("❌ Error al programar el recordatorio:", error);
    }
};

export const cancelarRecordatorioDeTurno = (turnoId) => {
    const jobName = `recordatorio-${turnoId}`;
    const job = schedule.scheduledJobs[jobName];
    const jobestado = schedule.scheduledJobs[jobName+"-EstadoFinalizado"];
    if (job) {
        job.cancel();
        jobestado.cancel();
        console.log(`Recordatorio y estado finalizado para el turno ${turnoId} ha sido cancelado.`);
        return true;
    } else {
        console.log(`No se encontró un recordatorio programado para el turno ${turnoId}.`);
        return false;
    }
}




