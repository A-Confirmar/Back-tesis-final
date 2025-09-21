import {createPool} from "mysql2/promise";
import config from "./config.js";

export const pool = createPool({
  host: config.db.host,
  port: 3306,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database
});

export default pool;
