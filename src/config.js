import dotenv from "dotenv"
dotenv.config();

 const config = {
  PORT: process.env.PORT,
  SECRETO: process.env.JWT_SECRET,
  SALT: process.env.SALT_ROUNDS,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_PASS: process.env.GMAIL_PASS,
  // DB: {
  //   HOST: process.env.DB_HOST,
  //   USER: process.env.DB_USER,
  //   PASSWORD: process.env.DB_PASSWORD,
  //   DATABASE: process.env.DB_NAME
  // }
  
  // LOCAL
    DB: {
    HOST:  "localhost",
    USER:  "root",
    PASSWORD:  "54213",
    DATABASE:  "MediTurnos"
       }
}

export default config;