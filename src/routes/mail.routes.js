import { Router } from "express";
const router = Router();
import { enviarMailRecuperar } from "../Utils/mailer.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";


/**
 * @swagger
 * /enviarMailRecuperarClave:
 *   post:
 *     tags:
 *       - Mails
 *     summary: "Enviar correo de recuperación de contraseña con token único"
 *     description: "Envía un correo de recuperación de contraseña al usuario con un enlace que contiene un token JWT de un solo uso válido por 1 hora."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "usuario@example.com"
 *                 description: "Email del usuario"
 *     responses:
 *       200:
 *         description: "Correo enviado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Correo de recuperación enviado"
 *               result: true
 *       500:
 *         description: "Error al enviar el correo"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al enviar correo"
 *               error: "Detalles del error"
 *               result: false
 */
router.post("/enviarMailRecuperarClave", (req, res) => {
  try {
    const { email } = req.body;
    enviarMailRecuperar(email)
      .then(() => {
        logToPage(`Correo de recuperación enviado a ${email}`);
        res.status(200).json({ message: "Correo de recuperación enviado", result: true });
      });
  } catch (error) {
      logErrorToPage("Error al enviar correo:"+ error);
      res.status(500).json({ message: "Error al enviar correo", error, result: false});
  }
});


export default router;