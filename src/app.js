import express from "express"
import config from "./config.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

//swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js", "./app.js"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);


const app = express();  
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(usuarioRoutes)

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
}) ;


export default app;