import nodemailer from 'nodemailer';
import config from '../config.js';

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
    return transporter.sendMail({
        from: '"MediTurnos" <MediTurnos@gmail.com>',
        to,
        subject: "Recupera tu contraseña",
        html: `${header}<div style="padding:32px 24px; font-family:'Segoe UI',Arial,sans-serif; color:#222;">
    <div style="margin-bottom:16px; text-align:center; font-size:18px;">
        <p>Haz click aquí para recuperar tu contraseña: <a href="https://mediturnos-eta.vercel.app/cambiarClave">Recupera contraseña</a></p>
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