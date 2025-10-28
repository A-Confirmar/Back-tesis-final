import { Router } from "express";
const router = Router();
import soap from "soap";
import { logErrorToPage, logToPage } from "../Utils/consolaViva.js";


/**
 * @swagger
 * /infoPais:
 *   get:
 *     tags:
 *       - SOAP
 *     summary: Obtener información completa de un país por código ISO
 *     description: Llama al servicio SOAP externo y devuelve la información completa del país identificado por su código ISO.
 *     parameters:
 *       - in: query
 *         name: isoCode
 *         required: true
 *         schema:
 *           type: string
 *           example: AR
 *     responses:
 *       200:
 *         description: Conversión exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *                 result:
 *                   type: boolean
 *             examples:
 *               success:
 *                 summary: Ejemplo de respuesta exitosa
 *                 value:
 *                   message: Conversión exitosa
 *                   data:
 *                     sName: Argentina
 *                     sCapitalCity: Buenos Aires
 *                     sPhoneCode: "54"
 *                     sCurrencyISOCode: ARS
 *                     sCountryFlag: http://www.oorsprong.org/WebSamples.CountryInfo/Flags/Argentina.jpg
 *                   result: true
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 result:
 *                   type: boolean
 *             examples:
 *               error:
 *                 summary: Ejemplo de error
 *                 value:
 *                   message: Error interno del servidor
 *                   result: false
 */
router.get("/infoPais", async (req, res) => {
    const urlSoap = "http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL";
    const {isoCode} = req.query;
    try {
        const client = await soap.createClientAsync(urlSoap);


        const args = { sCountryISOCode: isoCode };


        logToPage("llamando a metodo SOAP GetWeather desde /infoPais");


        const [full] = await client.FullCountryInfoAsync(args);


        logToPage("Respuesta SOAP recibida en /infoPais: " + JSON.stringify(full));

        res.status(200).json({ message: "Conversión exitosa", data: full, result: true });

    } catch (error) {
        logErrorToPage("Error en /infoPais: " + error.message);
        res.status(500).json({ message: "Error interno del servidor", result: false });
    }

});


export default router;
