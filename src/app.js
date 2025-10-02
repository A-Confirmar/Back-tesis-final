import express from "express"
import config from "./config.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import homeRoutes from "./routes/home.routes.js";
import mailroutes from "./routes/mail.routes.js";
import disponibilidadRoutes from "./routes/Disponibilidad.routes.js";
import turnosRoutes from "./routes/Turnos.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import cookieParser from "cookie-parser";
import cors from "cors";



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
app.use(mailroutes)
app.use(disponibilidadRoutes)
app.use(turnosRoutes)


//configuracion
app.set("port", config.PORT);









export default app;