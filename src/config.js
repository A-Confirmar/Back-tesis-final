import dotenv from "dotenv"
dotenv.config();

 const config = {
  port: process.env.PORT,
  secreto: process.env.JWT_SECRET,
  salt: process.env.SALT_ROUNDS,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
       }
  
  //LOCAL
    // db: {
    // host:  "localhost",
    // user:  "root",
    // password:  "54213",
    // database:  "MediTurnos"
    //    }
}

export default config;