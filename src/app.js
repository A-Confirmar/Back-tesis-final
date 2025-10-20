import express from "express"
import config from "./config.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import homeRoutes from "./routes/home.routes.js";
import mailroutes from "./routes/mail.routes.js";
import disponibilidadRoutes from "./routes/Disponibilidad.routes.js";
import turnosRoutes from "./routes/turnos.routes.js";
import bloqueoRoutes from "./routes/Bloqueo.routes.js";
import pagosRoutes from "./routes/pagos.routes.js";
import reseniasRoutes from "./routes/reseña.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import cookieParser from "cookie-parser";
import cors from "cors";
import {cargarRecordatoriosPendientes} from "./Utils/recordatorios.js";



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
app.use(bloqueoRoutes);
app.use(pagosRoutes);
app.use(reseniasRoutes);
app.use(express.json({ limit: "10mb" })); // <- aumentá a lo que necesites
app.use(express.urlencoded({ limit: "10mb", extended: true }));
cargarRecordatoriosPendientes();


//configuracion
app.set("port", config.PORT);

// html con el script de socket.io para recibir los logs
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MediTurnos</title>
      <style>
        body { font-family: monospace; background: #1e1e1e; color: #fff; padding: 20px; }
        #logs { background: #2d2d2d; padding: 15px; border-radius: 5px; height: 70vh; overflow-y: auto; }
        .log-entry { margin: 5px 0; padding: 5px; border-left: 3px solid #007acc; }
		    .log-entry-error { margin: 5px 0; padding: 5px; border-left: 3px solid #ff0000; background-Color: rgba(255, 0, 0, 0.4); }
        h1 { color: #007acc; }
      </style>
    </head>
    <body>
      <h1>📊 MediTurnos</h1>
      <div id="logs"></div>
      
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const logsContainer = document.getElementById('logs');

        socket.on('server-log-error', (mensaje) => {
          const logEntry = document.createElement('div');
          logEntry.className = 'log-entry-error';
          logEntry.textContent = mensaje;
          logsContainer.appendChild(logEntry);
          logsContainer.scrollTop = logsContainer.scrollHeight;
        });
        
        socket.on('server-log', (mensaje) => {
          const logEntry = document.createElement('div');
          logEntry.className = 'log-entry';
          logEntry.textContent = mensaje;
          logsContainer.appendChild(logEntry);
          logsContainer.scrollTop = logsContainer.scrollHeight;
        });
        
        // Log inicial
        const initialLog = document.createElement('div');
        initialLog.className = 'log-entry';
        initialLog.textContent = new Date().toLocaleString() + ' - Página de logs cargada';
        logsContainer.appendChild(initialLog);
      </script>
    </body>
    </html>
  `);
});







export default app;