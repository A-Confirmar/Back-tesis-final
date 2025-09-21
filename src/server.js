import app from "./app.js";
import config from "./config.js";


app.listen(config.port, () => {
  console.log(`Server corriendo en el puerto: ${app.get("port")} http://localhost:${app.get("port")}`);
});

