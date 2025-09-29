import express from "express"
import config from "./config.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import homeRoutes from "./routes/home.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import cookieParser from "cookie-parser";
import { pool } from "./db.js"; // o como tengas tu archivo
import cors from "cors";



async function checkConnection() {
  try {
    // pedimos una conexión del pool
    const connection = await pool.getConnection();
    console.log("Conexión exitosa a la base de datos!");
    connection.release(); // liberamos la conexión de vuelta al pool
  } catch (err) {
    console.error("Error conectando a la base de datos:", err.message);
  }
}


//swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: ["./routes/*.js", "./app.js"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);


const app = express();  
app.use(cors({ origin: "*" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(usuarioRoutes)
app.use(homeRoutes)


//configuracion
app.set("port", config.port);




/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - test
 *     summary: "Obtener un saludo"
 *     description: "Devuelve un saludo"
 *     responses:
 *       200:
 *         description: "Saludo exitoso"
 */
app.get("/", (req,res)=>{
  res.send("¡Hola Mundo!");
checkConnection();
  
}) ;


export default app;