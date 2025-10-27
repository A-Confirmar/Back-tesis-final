import config from "../config.js"
import { Router } from "express";
const router = Router();
import pool from "../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authMiddleware } from "../middleware/auth.js";
import { enviarMailRegistro } from "../Utils/mailer.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";
import { uploadImage } from "../Utils/cloudinary.js";
import fs from "fs"; // para borrar el archivo temporal
import { upload } from "../Utils/multer.js";
import { log } from "console";

/**
 * @swagger
 * /obtenerListaDePacientesVinculados:
 *   get:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Obtener lista de pacientes vinculados"
 *     description: "Devuelve una lista de pacientes vinculados al profesional autenticado. Requiere autenticación."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: "Lista de pacientes obtenida exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Pacientes vinculados obtenidos"
 *               data:
 *                 - nombre: "Juan"
 *                   apellido: "Pérez"
 *                   email: "juan.perez@example.com"
 *                   fecha_nacimiento: "1990-01-01"
 *                   telefono: "123456789"
 *                   localidad: "Ciudad"
 *                   imagenPerfil: "https://example.com/image.jpg"
 *               result: true
 *       404:
 *         description: "No se encontraron pacientes vinculados"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se encontraron pacientes vinculados"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.get("/obtenerListaDePacientesVinculados", authMiddleware, async (req, res) => {
  try{
    const userId = req.user.id; // Obtener el ID del usuario del token
    const [result] = await pool.query(`SELECT u.nombre, u.apellido, u.email, u.fecha_nacimiento, u.telefono, u.localidad, u.imagenPerfil  FROM turno t join usuario u on u.ID = t.Paciente_ID WHERE t.profesional_ID = ? GROUP BY u.ID`,
       [userId]);
    if (result.length === 0 ) {
      logErrorToPage("No se encontraron pacientes vinculados para el profesional con ID: ", userId);
      return res.status(404).json({ message: "No se encontraron pacientes vinculados", result: false });

    }else{
      logToPage("Pacientes vinculados obtenidos para el profesional con ID: ", userId);
      res.status(200).json({ message: "Pacientes vinculados obtenidos", data: result, result: true });
    }

  }catch(error){
    logErrorToPage("Error en /obtenerListaDePacientesVinculados: ", error);
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
  
});

/**
 * @swagger
 * /obtenerUsuario:
 *   get:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Obtener datos públicos del usuario autenticado"
 *     description: "Devuelve los datos públicos del usuario autenticado. Requiere token en el headers."
 *     parameters:
 *       - name: leyenda
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "psicologo"
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 *                 localidad: "Aregentina"
 *                 imagenPerfil: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
 *                 fecha_nacimiento: "01-01-2000"
 *                 especialidad: "Cardiología"
 *                 descripcion: "Médico cardiólogo"
 *                 calificacion_promedio: 4.5
 *                 direccion: "Rio negro 2170"
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
    u.localidad,
    u.imagenPerfil,
    DATE_FORMAT(u.fecha_nacimiento, '%d-%m-%Y') AS fecha_nacimiento,
    p.especialidad,
    p.descripcion,
    p.calificacion_promedio,
    p.direccion,
    p.valorConsulta,
    p.valorConsultaExpress,
    CASE
    WHEN p.ID IS NOT NULL THEN 'profesional'
    WHEN pa.ID IS NOT NULL THEN 'paciente'
    WHEN a.ID IS NOT NULL THEN 'administrador'
    ELSE 'sin_rol'
    END AS rol
    FROM usuario u
    LEFT JOIN profesional p   ON u.ID = p.ID
    LEFT JOIN paciente pa     ON u.ID = pa.ID
    LEFT JOIN administrador a ON u.ID = a.ID
    WHERE u.ID = ?;
    `;

    const [result] = await pool.query(sql, [userId]);
    if (result === undefined) {
      logErrorToPage("Error al obtener el usuario: ", result);
      return res.status(500).json({ message: "Error al obtener el usuario", result: false });
    }
    if (result.length === 0) {
      logErrorToPage("Usuario no encontrado con ID: ", userId);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }
    logToPage("Usuario obtenido: ", result[0]);
    res.status(200).json({ user: result[0], result: true });
  } catch (error) {
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /buscarProfesional:
 *   get:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Buscar profesionales"
 *     description: "Busca profesionales por nombre o especialidad. Si no se pone nada en leyenda, trae todos los profesionales."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       - name: leyenda
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           example: "psicologo"
 *     responses:
 *       200:
 *         description: "Profesionales encontrados"
 *         content:
 *           application/json:
 *             example:
 *               message: "Profesionales encontrados"
 *               result: true
 *               data:
 *                 - nombre: "German"
 *                   apellido: "Lopez"
 *                   email: "german.lopez@example.com"
 *                   localidad: "Argentina"
 *                   especialidad: "psicologo"
 *                   descripcion: "Soy un re psicologo"
 *                   calificacion_promedio: "7.00"
 *                   direccion: "Calle Falsa 123"
 *                 - nombre: "Roma"
 *                   apellido: "Gonzalez"
 *                   email: "roma.gonzalez@example.com"
 *                   localidad: "Argentina"
 *                   especialidad: "Medica"
 *                   descripcion: "Soy una re medica"
 *                   calificacion_promedio: "9.00"
 *                   direccion: "Avenida Siempre Viva 742"
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
router.get("/buscarProfesional", authMiddleware, async (req, res) => {
  try {
    const { leyenda } = req.query;

    // if (!leyenda) {
    //   logErrorToPage("Falta la leyenda del profesional en la búsqueda🧟‍♂️");
    //   return res.status(400).json({ message: "Falta la leyenda del profesional", result: false });
    // }

    const [result] = await pool.query("SELECT u.nombre, u.apellido, u.email, u.localidad, p.especialidad, p.descripcion, p.calificacion_promedio, p.direccion, p.valorConsulta, p.valorConsultaExpress FROM profesional p JOIN usuario u ON u.ID = p.ID WHERE u.nombre LIKE ? OR p.especialidad LIKE ?", [`%${leyenda}%` + " || *", `%${leyenda}%`]);
    if (result.length === 0) {
      logErrorToPage("No se encontraron profesionales para la leyenda: ", leyenda);
      return res.status(404).json({ message: "No se encontraron profesionales", result: false });
    }

    logToPage("Profesionales encontrados para la leyenda: ", leyenda);
    res.status(200).json({ message: "Profesionales encontrados", result: true, data: result });
  } catch (error) {
    logErrorToPage("Error en /buscarProfesional: ", error);
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /cargarImagenUsuario:
 *   post:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Subir imagen de perfil del usuario"
 *     description: "Permite subir una imagen de perfil en formato PNG para el usuario autenticado."
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: "Archivo de imagen en formato PNG"
 *     responses:
 *       200:
 *         description: "Imagen cargada exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               imagenUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
 *               message: "Imagen cargada exitosamente"
 *               result: true
 *       400:
 *         description: "Error al subir la imagen"
 *         content:
 *           application/json:
 *             example:
 *               message: "No se proporcionó ninguna imagen"
 *               result: false
 *       401:
 *         description: "Token inválido o no enviado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Token requerido"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Algo salió mal: error"
 *               result: false
 */
router.post("/cargarImagenUsuario", authMiddleware, upload.single("imagen"), async (req, res) => {
  try {
    const userId = req.user.id; // Obtener el ID del usuario autenticado

    // Subir la imagen a Cloudinary
    const imageUrl = await uploadImage(`./assets/images/perfil.png`, `usuario_${userId}`);
    logToPage("Imagen subida a Cloudinary: " + imageUrl);

    // Guardar la URL en la base de datos
    const [result] = await pool.query(
      "UPDATE usuario SET imagenPerfil = ? WHERE id = ?",
      [imageUrl, userId]
    );

    if (result.affectedRows === 0) {
      logErrorToPage("Usuario no encontrado para cargar imagen: ", userId);
      res.status(404).json({ message: "Usuario no encontrado", result: false });
    }

    // Borrar el archivo temporal
    fs.unlinkSync("./assets/images/perfil.png");

    res.json({ message: "Imagen cargada exitosamente", imageUrl: imageUrl, result: true });
  } catch (error) {
    res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
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

    await pool.query(`set lc_time_names = 'es_ES'`);
    const [rows] = await pool.query(`SELECT id, email, password, nombre FROM usuario WHERE email = ?`, [email]);

    if (rows.length === 0) {
      logErrorToPage("Usuario no encontrado con email: ", email);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      logErrorToPage("Contraseña incorrecta para el usuario: ", email);
      return res.status(401).json({ message: "Credenciales inválidas", result: false }); // contraseña incorrecta
    }

    const token = jwt.sign({
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].nombre
    }, config.SECRETO, { expiresIn: "1h" });
    logToPage("Bienvenido: "+ rows[0].nombre);


    logToPage("Usuario logueado correctamente: " + email);
    return res.status(200).json({ token: token, message: "Usuario logueado", result: true })
  } catch (error) {
    logErrorToPage("Error en /logIn: ", error);
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
 *               localidad:
 *                 type: string
 *               rol:
 *                 type: string
 *                 enum: [profesional, paciente, administrador]
 *               especialidad:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               direccion:
 *                 type: string
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
 *                 localidad: "Argentina"
 *                 especialidad: "Cardiología"
 *                 descripcion: "Médica cardióloga con 10 años de experiencia"
 *                 direccion: "Rio Negro 2170"
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
 *                 localidad: "Argentina"
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
 *                 localidad: "Argentina"
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
    const { email, password, nombre, apellido, fecha_nacimiento, telefono, rol, localidad, especialidad, descripcion, direccion } = req.body;

    const [resultSelect] = await connection.query("SELECT * FROM usuario WHERE email = ?", [email]);

    if (resultSelect.length > 0) {
      logErrorToPage("Email ya en uso: " + email);
      return res.status(400).json({ message: "El email ya está en uso", result: false }); //mail repetido
    }

    if (!email || !password || !nombre || !apellido || !fecha_nacimiento || !telefono || !localidad) {
      logErrorToPage("Faltan datos obligatorios para el registro: " + JSON.stringify(req.body));
      return res.status(400).json({ message: "Faltan datos obligatorios", result: false }); // campos incompletos
    }

    if (password.length < 6) {
      logErrorToPage("Contraseña débil, menos de 6 caracteres");
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres", result: false }); // contraseña débil
    }

    //hasheo de la contraseña y almacenamiento
    logToPage("Hasheando... 😶‍🌫️");
    const hashedPassword = await bcrypt.hashSync(password, Number(config.SALT));

    await connection.beginTransaction();

    const [result] = await connection.query(
      "INSERT INTO usuario (nombre, email, password, apellido, fecha_nacimiento, telefono, localidad) VALUES (?, ?, ?, ?, ?, ?, ?)", [nombre, email, hashedPassword, apellido, fecha_nacimiento, telefono, localidad] // almaceno la contraseña hasheada
    );

    const usuarioId = result.insertId;

    if (rol === "profesional") {
      await connection.query(
        "INSERT INTO profesional (ID, especialidad, descripcion, direccion) VALUES (?, ?, ?, ?)",
        [usuarioId, especialidad, descripcion, direccion]
      );
    } else if (rol === "paciente") {
      await connection.query(
        "INSERT INTO paciente (ID) VALUES (?)",
        [usuarioId]
      );
    } else if (rol === "admin") {
      await connection.query(
        "INSERT INTO administrador (ID) VALUES (?)",
        [usuarioId]
      );
    } else {
      throw new Error("Rol inválido");
    }

    await connection.commit();
    res.status(201).json({ message: "Usuario creado exitosamente", result: true }); //201 Created
    logToPage("Usuario registrado: " + email);
    enviarMailRegistro(email, nombre).catch(err => logErrorToPage("Error al enviar mail de registro: ", err));
  } catch (error) {
    logErrorToPage("Error en al registrar: " + error);
    await connection.rollback();
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  } finally {
    connection.release();
  }
});

/**
 * @swagger
 * /cambiarClave:
 *   post:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Cambiar contraseña con token de recuperación"
 *     description: "Permite cambiar la contraseña de un usuario usando el token enviado por correo."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 description: "Token de recuperación enviado por correo"
 *               newPassword:
 *                 type: string
 *                 example: "nuevaPassword123"
 *                 description: "Nueva contraseña (mínimo 6 caracteres)"
 *     responses:
 *       200:
 *         description: "Contraseña actualizada exitosamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Contraseña actualizada exitosamente"
 *               result: true
 *       400:
 *         description: "Token o contraseña inválidos"
 *         content:
 *           application/json:
 *             examples:
 *               tokenFaltante:
 *                 summary: "Token faltante"
 *                 value:
 *                   message: "Token requerido"
 *                   result: false
 *               passwordDebil:
 *                 summary: "Contraseña débil"
 *                 value:
 *                   message: "La contraseña debe tener al menos 6 caracteres"
 *                   result: false
 *       401:
 *         description: "Token inválido o expirado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Token inválido o expirado"
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
router.post("/cambiarClave", authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;

    // Validar que se envió la nueva contraseña
    if (!newPassword) {
      logErrorToPage("Nueva contraseña no proporcionada en /cambiarClave");
      return res.status(400).json({ message: "Nueva contraseña requerida", result: false });
    }

    // Validar longitud de contraseña
    if (newPassword.length < 6) {
      logErrorToPage("Contraseña débil en /cambiarClave");
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres", result: false });
    }

    // Validar que el token es para recuperación de contraseña
    if (req.user.purpose !== 'password_reset') {
      logErrorToPage("Token no es de recuperación de contraseña");
      return res.status(401).json({ message: "Token inválido", result: false });
    }

    const email = req.user.email;

    // Verificar que el usuario existe
    const [rows] = await pool.query("SELECT id FROM usuario WHERE email = ?", [email]);
    if (rows.length === 0) {
      logErrorToPage("Usuario no encontrado con email: " + email);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }

    // Hashear la nueva contraseña
    logToPage("Hasheando nueva contraseña para: ", email);
    const hashedPassword = await bcrypt.hashSync(newPassword, Number(config.SALT));

    // Actualizar la contraseña
    await pool.query("UPDATE usuario SET password = ? WHERE email = ?", [hashedPassword, email]);

    logToPage("Contraseña actualizada exitosamente para: ", email);
    return res.status(200).json({ message: "Contraseña actualizada exitosamente", result: true });

  } catch (error) {
    logErrorToPage("Error en /cambiarClave: ", error);
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
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
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *               apellido:
 *                 type: string
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *               telefono:
 *                 type: integer
 *               localidad:
 *                 type: string
 *               especialidad:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               direccion:
 *                 type: string
 *           examples:
 *             profesional:
 *               summary: "Ejemplo de update de profesional"
 *               value:
 *                 nombre: "Laura"
 *                 apellido: "García"
 *                 email: "laura@mail.com"
 *                 fecha_nacimiento: "1985-05-20"
 *                 telefono: 2995551111
 *                 localidad: "Argentina"
 *                 especialidad: "Cardiología"
 *                 descripcion: "Médica cardióloga con 10 años de experiencia"
 *                 direccion: "Rio Negro 2170"
 *             paciente:
 *               summary: "Ejemplo de update de paciente"
 *               value:
 *                 nombre: "Martín"
 *                 apellido: "Pérez"
 *                 email: "martin@mail.com"
 *                 fecha_nacimiento: "1995-09-10"
 *                 telefono: 2995552222
 *                 localidad: "Argentina"
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
    const { nombre, email, apellido, fecha_nacimiento, telefono, localidad } = req.body;

    if (!email || !nombre || !apellido || !fecha_nacimiento || !telefono || !localidad) {
      logErrorToPage("Faltan datos obligatorios para la actualización: " + JSON.stringify(req.body));
      return res.status(400).json({ message: "Faltan datos obligatorios", result: false }); // campos incompletos
    }

    logToPage("Verificando si es profesional para actualización... 🧐");
    const [esProfesional] = await pool.query("SELECT u.ID FROM usuario u JOIN profesional p ON u.ID = p.ID WHERE email = ?", [email]);


    if (esProfesional.length > 0) {
      const { especialidad, descripcion, direccion } = req.body;
      if (!especialidad || !descripcion || !direccion) {
        logErrorToPage("Faltan datos obligatorios para la actualización del profesional: " + JSON.stringify(req.body));
        return res.status(400).json({ message: "Faltan datos obligatorios", result: false });
      }
      logToPage("Actualizando datos del profesional: " + email);
      const [profesional] = await pool.query("UPDATE profesional SET especialidad = ?, descripcion = ?, direccion = ? WHERE ID = ?", [especialidad, descripcion, direccion, esProfesional[0].ID]);

      console.log(profesional);

      if(profesional.affectedRows === 0){
        logToPage("No se encontraron cambios para la actualización del profesional: " + email);
        return res.status(404).json({ message: "No se encontraron cambios para la actualización", result: false });
      }
    }

    const token = jwt.sign({
      id: req.user.id,
      email: email,
      name: nombre
    }, config.SECRETO, { expiresIn: "1h" });

    const [result] = await pool.query(
      "UPDATE usuario SET nombre = ?, email = ?, apellido = ?, fecha_nacimiento = ?, telefono = ?, localidad = ? WHERE email = ?",
      [nombre, email, apellido, fecha_nacimiento, telefono, localidad, req.user.email]
    );
    if (result.affectedRows === 0) {
      logErrorToPage("Usuario no encontrado para actualización: ", req.user.email);
      return res.status(404).json({ message: "Usuario no encontrado", result: false });
    }
    logToPage("Usuario actualizado: " + email);
    res.status(200).json({ nuevoToken: token, message: "Usuario actualizado correctamente", result: true });
  } catch (error) {
    logErrorToPage("Error en /update: ", error);
    return res.status(500).json({ message: "Algo salió mal: " + error.message, result: false });
  }
});

/**
 * @swagger
 * /ActualizarValorConsultas:
 *   put:
 *     tags:
 *       - CRUD Usuarios
 *     summary: "Actualizar valores de consulta"
 *     description: "Permite a un profesional actualizar los valores de consulta estándar y express. Requiere autenticación."
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valorConsulta:
 *                 type: number
 *                 example: 500
 *                 description: "Nuevo valor de la consulta estándar"
 *               valorConsultaExpress:
 *                 type: number
 *                 example: 700
 *                 description: "Nuevo valor de la consulta express"
 *     responses:
 *       200:
 *         description: "Valores de consulta actualizados correctamente"
 *         content:
 *           application/json:
 *             example:
 *               message: "Valor de consulta actualizado correctamente."
 *               result: true
 *       400:
 *         description: "Faltan datos obligatorios"
 *         content:
 *           application/json:
 *             example:
 *               message: "Faltan datos obligatorios"
 *               result: false
 *       404:
 *         description: "Profesional no encontrado"
 *         content:
 *           application/json:
 *             example:
 *               message: "Profesional no encontrado"
 *               result: false
 *       500:
 *         description: "Error interno del servidor"
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al actualizar el valor de consulta."
 *               result: false
 */
router.put("/ActualizarValorConsultas", authMiddleware, async (req, res) => {
    try{
        const { valorConsulta, valorConsultaExpress } = req.body;

        if(!valorConsulta || !valorConsultaExpress){
            logErrorToPage(`Faltan datos obligatorios para actualizar el valor de consulta.`);
            return  res.status(400).json({ message: "Faltan datos obligatorios.", result: false });
        }

        const [result] =  await pool.query(
            "UPDATE profesional SET valorConsulta = ?, valorConsultaExpress = ? WHERE ID = ?",
            [valorConsulta, valorConsultaExpress, req.user.id]
        );

        if(result.affectedRows === 0){
            logErrorToPage(`Profesional no encontrado para actualizar el valor de consulta: `, req.user.id);
            return res.status(404).json({ message: "Profesional no encontrado.", result: false });
        }

        logToPage(`Valor de consulta actualizado para el profesional: `, req.user.id);
        res.status(200).json({ message: "Valor de consulta actualizado correctamente.", result: true });

    }catch(error){
        logErrorToPage(`Error al actualizar el valor de consulta.`);
        res.status(500).json({ message: "Error al actualizar el valor de consulta." + error.message, result: false });
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
    logToPage("Intentando eliminar usuario: ", req.user.email);
    const [result] = await pool.query("DELETE FROM usuario WHERE email = ?", [req.user.email]);
    if (result.affectedRows === 0) {
      logErrorToPage("Usuario no encontrado: ", req.user.email);
      return res
        .status(404)
        .json({ message: "Usuario no encontrado", result: false });
    }
    res
      .status(200)
      .json({ message: "Usuario eliminado correctamente", result: true });
    logToPage("Usuario eliminado: ", req.user.email);
  } catch (error) {
    logErrorToPage("Error en /borrarUsuario: ", error);
    return res
      .status(500)
      .json({ message: "Algo salió mal: " + error.message, result: false });
  }
});
export default router;
