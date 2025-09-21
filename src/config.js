const config = {
  port: process.env.PORT || 4003,
  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "54213",
    database: process.env.DB_NAME || "MediTurnos"
  }
}

export default config;