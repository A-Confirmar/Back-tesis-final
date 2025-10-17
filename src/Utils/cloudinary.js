import { v2 as cloudinary } from 'cloudinary';
import config from "../config.js";

    // Configuration
    cloudinary.config({ 
        cloud_name: config.CLOUDNAME, 
        api_key: config.APIKEY, 
        api_secret: config.APISECRET // Click 'View API Keys' above to copy your API secret
    });
    

// Función para subir una imagen (local o por buffer/base64)
export const uploadImage = async (filePath, publicId = null) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId || undefined,
      folder: "uploads", // opcional, crea una carpeta en Cloudinary
    });
    return result.secure_url; // te devuelve la URL lista para usar
  } catch (err) {
    console.error("Error al subir la imagen:", err);
    throw err;
  }
};

// Si querés también borrar imágenes
export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Imagen ${publicId} eliminada`);
  } catch (err) {
    console.error("Error al eliminar la imagen:", err);
  }
};
