import config from "../config.js"
import { Router } from "express";
const router = Router();
import pool from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authMiddleware } from "../middleware/auth.js";



/**
 * @swagger
 * /logIn:
 *   get:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Logeo de usuario"
 *     description: "Loguea un usuario existente y genera un token JWT."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "Pepito.Milano@gmail.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: "Usuario logueado"
 *         content:
 *           application/json:
 *             example:
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               message: "Usuario logueado"
 *               result: true
 *       401:
 *         description: "Credenciales inválidas"
 *         content:
 *           application/json:
 *             example:
 *               message: "Credenciales inválidas"
 *               result: false
 *       404:
 *         description: "Usuario no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario no encontrado"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.post("/logIn", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(`SELECT id, email, password FROM Usuario WHERE email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas", result: false }); // contraseña incorrecta
    }

    const token = jwt.sign({
      email: rows[0].email,
      name: rows[0].nombre
    }, config.secreto, { expiresIn: "1h" });

    // Guardar un token JWT en una cookie
    // res.cookie('token', token, {
    //   httpOnly: true,      // Solo accesible por el backend (recomendado para JWT)
    //   secure: true,        // Solo se envía por HTTPS (en producción)
    //   sameSite: 'strict',  // Protección CSRF
    //   maxAge: 60 * 60 * 1000 // 1 hora en milisegundos
    // });

    return res.status(200).json({ token: token, message: "Usuario logueado", result: true })
  } catch (error) {
    res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /register:
 *   put:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Crear un nuevo usuario"
 *     description: "Crea un nuevo usuario en la base de datos."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan"
 *               email:
 *                 type: string
 *                 example: "juan@mail.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               apellido:
 *                 type: string
 *                 example: "Pérez"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-01"
 *               telefono:
 *                 type: integer
 *                 example: 2995555555
 *     responses:
 *       201:
 *         description: "Usuario creado exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario creado exitosamente"
 *               result: true
 *       400:
 *         description: "Error al crear usuario"
 *         content:
 *           application/json:
 *             example:
 *               message: "El email ya está en uso"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.put("/register", async (req, res) => {
  //chequeo de que el email no esté ya en uso
  try {
    const { email, password, nombre, apellido, fecha_nacimiento, telefono } = req.body;
		
    const [resultSelect] = await pool.query("SELECT * FROM Usuario WHERE email = ?", [email]);
    if (resultSelect.length > 0) {
      return res.status(400).json({ message: "El email ya está en uso", result: false }); //mail repetido
    }
    if (!email || !password || !nombre || !apellido || !fecha_nacimiento || !telefono) {
      return res.status(400).json({ message: "Faltan datos obligatorios", result: false }); // campos incompletos
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres", result: false }); // contraseña débil
    }

    //hasheo de la contraseña y almacenamiento
    const hashedPassword = await bcrypt.hashSync(password, Number(config.salt));
    const [result] = await pool.query(
      "INSERT INTO Usuario (nombre, email, password, apellido, fecha_nacimiento, telefono) VALUES (?, ?, ?, ?, ?, ?)", [nombre, email, hashedPassword, apellido, fecha_nacimiento, telefono] // almaceno la contraseña hasheada
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Error al crear usuario", result: false });
    }
    res.status(201).json({ message: "Usuario creado exitosamente", result: true }); //201 Created
  } catch (error) {
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /update:
 *   post:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Actualizar un usuario"
 *     description: "Actualiza los datos del usuario autenticado. Requiere autenticación."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               nombre:
 *                 type: string
 *                 example: "Juan"
 *               email:
 *                 type: string
 *                 example: "juan@mail.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               apellido:
 *                 type: string
 *                 example: "Pérez"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-01"
 *               telefono:
 *                 type: integer
 *                 example: 2995555555
 *     responses:
 *       200:
 *         description: "Usuario actualizado correctamente"
 *         content:
 *           application/json:
 *             example:
 *               nuevoToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               message: "Usuario actualizado correctamente"
 *               result: true
 *       400:
 *         description: "Faltan datos obligatorios o contraseña débil"
 *         content:
 *           application/json:
 *             example:
 *               message: "Faltan datos obligatorios"
 *               result: false
 *       404:
 *         description: "Usuario no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario no encontrado"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.post("/update", authMiddleware, async (req, res) => {
  try {
    const { nombre, email, password, apellido, fecha_nacimiento, telefono } = req.body;

    if (!email || !password || !nombre || !apellido || !fecha_nacimiento || !telefono) {
      return res.status(400).json({ message: "Faltan datos obligatorios", result: false }); // campos incompletos
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres", result: false }); // contraseña débil
    }

    const hashedPassword = await bcrypt.hashSync(password, Number(config.salt));

    const token = jwt.sign({
      email: email,
      name: nombre
    }, config.secreto, { expiresIn: "1h" });

    const [result] = await pool.query(
      "UPDATE Usuario SET nombre = ?, email = ?, password = ?, apellido = ?, fecha_nacimiento = ?, telefono = ? WHERE email = ?",
      [nombre, email, hashedPassword, apellido, fecha_nacimiento, telefono, req.user.email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }
    res.status(200).json({ nuevoToken: token, message: "Usuario actualizado correctamente", result: true });
  } catch (error) {
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /borrarUsuario:
 *   delete:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Eliminar un usuario"
 *     description: "Elimina el usuario autenticado. Requiere autenticación."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Usuario eliminado correctamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario eliminado correctamente"
 *               result: true
 *       404:
 *         description: "Usuario no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario no encontrado"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.delete("/borrarUsuario", authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM Usuario WHERE email = ?", [req.user.email]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Usuario no encontrado", result: false });
    }
    res
      .status(200)
      .json({ message: "Usuario eliminado correctamente", result: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

export default router;
