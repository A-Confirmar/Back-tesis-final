import app from "./app.js";
import config from "./config.js";
import fs from 'fs';
import https from 'https';
import cors from "cors";

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


const options = {
  key: fs.readFileSync('../../certificados/mykey.key'),
  cert: fs.readFileSync('../../certificados/mycert.crt')
};


const server = https.createServer(options, app).listen(config.port,() => {
  console.log('Servidor HTTPS escuchando en el puerto https://localhost:'+config.port);
});


