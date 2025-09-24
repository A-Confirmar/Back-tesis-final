import { Router } from "express";
const router = Router();

import { authMiddleware } from "../middleware/auth.js";


/**
 * @swagger
 * /home:
 *   get:
 *     tags:
 *       - Home
 *     summary: "Zona segura (requiere autenticación)"
 *     description: "Devuelve información solo si el usuario está autenticado con JWT."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Acceso permitido"
 *         content:
 *           application/json:
 *             example:
 *               message: "Zona segura: usuario autenticado"
 *               user:
 *                 id: 1
 *                 email: "usuario@mail.com"
 *               result: true
 *       401:
 *         description: "Token inválido o no enviado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Token requerido"
 *               result: false
 */
// Ruta protegida, solo accesible con token válido
router.get("/home", authMiddleware, async (req, res) => {
    res.json({
      message: "Zona segura: usuario autenticado",
      user: req.user,
      result: true
    });
});









export default router;