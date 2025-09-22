const config = {
  port: process.env.PORT || 4003,
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "sqluser",
    password: process.env.DB_PASSWORD || "Walo45785",
    database: process.env.DB_NAME || "MediTurnos"
  }
}

export default config;