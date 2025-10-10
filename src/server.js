import app from "./app.js";
import config from "./config.js";
import { initSocket, logToPage } from "./Utils/consolaViva.js";
import fs from 'fs';
import https from 'https';


const options = {
  key: fs.readFileSync('../../certificados/mykey.key'),
  cert: fs.readFileSync('../../certificados/mycert.crt')
};



const server = https.createServer(options, app).listen(config.PORT,() => {
logToPage('Servidor HTTPS escuchando en el puerto https://localhost:' + config.PORT);
logToPage('Swagger https://localhost:' + config.PORT + "/api-docs");
});

initSocket(server);


