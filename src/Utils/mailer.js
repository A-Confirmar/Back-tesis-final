import nodemailer from 'nodemailer';
import config from '../config.js';
import jwt from 'jsonwebtoken';

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.GMAIL_USER,
        pass: config.GMAIL_PASS
    }
});

const header = `
  <div style="background: linear-gradient(90deg, #0a3d91 0%, #1976d2 100%); padding: 24px 0; text-align: center;">
    <img src="https://raw.githubusercontent.com/A-Confirmar/MediTurnos/refs/heads/main/src/assets/icono-MediTurnos.png" alt="MediTurnos" style="height: 40px; margin-bottom: 8px;" />
    <h1 style="color: #fff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px; margin: 0;">MediTurnos</h1>
  </div>
`;

const footer = `
  <div style="background: #f5f5f5; color: #1976d2; text-align: center; padding: 18px 0; font-size: 14px; font-family: 'Segoe UI', Arial, sans-serif;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} MediTurnos. Todos los derechos reservados.</p>
    <p style="margin: 0; color: #888;">Este correo fue enviado automáticamente, por favor no responder.</p>
  </div>
`;



// Función para enviar mail de recuperación
export async function enviarMailRecuperar(to) {
    // Generar token de recuperación con expiración de 1 hora
    const resetToken = jwt.sign(
        { email: to, purpose: 'password_reset' },
        config.SECRETO,
        { expiresIn: '1h' }
    );

    const resetUrl = `${config.FRONTEND_URL}?token=${resetToken}`;
    
    return transporter.sendMail({
        from: '"MediTurnos" <MediTurnos@gmail.com>',
        to,
        subject: "Recupera tu contraseña",
        html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
    <div style="margin-bottom:16px; text-align:center; font-size:18px;">
        <p>Haz click aquí para recuperar tu contraseña: <a href="${resetUrl}" style="background:#1976d2; color:#fff; padding:12px 24px; text-decoration:none; border-radius:4px; display:inline-block; margin-top:10px;">Recuperar contraseña</a></p>
        <p style="color:#888; font-size:14px; margin-top:20px;">Este enlace expirará en 1 hora.</p>
    </div>
  </div>${footer}`
    });
}



// Función para enviar mail de registro exitoso
export async function enviarMailRegistro(to, nombre) {
    return transporter.sendMail({
        from: '"MediTurnos" <MediTurnos@gmail.com>',
        to,
        subject: "Registro exitoso en MediTurnos",
        html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
        <div style="margin-bottom:16px; text-align:center; font-size:18px;">
            <b>Hola ${nombre}, tu registro en MediTurnos ha sido exitoso.</b>
        </div>
    </div>${footer}`
    });
}

// Función para enviar mail de recordatorio de turno
export async function enviarMailRecordatorioTurno(to, nombrePaciente, profesionalRows) {
  return transporter.sendMail({
      from: '"MediTurnos" <MediTurnos@gmail.com>',
      to,
      subject: `TURNO CON ${profesionalRows.nombre} ${profesionalRows.apellido} EN 1 HORA`, 
      html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
      <div style="margin-bottom:16px; text-align:center; font-size:18px;">
          <b>Hola ${nombrePaciente}, Tu turno comienza en 1 hora con el profesional ${profesionalRows.nombre} ${profesionalRows.apellido}.</b>
      </div>
  </div>${footer}`
  });
}


// Función para enviar mail de confirmacion de turno
export async function enviarMailConfirmacionTurno(to, nombrePaciente, profesionalRows, hora_inicio, fecha) {
  return transporter.sendMail({
      from: '"MediTurnos" <MediTurnos@gmail.com>',
      to,
      subject: `CONFIRMACIÓN DE TURNO CON ${profesionalRows.nombre} ${profesionalRows.apellido}`, 
      html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
      <div style="margin-bottom:16px; text-align:center; font-size:18px;">
          <b>Hola ${nombrePaciente}, Tu turno ha sido confirmado con el profesional ${profesionalRows.nombre} ${profesionalRows.apellido}.</b> <br/>
          <b>Su turno es el dia ${fecha} a las ${hora_inicio}.</b>
      </div>
  </div>${footer}`
  });
}

// Función para enviar mail CANCELACION de turno
export async function enviarMailCancelacionTurno(to, nombrePaciente, nombreProfesional, apellidoProfesional, hora_inicio, fecha) {
  return transporter.sendMail({
      from: '"MediTurnos" <MediTurnos@gmail.com>',
      to,
      subject: `CANCELACIÓN DE TURNO CON ${nombrePaciente}`, 
      html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
      <div style="margin-bottom:16px; text-align:center; font-size:18px;">
          <b>Hola ${nombreProfesional} ${apellidoProfesional}, ${nombrePaciente} canceló su turno de las ${hora_inicio} el dia ${fecha}.</b> <br/>
      </div>
  </div>${footer}`
  });
}



export async function enviarMailSolicitudExpress(to, nombrePaciente, profesionalRows) {
  return transporter.sendMail({
      from: '"MediTurnos" <MediTurnos@gmail.com>',
      to,
      subject: `SOLICITUD DE TURNO EXPRESS CON ${nombrePaciente}`, 
      html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
      <div style="margin-bottom:16px; text-align:center; font-size:18px;">
          <b>Hola ${profesionalRows.nombre} ${profesionalRows.apellido}, ${nombrePaciente} ha solicitado un turno express con usted.</b> <br/>
          <b>Por favor, revise su agenda para confirmar o denegar la solicitud.</b> <br/>
          <a href="http://localhost:5173/profesional/turnos-express" style="color: #FFFFFF; border:1px solid #1a73e8; padding:8px 12px; text-decoration:none; border-radius:4px; margin-top:12px; display:inline-block; background-color: #0432ffff;">Ver</a> <br/>
          </div>
          </div>${footer}`
        });
      }
      
      
      
      export async function enviarMailConfirmacionTurnoExpress(to, nombre, fecha, hora_inicio) {
        return transporter.sendMail({
          from: '"MediTurnos" <MediTurnos@gmail.com>',
          to,
          subject: `CONFIRMACIÓN DE TURNO EXPRESS`, 
          html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
          <div style="margin-bottom:16px; text-align:center; font-size:18px;">
          <b>Hola ${nombre}, su turno express ha sido confirmado.</b> <br/>
          <b>El dia ${fecha} a las ${hora_inicio}.</b> <br/>
          
          </div>
          </div>${footer}`
        });
      }
      
      export async function enviarMailEsperaTurnoExpress(to, nombrePaciente, nombreProfesional, fecha, hora_inicio, hora_fin) {
        return transporter.sendMail({
          from: '"MediTurnos" <MediTurnos@gmail.com>',
          to,
          subject: `TURNO EXPRESS CON ${nombreProfesional} EN ESPERA DE CONFIRMACIÓN`, 
          html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
          <div style="margin-bottom:16px; text-align:center; font-size:18px;">
          <b>Hola ${nombrePaciente}, su turno express ha sido aceptado por el profesional ${nombreProfesional} ahora mismo.</b> <br/>
          <b>Su turno es el dia ${fecha} de ${hora_inicio} a ${hora_fin}.</b> <br/>
          <b>Para poder confirmarlo, debe ingresar a su agenda de turnos y confirmar el mismo.</b> <br/>
          <a href="http://localhost:5173/mis-turnos" style="color: #FFFFFF; border:1px solid #1a73e8; padding:8px 12px; text-decoration:none; border-radius:4px; margin-top:12px; display:inline-block; background-color: #0432ffff;">Ver</a> <br/>

      </div>
  </div>${footer}`
  });
}
