import dotenv from "dotenv"
dotenv.config();

const config = {
  port: process.env.PORT,
  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "54213",
    database: process.env.DB_NAME || "MediTurnos"
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
}

export default config;