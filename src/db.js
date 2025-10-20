import {createPool} from "mysql2/promise";
import config from "./config.js";

export const pool = createPool({
  host: config.DB.HOST,
  port: 3306,
  user: config.DB.USER,
  password: config.DB.PASSWORD,
  database: config.DB.DATABASE,
  timezone: "-03:00",
});

export default pool;
