const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

exports.preguntarGemini = onRequest({ cors: true }, async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    if (!userPrompt) return res.status(400).json({ error: "Falta el prompt" });

    const apiKey = process.env.GEMINI_API_KEY;

    // URL CORREGIDA: Cambiamos 'v1beta' por 'v1' que es la versión estable para Gemini 1.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("Error de la API de Gemini:", JSON.stringify(data));
      // Ahora el error te dirá exactamente qué pasó en lugar de mentir con "Vertex AI"
      return res.status(500).json({
        error: "Error en la API de Gemini",
        detalles: data.error ? data.error.message : data
      });
    }

    // Extraer la respuesta de texto de Gemini
    const respuesta = data.candidates[0].content.parts[0].text;
    return res.json({ respuesta });

  } catch (error) {
    logger.error("Error del Servidor:", error);
    return res.status(500).json({ error: "Error interno en la Cloud Function" });
  }
});