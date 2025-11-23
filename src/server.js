import app from "./app.js";
import config from "./config.js";
import { initSocket, logToPage } from "./Utils/consolaViva.js";
import fs from 'fs';
import https from 'https';




// const options = {
//   key: fs.readFileSync('../../certificados/mykey.key'),
//   cert: fs.readFileSync('../../certificados/mycert.crt')
// };

const options = {
  key: fs.readFileSync("../../certificados/acme/api.germanmetzger.me-key.pem"),
  cert: fs.readFileSync("../../certificados/acme/api.germanmetzger.me-crt.pem"),
  ca: fs.readFileSync("../../certificados/acme/api.germanmetzger.me-chain.pem")
};


const server = https.createServer(options, app).listen(config.PORT,() => {
logToPage('Servidor HTTPS escuchando en el puerto https://localhost:' + config.PORT);
logToPage('Swagger https://localhost:' + config.PORT + "/api-docs");
});

initSocket(server);


