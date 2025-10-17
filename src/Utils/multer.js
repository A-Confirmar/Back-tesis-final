import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de multer
 const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../assets/images/")); 
  },
  filename: (req, file, cb) => {
    const userId = req.user.id; 
    const ext = path.extname(file.originalname); 
    cb(null, `perfil.png`); 
  },
});

export const upload = multer({ storage });