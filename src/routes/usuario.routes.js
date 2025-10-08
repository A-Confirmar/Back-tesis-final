import config from "../config.js"
import { Router } from "express";
const router = Router();
import pool from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authMiddleware } from "../middleware/auth.js";
import { enviarMailRegistro } from "../Utils/mailer.js";


/**
 * @swagger
 * /obtenerUsuario:
 *   post:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Obtener datos públicos del usuario autenticado"
 *     description: "Devuelve los datos públicos del usuario autenticado. Requiere token en el body."
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
 *         description: "Datos del usuario obtenidos correctamente"
 *         content:
 *           application/json:
 *             example:
 *               user:
 *                 email: "usuario@mail.com"
 *                 nombre: "Juan"
 *                 apellido: "Pérez"
 *                 telefono: "2995555555"
 *                 fecha_nacimiento: "01-01-2000"
 *                 especialidad: "Cardiología"
 *                 descripcion: "Médico cardiólogo"
 *                 calificacion_promedio: 4.5
 *                 rol: "profesional"
 *               result: true
 *       401:
 *         description: "Token inválido o no enviado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Token requerido"
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
router.get("/obtenerUsuario", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Obtener el ID del usuario del token
    const sql = `
    SELECT 
    u.email,
    u.nombre,
    u.apellido,
    u.telefono,
    DATE_FORMAT(u.fecha_nacimiento, '%d-%m-%Y') AS fecha_nacimiento,
    p.especialidad,
    p.descripcion,
    p.calificacion_promedio,
    CASE
    WHEN p.ID IS NOT NULL THEN 'profesional'
    WHEN pa.ID IS NOT NULL THEN 'paciente'
    WHEN a.ID IS NOT NULL THEN 'administrador'
    ELSE 'sin_rol'
    END AS rol
    FROM Usuario u
    LEFT JOIN Profesional p   ON u.ID = p.ID
    LEFT JOIN Paciente pa     ON u.ID = pa.ID
    LEFT JOIN Administrador a ON u.ID = a.ID
    WHERE u.ID = ?;
    `;

    const [result] = await pool.query(sql, [userId]);
    if (result === undefined) {
      console.log("Error al obtener el usuario: ", result);
      return res.status(500).json({ message: "Error al obtener el usuario", result: false });
    }
    if (result.length === 0) {
      console.log("Usuario no encontrado con ID: ", userId);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }
    console.log("Usuario obtenido: ", result[0]);
    res.status(200).json({ user: result[0], result: true });
  } catch (error) {
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /logIn:
 *   post:
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
      console.log("Usuario no encontrado con email: ", email);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      console.log("Contraseña incorrecta para el usuario: ", email);
      return res.status(401).json({ message: "Credenciales inválidas", result: false }); // contraseña incorrecta
    }

    const token = jwt.sign({
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].nombre
    }, config.SECRETO, { expiresIn: "1h" });

    // Guardar un token JWT en una cookie
    // res.cookie('token', token, {
    //   httpOnly: true,      // Solo accesible por el backend (recomendado para JWT)
    //   secure: true,        // Solo se envía por HTTPS (en producción)
    //   sameSite: 'strict',  // Protección CSRF
    //   maxAge: 60 * 60 * 1000 // 1 hora en milisegundos
    // });

    console.log("Usuario logueado correctamente: ", email);
    return res.status(200).json({ token: token, message: "Usuario logueado", result: true })
  } catch (error) {
    console.error("Error en /logIn: ", error);
    res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /register:
 *   post:
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               apellido:
 *                 type: string
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *               telefono:
 *                 type: integer
 *               rol:
 *                 type: string
 *                 enum: [profesional, paciente, administrador]
 *               especialidad:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               calificacionPromedio:
 *                 type: number
 *           examples:
 *             profesional:
 *               summary: "Ejemplo de registro de profesional"
 *               value:
 *                 nombre: "Laura"
 *                 apellido: "García"
 *                 email: "laura@mail.com"
 *                 password: "password123"
 *                 fecha_nacimiento: "1985-05-20"
 *                 telefono: 2995551111
 *                 rol: "profesional"
 *                 especialidad: "Cardiología"
 *                 descripcion: "Médica cardióloga con 10 años de experiencia"
 *                 calificacionPromedio: 4.5
 *             paciente:
 *               summary: "Ejemplo de registro de paciente"
 *               value:
 *                 nombre: "Martín"
 *                 apellido: "Pérez"
 *                 email: "martin@mail.com"
 *                 password: "mypassword"
 *                 fecha_nacimiento: "1995-09-10"
 *                 telefono: 2995552222
 *                 rol: "paciente"
 *             administrador:
 *               summary: "Ejemplo de registro de administrador"
 *               value:
 *                 nombre: "Sofía"
 *                 apellido: "López"
 *                 email: "sofia@mail.com"
 *                 password: "adminpass"
 *                 fecha_nacimiento: "1990-03-15"
 *                 telefono: 2995553333
 *                 rol: "administrador"
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
router.post("/register", async (req, res) => {
  const connection = await pool.getConnection();
  //chequeo de que el email no esté ya en uso
  try {
    const { email, password, nombre, apellido, fecha_nacimiento, telefono, rol, especialidad, descripcion, calificacionPromedio } = req.body;

    const [resultSelect] = await connection.query("SELECT * FROM Usuario WHERE email = ?", [email]);
    if (resultSelect.length > 0) {
      console.log("Email ya en uso: ", email);
      return res.status(400).json({ message: "El email ya está en uso", result: false }); //mail repetido
    }
    if (!email || !password || !nombre || !apellido || !fecha_nacimiento || !telefono) {
      console.log("Faltan datos obligatorios para el registro");
      return res.status(400).json({ message: "Faltan datos obligatorios", result: false }); // campos incompletos
    }

    if (password.length < 6) {
      console.log("Contraseña débil, menos de 6 caracteres");
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres", result: false }); // contraseña débil
    }

    //hasheo de la contraseña y almacenamiento
    console.log("Hasheando... 😶‍🌫️");
    const hashedPassword = await bcrypt.hashSync(password, Number(config.SALT));

    await connection.beginTransaction();

    const [result] = await connection.query(
      "INSERT INTO Usuario (nombre, email, password, apellido, fecha_nacimiento, telefono) VALUES (?, ?, ?, ?, ?, ?)", [nombre, email, hashedPassword, apellido, fecha_nacimiento, telefono] // almaceno la contraseña hasheada
    );

    const usuarioId = result.insertId;

    if (rol === "profesional") {
      await connection.query(
        "INSERT INTO Profesional (ID, especialidad, descripcion, calificacion_promedio) VALUES (?, ?, ?, ?)",
        [usuarioId, especialidad, descripcion, calificacionPromedio || 0]
      );
    } else if (rol === "paciente") {
      await connection.query(
        "INSERT INTO Paciente (ID) VALUES (?)",
        [usuarioId]
      );
    } else if (rol === "admin") {
      await connection.query(
        "INSERT INTO Administrador (ID) VALUES (?)",
        [usuarioId]
      );
    } else {
      throw new Error("Rol inválido");
    }

    await connection.commit();
    res.status(201).json({ message: "Usuario creado exitosamente", result: true }); //201 Created
    console.log("Usuario registrado: ", email);
    enviarMailRegistro(email, nombre).catch(err => console.error("Error al enviar mail de registro: ", err));
  } catch (error) {
    console.error("Error en al registrar: ", error);
    await connection.rollback();
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  } finally {
    connection.release();
  }
});

/**
 * @swagger
 * /update:
 *   put:
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
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { nombre, email, password, apellido, fecha_nacimiento, telefono } = req.body;

    if (!email || !password || !nombre || !apellido || !fecha_nacimiento || !telefono) {
      console.log("Faltan datos obligatorios para la actualización");
      return res.status(400).json({ message: "Faltan datos obligatorios", result: false }); // campos incompletos
    }

    if (password.length < 6) {
      console.log("Contraseña débil, menos de 6 caracteres para la actualización");
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres", result: false }); // contraseña débil
    }

    console.log("Hasheando para actualización... 😶‍🌫️");
    const hashedPassword = await bcrypt.hashSync(password, Number(config.SALT));

    const token = jwt.sign({
      id: req.user.id,
      email: email,
      name: nombre
    }, config.SECRETO, { expiresIn: "1h" });

    const [result] = await pool.query(
      "UPDATE Usuario SET nombre = ?, email = ?, password = ?, apellido = ?, fecha_nacimiento = ?, telefono = ? WHERE email = ?",
      [nombre, email, hashedPassword, apellido, fecha_nacimiento, telefono, req.user.email]
    );
    if (result.affectedRows === 0) {
      console.log("Usuario no encontrado para actualización: ", req.user.email);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }
    console.log("Usuario actualizado: ", email);
    res.status(200).json({ nuevoToken: token, message: "Usuario actualizado correctamente", result: true });
  } catch (error) {
    console.error("Error en /update: ", error);
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
    console.log("Intentando eliminar usuario: ", req.user.email);
    const [result] = await pool.query("DELETE FROM Usuario WHERE email = ?", [req.user.email]);
    if (result.affectedRows === 0) {
      console.log("Usuario no encontrado: ", req.user.email);
      return res
        .status(404)
        .json({ message: "Usuario no encontrado", result: false });
    }
    res
      .status(200)
      .json({ message: "Usuario eliminado correctamente", result: true });
    console.log("Usuario eliminado: ", req.user.email);
  } catch (error) {
    console.error("Error en /borrarUsuario: ", error);
    return res
      .status(500)
      .json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /buscarProfesional:
 *   get:
 *     tags:
 *       - Profesionales
 *     summary: "Buscar profesionales"
 *     description: "Busca profesionales por nombre o especialidad."
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
 *               leyenda:
 *                 type: string
 *                 example: "psicologo"
 *     responses:
 *       200:
 *         description: "Profesionales encontrados"
 *         content:
 *           application/json:
 *             example:
 *               message: "Profesionales encontrados"
 *               result: true
 *               data: [
 *                 {
 *                   "nombre": "German",
 *                   "ID": 11,
 *                   "especialidad": "psicologo",
 *                   "descripcion": "Soy un re psicologo",
 *                   "calificacion_promedio": "7.00"
 *                 },
 *                 {
 *                   "nombre": "Roma",
 *                   "ID": 12,
 *                   "especialidad": "Medica",
 *                   "descripcion": "Soy una re medica",
 *                   "calificacion_promedio": "9.00"
 *                 }
 *               ]
 *       404:
 *         description: "No se encontraron profesionales"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se encontraron profesionales"
 *               result: false
 *       400:
 *         description: "Falta la leyenda del profesional"
 *         content:
 *           application/json:
 *             example:
 *               message: "Falta la leyenda del profesional"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.get("/buscarProfesional", authMiddleware, async(req, res) => {
  try{
  const { leyenda } = req.body;

  if (!leyenda) {
    console.log("Falta la leyenda del profesional en la búsqueda🧟‍♂️");
    return res.status(400).json({ message: "Falta la leyenda del profesional", result: false });
  }

  const [result] = await pool.query("SELECT u.nombre, u.apellido, u.email, p.especialidad, p.descripcion, p.calificacion_promedio FROM Profesional p JOIN Usuario u ON u.ID = p.ID WHERE u.nombre LIKE ? OR p.especialidad LIKE ?", [`%${leyenda}%`, `%${leyenda}%`]);
  if (result.length === 0) {
    console.log("No se encontraron profesionales para la leyenda: ", leyenda);
    return res.status(404).json({ message: "No se encontraron profesionales", result: false });
  }

  console.log("Profesionales encontrados para la leyenda: ", leyenda);
  res.status(200).json({ message: "Profesionales encontrados", result: true, data: result });
  } catch (error) {
    console.error("Error en /buscarProfesional: ", error);
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

export default router;
