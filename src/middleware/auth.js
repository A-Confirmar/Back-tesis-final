import jwt from "jsonwebtoken";
import config from "../config.js";

// Middleware para verificar el token JWT
export function authMiddleware(req, res, next) {
  // Buscar token en header Authorization o en body
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }
  if (!token) {
    return res.status(401).json({ message: "Token requerido", result: false });
  }
  try {
    const decoded = jwt.verify(token, config.SECRETO);
    req.user = decoded; // Datos del usuario disponibles en req.user
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido: " + err.message, result: false });
  }
}
