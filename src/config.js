import dotenv from "dotenv"
dotenv.config();

 const config = {
  PORT: process.env.PORT,
  SECRETO: process.env.JWT_SECRET,
  SALT: process.env.SALT_ROUNDS,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_PASS: process.env.GMAIL_PASS,
  //cloudinary
  CLOUDNAME: process.env.CLOUD_NAME,
  APIKEY: process.env.CLOUD_API_KEY,
  APISECRET: process.env.CLOUD_API_SECRET,
  // URLs

  FRONTEND_URL: "https://localhost:5173/cambiarClave",
  DB: {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DATABASE: process.env.DB_NAME
  }
  
  // LOCAL
    // DB: {
    // HOST:  "localhost",
    // USER:  "root",
    // PASSWORD:  "54213",
    // DATABASE:  "MediTurnos"
    //    }
}

export default config;