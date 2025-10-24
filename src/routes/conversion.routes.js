import { Router } from "express";
const router = Router();
import soap from "soap";
import { parseStringPromise } from "xml2js";


import { authMiddleware } from "../middleware/auth.js";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";



// Ruta protegida, solo accesible con token válido
router.get("/conversion", authMiddleware, async (req, res) => {
    const urlSoap = "https://www.ibm.com/docs/en/api-connect/saas?topic=api-example-wsdl-file-globalweatherwsdl";
    try {
        const client = await soap.createClientAsync(urlSoap);

        const args = { CountryName: 'Argentina', CityName: 'Buenos Aires' };


        logToPage("llamando a metodo SOAP GetWeather desde /conversion");

        const [result] = await client.GetWeather(args);


        logToPage("Respuesta SOAP recibida en /conversion"+ result);

        res.status(200).json({ message: "Conversión exitosa", data: result, result: true });

    } catch (error) {
        logErrorToPage("Error en /conversion: " + error.message);
        res.status(500).json({ message: "Error interno del servidor", result: false });
    }

});


export default router;
