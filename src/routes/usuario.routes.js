import { Router } from "express";
const router = Router();
import pool from "../db.js";

/**
 * @swagger
 *   /usuarios:
 *   get:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Obtener usuario por EMAIL"
 *     description: >
 *       Permite buscar un usuario específico en la base de datos utilizando su email como parámetro de consulta.
 *       Retorna los datos completos del usuario si existe.
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
 *     responses:
 *       200:
 *         description: "Usuario encontrado"
 *         content:
 *           application/json:
 *             example:
 *               usuario:
 *                 - ID: 2
 *                   email: "Pepito.Milano@gmail.com"
 *                   password: "1234"
 *                   nombre: "Pepito"
 *                   apellido: "Milano"
 *                   fecha_nacimiento: "1995-08-25"
 *                   telefono: "2995527895"
 *               message: "Usuario encontrado"
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
 *               message: "Error interno del servidor"
 *               result: false
 */
router.get("/usuarios", async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await pool.query(`SELECT * FROM Usuario WHERE email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }
    return res.status(200).json({ usuario: rows, message: "Usuario encontrado", result: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor", result: false });
  }
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Crear un nuevo usuario"
 *     description: "Crea un nuevo usuario en la base de datos"
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
 *                 example: "1234"
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
 *       204:
 *         description: "Usuario creado correctamente"
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               message: "Usuario creado correctamente"
 *               result: true
 *       400:
 *         description: "Error al crear usuario"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al crear usuario"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.post("/usuarios/", async (req, res) => {
  try {
    const { email, password, nombre, apellido, fecha_nacimiento, telefono } =
      req.body;
    const [result] = await pool.query(
      "INSERT INTO Usuario (nombre, email, password, apellido, fecha_nacimiento, telefono) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, email, password, apellido, fecha_nacimiento, telefono]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "Error al crear usuario", result: false });
    }
    res.status(201).json({ id: result.insertId, message: "Usuario creado exitosamente", result: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Algo salió mal: " + error, result: false });
  }
});

/**
 * @swagger
 * /usuarios:
 *   put:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Actualizar un usuario por ID"
 *     description: "Actualiza un usuario específico"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               nombre:
 *                 type: string
 *                 example: "Juan"
 *               email:
 *                 type: string
 *                 example: "juan@mail.com"
 *               password:
 *                 type: string
 *                 example: "1234"
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
 *       204:
 *         description: "Usuario actualizado correctamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario actualizado correctamente"
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
router.put("/usuarios", async (req, res) => {
  try {
    const { id } = req.body;
    const { nombre, email, password, apellido, fecha_nacimiento, telefono } =
      req.body;
    const [result] = await pool.query(
      "UPDATE Usuario SET nombre = ?, email = ?, password = ?, apellido = ?, fecha_nacimiento = ?, telefono = ? WHERE id = ?",
      [nombre, email, password, apellido, fecha_nacimiento, telefono, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado", result: false});
    }
  res.status(200).json({ message: "Usuario actualizado correctamente", result: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Algo salió mal: " + error, result: false });
  }
});

/**
 * @swagger
 * /usuarios:
 *   delete:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Eliminar un usuario por ID"
 *     description: "Elimina un usuario específico"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       204:
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
router.delete("/usuarios", async (req, res) => {
  try {
    const { id } = req.body;
    const [result] = await pool.query("DELETE FROM Usuario WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Usuario no encontrado", result: false });
    }
    res
      .status(200)
      .json({ message: "Usuario eliminado correctamente", result: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Algo salió mal: " + error, result: false });
  }
});

export default router;
