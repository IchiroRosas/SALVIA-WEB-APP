const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Importamos e inicializamos Firebase Admin (Esencial para Auth y Firestore en el Backend)
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// Importamos la SDK oficial de Gemini
const { GoogleGenerativeAI } = require("@google/generative-ai");

initializeApp();
const db = getFirestore();
const auth = getAuth();

// Configuración global de Firebase Functions
setGlobalOptions({ maxInstances: 10 });

// Origen permitido para CORS (Tu app de Angular)
const ORIGEN_PERMITIDO = ["https://salvia-app-865f5.web.app"];

//*******************************************************************
// 0 - FUNCTION DE PRUEBA (Adaptada con CORS, Secret y Firebase Auth)
//*******************************************************************
exports.preguntarGemini = onRequest({
  cors: ORIGEN_PERMITIDO,
  secrets: ["GEMINI_API_KEY"]
}, async (req, res) => {
  try {
    // 1. VALIDACIÓN DE FIREBASE AUTH (Verificar el Token enviado en las cabeceras)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado. Falta el token de autenticación." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error("Token inválido o expirado en preguntarGemini:", authError);
      return res.status(401).json({ error: "Sesión inválida o expirada. Vuelva a iniciar sesión." });
    }

    // El UID del usuario autenticado por si quisieras registrar quién consulta
    const uid = decodedToken.uid;
    logger.info(`🔑 Usuario autenticado (${uid}) consultando la función de prueba de Gemini.`);


    // 2. VALIDACIÓN DEL CUERPO DE LA PETICIÓN
    const userPrompt = req.body.prompt;
    if (!userPrompt) return res.status(400).json({ error: "Falta el prompt" });


    // 3. LLAMADA A LA API DE GEMINI (Utilizando el Secret inyectado)
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] })
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("Error de la API de Gemini:", JSON.stringify(data));
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

//*******************************************************************
// FUNCTIONS REALES PARA EL PROYECTO (PRODUCCIÓN & SEGURIDAD)
//*******************************************************************


// 1 - REPORTE DIARIO
// **********************************************************************************************************************
exports.generarReporteDiario = onRequest({
  cors: ORIGEN_PERMITIDO,         // 1. CONTROL DE CORS
  secrets: ["GEMINI_API_KEY"]     // 2. CONTROL DE SEGURIDAD (Secret Manager)
}, async (req, res) => {
  try {
    // 3. VALIDACIÓN DE FIREBASE AUTH (Verificar Token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado. Falta el token." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error("Token inválido:", authError);
      return res.status(401).json({ error: "Sesión expirada. Vuelva a iniciar sesión." });
    }

    const uid = decodedToken.uid;

    // 4. VALIDACIÓN DE ROLES Y EMPRESA EN FIRESTORE
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return res.status(403).json({ error: "Usuario no registrado." });

    const userData = userDoc.data();
    if (userData.rol !== "administrador") {
      return res.status(403).json({ error: "Acceso denegado. Se requiere ser administrador." });
    }

    const empresaId = userData.empresa_id;
    const empresaDoc = await db.collection("empresas").doc(empresaId).get();
    if (!empresaDoc.exists) return res.status(404).json({ error: "La empresa no existe." });

    const empresaData = empresaDoc.data();
    if (!empresaData.activo) return res.status(403).json({ error: "Empresa inactiva." });


    // 5. 🚀 CÁLCULO DINÁMICO DE FECHAS CORREGIDO (ZONA HORARIA LIMA, PERÚ)
    const ahora = new Date();
    // Extraemos la fecha actual formateada específicamente para la zona horaria de Lima (Retorna "M/D/YYYY")
    const fechaLima = ahora.toLocaleDateString("en-US", { timeZone: "America/Lima" });
    const [mes, dia, anio] = fechaLima.split("/");

    // Rellenamos con ceros a la izquierda para mantener el estándar ISO (Ej: "06" y "30")
    const mm = mes.padStart(2, "0");
    const dd = dia.padStart(2, "0");

    // Creamos los límites de tiempo exactos forzando el desfase de Perú (-05:00)
    const inicioDiaJs = new Date(`${anio}-${mm}-${dd}T00:00:00-05:00`);
    const finDiaJs = new Date(`${anio}-${mm}-${dd}T23:59:59-05:00`);

    // Convertimos a Timestamps de Firestore para las consultas
    const inicioDia = Timestamp.fromDate(inicioDiaJs);
    const finDia = Timestamp.fromDate(finDiaJs);

    // Formateamos el texto del mes de forma amigable para la IA
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const mesIndex = parseInt(mm, 10) - 1;
    const fechaTexto = `${dd} ${meses[mesIndex]} ${anio}`;

    logger.info(`🤖 Ejecutando Reporte Diario para el día REAL en Perú: ${fechaTexto}. Empresa: ${empresaData.nombre_empresa}`);


    // 6. CONSULTA DE DATOS CON FILTROS DINÁMICOS
    const [ventasSnapshot, comprasSnapshot, recursosSnapshot] = await Promise.all([
      db.collection("ventas")
        .where("empresa_id", "==", empresaId)
        .where("fecha_hora", ">=", inicioDia)
        .where("fecha_hora", "<=", finDia)
        .get(),
      db.collection("compras")
        .where("empresa_id", "==", empresaId)
        .where("fecha", ">=", inicioDia)
        .where("fecha", "<=", finDia)
        .get(),
      db.collection("registro_compra_producto_recurso")
        .where("empresa_id", "==", empresaId)
        .where("fecha_compra", ">=", inicioDia)
        .where("fecha_compra", "<=", finDia)
        .get()
    ]);


    // 7. CARPINTERÍA MATEMÁTICA EN NODE.JS
    let ingresosBrutos = 0;
    let egresosMercaderia = 0;
    let egresosRecursos = 0;
    let ticketsEmitidos = ventasSnapshot.size;
    let ticketMasAlto = { total: 0, cliente: "Cliente Genérico" };
    let horasConteo = {};

    ventasSnapshot.forEach(doc => {
      const data = doc.data();
      ingresosBrutos += data.total_venta || 0;

      // 1. Limpieza ultra estricta del nombre para el ticket más alto
      const nombreCliente = (data.nombre_cliente || "").toString().trim();

      if (data.total_venta > ticketMasAlto.total) {
        ticketMasAlto = {
          total: data.total_venta,
          // Si el nombre quedó vacío tras el trim, aseguramos el fallback de respaldo
          cliente: nombreCliente !== "" ? nombreCliente : "Cliente Genérico"
        };
      }

      if (data.fecha_hora) {
        const hora = data.fecha_hora.toDate().getHours();
        horasConteo[hora] = (horasConteo[hora] || 0) + 1;
      }
    });

    comprasSnapshot.forEach(doc => {
      egresosMercaderia += doc.data().costo_total_operacion || 0;
    });

    recursosSnapshot.forEach(doc => {
      egresosRecursos += doc.data().precio_compra || 0;
    });

    let horaPico = "No registrada";
    let maxTickets = 0;
    Object.keys(horasConteo).forEach(hora => {
      if (horasConteo[hora] > maxTickets) {
        maxTickets = horasConteo[hora];
        horaPico = `${hora}:00 HRS`;
      }
    });

    const egresosTotales = egresosMercaderia + egresosRecursos;
    const balanceNeto = ingresosBrutos - egresosTotales;

    // JSON CON FECHAS DINÁMICAS PASADO A GEMINI
    const datosMasticados = {
      periodo: `Últimas 24 horas (${fechaTexto})`,
      ingresos_brutos: ingresosBrutos.toFixed(2),
      egresos_totales: egresosTotales.toFixed(2),
      balance_neto: balanceNeto.toFixed(2),
      tickets_emitidos: ticketsEmitidos,
      hora_pico_operativa: horaPico,
      ticket_mas_alto_del_dia: `${ticketMasAlto.cliente} con S/. ${ticketMasAlto.total.toFixed(2)}`
    };

    // 8. LLAMADA COGNITIVA A GEMINI IA
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Actúa como un Consultor de Negocios y Analista Financiero experto para comercios minoristas locales (como tiendas de barrio, minimarkets, librerías, papelerías o bazares).
      A continuación, te proporciono el resumen financiero consolidado de las operaciones de HOY de un negocio. 
      
      Opcional: Si a través de los datos del negocio o el contexto puedes deducir con total seguridad el rubro específico (ej: una librería/papelería por venta de útiles/copias, o un minimarket por abarrotes), adapta sutilmente tus referencias al tipo de negocio. De lo contrario, mantén un lenguaje adaptable.
      
      Datos consolidados:
      ${JSON.stringify(datosMasticados, null, 2)}
      
      Por favor, redacta un reporte ejecutivo breve utilizando estrictamente la siguiente estructura en formato de texto claro:
      
      1. RESUMEN DEL DÍA: (Analiza en un párrafo amigable si el día fue rentable, qué tal estuvo el movimiento de clientes según los tickets y la hora pico).
      2. CLIENTE DESTACADO DEL DÍA: (Menciona de forma entusiasta al cliente que dejó el ticket más alto y cuánto aportó).
      3. TIP OPERATIVO INMEDIATO PARA MAÑANA: (Brinda una recomendación concisa y accionable basada en el balance neto o los egresos de hoy para mejorar el negocio mañana).
      
      Mantén un tono profesional, motivador y directo al grano, ideal para que lo lea un(a) emprendedor(a) desde su teléfono móvil, utilizando términos generales como "negocio", "comercio" o "empresa".
    `;

    const resultadoIA = await model.generateContent(prompt);
    const textoReporteFinal = resultadoIA.response.text();


    // 9. OPERACIÓN EN BASE DE DATOS: GUARDAR REPORTE CON TÍTULO DINÁMICO
    const nuevoReporteRef = db.collection("reportes").doc();
    const documentoReporte = {
      empresa_id: empresaId,
      fecha_registro: Timestamp.now(),
      texto_reporte: textoReporteFinal,
      tipo_reporte: "Diario",
      titulo: `Reporte Diario de Operaciones - ${fechaTexto}`
    };

    await nuevoReporteRef.set(documentoReporte);


    // 10. RESPUESTA EXITOSA AL FRONTEND
    return res.status(200).json({
      success: true,
      mensaje: "Reporte diario dinámico generado con éxito.",
      data: documentoReporte
    });

  } catch (error) {
    logger.error("❌ Error crítico en generarReporteDiario:", error);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});


// 2 - REPORTE MENSUAL (30 DÍAS FLOTANTES)
// **********************************************************************************************************************

exports.generarReporteMensual = onRequest({
  cors: ORIGEN_PERMITIDO,         // 1. CONTROL DE CORS
  secrets: ["GEMINI_API_KEY"]     // 2. CONTROL DE SEGURIDAD (Secret Manager)
}, async (req, res) => {
  try {
    // 3. VALIDACIÓN DE FIREBASE AUTH (Verificar Token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado. Falta el token." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error("Token inválido:", authError);
      return res.status(401).json({ error: "Sesión expirada. Vuelva a iniciar sesión." });
    }

    const uid = decodedToken.uid;

    // 4. VALIDACIÓN DE ROLES Y EMPRESA EN FIRESTORE
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return res.status(403).json({ error: "Usuario no registrado." });

    const userData = userDoc.data();
    if (userData.rol !== "administrador") {
      return res.status(403).json({ error: "Acceso denegado. Se requiere ser administrador." });
    }

    const empresaId = userData.empresa_id;
    const empresaDoc = await db.collection("empresas").doc(empresaId).get();
    if (!empresaDoc.exists) return res.status(404).json({ error: "La empresa no existe." });

    const empresaData = empresaDoc.data();
    if (!empresaData.activo) return res.status(403).json({ error: "Empresa inactiva." });


    // 5. 🚀 CÁLCULO DE VENTANA DE TIEMPO: ÚLTIMOS 30 DÍAS FLOTANTES (ZONA HORARIA LIMA, PERÚ)
    const ahora = new Date();
    const fechaLima = ahora.toLocaleDateString("en-US", { timeZone: "America/Lima" });
    const [mes, dia, anio] = fechaLima.split("/");

    const mm = mes.padStart(2, "0");
    const dd = dia.padStart(2, "0");

    // Límite final: Hoy a las 23:59:59 hora de Perú
    const finPeriodoJs = new Date(`${anio}-${mm}-${dd}T23:59:59-05:00`);

    // Límite inicial: Retrocedemos exactamente 29 días en el calendario para cubrir 30 días en total
    const inicioPeriodoJs = new Date(finPeriodoJs);
    inicioPeriodoJs.setDate(inicioPeriodoJs.getDate() - 29);
    inicioPeriodoJs.setHours(0, 0, 0, 0);

    // Conversión a Timestamps nativos de Firestore
    const inicioPeriodo = Timestamp.fromDate(inicioPeriodoJs);
    const finPeriodo = Timestamp.fromDate(finPeriodoJs);

    // Formateo de fechas legibles para el título del reporte y la IA
    const opcionesFormato = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' };
    const textoInicio = inicioPeriodoJs.toLocaleDateString("es-PE", opcionesFormato);
    const textoFin = finPeriodoJs.toLocaleDateString("es-PE", opcionesFormato);
    const periodoTexto = `${textoInicio} al ${textoFin}`;

    logger.info(`🤖 Ejecutando Reporte Mensual (30 días) para el periodo: ${periodoTexto}. Empresa: ${empresaData.nombre_empresa}`);


    // 6. CONSULTA DE DATOS CON FILTROS DE RANGO HISTÓRICO
    const [ventasSnapshot, comprasSnapshot, recursosSnapshot] = await Promise.all([
      db.collection("ventas")
        .where("empresa_id", "==", empresaId)
        .where("fecha_hora", ">=", inicioPeriodo)
        .where("fecha_hora", "<=", finPeriodo)
        .get(),
      db.collection("compras")
        .where("empresa_id", "==", empresaId)
        .where("fecha", ">=", inicioPeriodo)
        .where("fecha", "<=", finPeriodo)
        .get(),
      db.collection("registro_compra_producto_recurso")
        .where("empresa_id", "==", empresaId)
        .where("fecha_compra", ">=", inicioPeriodo)
        .where("fecha_compra", "<=", finPeriodo)
        .get()
    ]);


    // 7. CARPINTERÍA MATEMÁTICA EN NODE.JS
    let ingresosTotalesMes = 0;
    let egresosMercaderia = 0;
    let egresosRecursos = 0;
    let totalTicketsMes = ventasSnapshot.size;

    // Diccionario para identificar al cliente más fiel
    let clientesFidelidadMap = {};

    ventasSnapshot.forEach(doc => {
      const data = doc.data();
      ingresosTotalesMes += data.total_venta || 0;

      const nombreCliente = (data.nombre_cliente || "").toString().trim();
      const numCliente = (data.num_cliente || "").toString().trim();

      // FILTRO ULTRA ESTRICTO:
      // 1. Que el nombre no esté vacío ni sean solo espacios.
      // 2. Que no sea "Cliente Genérico".
      // 3. Que el número no esté vacío ni sean solo espacios.
      if (
        nombreCliente !== "" &&
        nombreCliente !== "Cliente Genérico" &&
        numCliente !== ""
      ) {
        if (!clientesFidelidadMap[numCliente]) {
          clientesFidelidadMap[numCliente] = {
            nombre: nombreCliente,
            visitas: 0,
            totalGastado: 0
          };
        }
        clientesFidelidadMap[numCliente].visitas += 1;
        clientesFidelidadMap[numCliente].totalGastado += data.total_venta || 0;
      }
    });

    comprasSnapshot.forEach(doc => {
      egresosMercaderia += doc.data().costo_total_operacion || 0;
    });

    recursosSnapshot.forEach(doc => {
      egresosRecursos += doc.data().precio_compra || 0;
    });

    // Encontrar al cliente estrella del periodo
    let clienteMasFiel = { nombre: "No registrado", num: "N/A", visitas: 0, totalGastado: 0 };
    Object.keys(clientesFidelidadMap).forEach(num => {
      if (clientesFidelidadMap[num].visitas > clienteMasFiel.visitas) {
        clienteMasFiel = {
          nombre: clientesFidelidadMap[num].nombre,
          num: num,
          visitas: clientesFidelidadMap[num].visitas,
          totalGastado: Number(clientesFidelidadMap[num].totalGastado.toFixed(2))
        };
      }
    });

    // Cálculos de indicadores financieros clave
    const egresosTotalesMes = egresosMercaderia + egresosRecursos;
    const ticketPromedioMes = totalTicketsMes > 0 ? (ingresosTotalesMes / totalTicketsMes) : 0;

    // Consolidado final estructurado como Payload para Gemini
    const datosMasticadosMes = {
      periodo_analizado: periodoTexto,
      ingresos_totales_mes: ingresosTotalesMes.toFixed(2),
      egresos_totales_mes: egresosTotalesMes.toFixed(2),
      ticket_promedio_mes: ticketPromedioMes.toFixed(2),
      total_tickets_emitidos: totalTicketsMes,
      desglose_egresos: {
        mercaderia_inventario: egresosMercaderia.toFixed(2),
        recursos_internos_gastos: egresosRecursos.toFixed(2)
      },
      cliente_mas_fiel: {
        nombre: clienteMasFiel.nombre,
        telefono: clienteMasFiel.num,
        cantidad_visitas: clienteMasFiel.visitas,
        monto_total_comprado: clienteMasFiel.totalGastado.toFixed(2)
      }
    };


    // 8. LLAMADA COGNITIVA A GEMINI IA
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Actúa como un Consultor de Negocios y Analista Financiero de alto nivel para comercios minoristas locales (como tiendas de barrio, minimarkets, librerías, papelerías o bazares).
      Analiza la salud financiera de los últimos 30 días de operaciones del negocio basándote en los siguientes datos calculados:
      
      Opcional: Si a través de los datos del negocio o el contexto de los productos puedes deducir con total seguridad el rubro específico (ej: una librería/papelería por útiles/fotocopias, o un minimarket por abarrotes), adapta sutilmente tus referencias al tipo de negocio. De lo contrario, mantén un lenguaje adaptable.
      
      ${JSON.stringify(datosMasticadosMes, null, 2)}
      
      Escribe un reporte mensual estructurado utilizando exactamente los siguientes tres bloques independientes:
      
      ### 1. Diagnóstico Financiero Mensual
      (Calcula mentalmente la relación ingresos vs egresos para determinar el porcentaje de rendimiento bruto o margen de ganancia del mes de forma estimada. Describe en un párrafo profesional cómo se comportaron las finanzas y el ritmo comercial del negocio en este periodo de tiempo).
      
      ### 2. Auditoría de Gastos de Recurso (Fugas de Dinero)
      (Calcula qué porcentaje representan los gastos de recursos internos respecto a los ingresos totales del mes. Analiza de manera crítica si este gasto operativo es saludable o si representa un riesgo latente de fuga hormiga de capital. Brinda una alerta explícita y directa mencionando categorías o sugerencias de optimización).
      
      ### 3. Perfil del Cliente del Mes
      (Menciona de manera muy entusiasta, cercana y motivadora al cliente más fiel registrado en base a sus visitas y consumo total. Felicita sinceramente al(a) emprendedor(a) por su excelente trabajo de retención comunitaria y servicio al cliente).
      
      Mantén un tono estratégico, asertivo, libre de tecnicismos complejos y muy fácil de digerir, utilizando términos generales como "negocio", "comercio" o "empresa". Diseñado para leerse ágilmente desde pantallas móviles.
    `;

    const resultadoIA = await model.generateContent(prompt);
    const textoReporteFinal = resultadoIA.response.text();


    // 9. OPERACIÓN EN BASE DE DATOS: GUARDAR REPORTE MENSUAL
    const nuevoReporteRef = db.collection("reportes").doc();
    const documentoReporte = {
      empresa_id: empresaId,
      fecha_registro: Timestamp.now(),
      texto_reporte: textoReporteFinal,
      tipo_reporte: "Mensual",
      titulo: `Diagnóstico Mensual de Salud Financiera - ${periodoTexto}`
    };

    await nuevoReporteRef.set(documentoReporte);


    // 10. RESPUESTA EXITOSA AL FRONTEND
    return res.status(200).json({
      success: true,
      mensaje: "Reporte mensual de rendimiento generado con éxito.",
      data: documentoReporte
    });

  } catch (error) {
    logger.error("❌ Error crítico en generarReporteMensual:", error);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});


// 3 - REPORTE BIMESTRAL (60 DÍAS FLOTANTES)
// ***********************************************************************************************************************************

exports.generarReporteBimestral = onRequest({
  cors: ORIGEN_PERMITIDO,         // 1. CONTROL DE CORS
  secrets: ["GEMINI_API_KEY"]     // 2. CONTROL DE SEGURIDAD (Secret Manager)
}, async (req, res) => {
  try {
    // 3. VALIDACIÓN DE FIREBASE AUTH (Verificar Token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado. Falta el token." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      logger.error("Token inválido:", authError);
      return res.status(401).json({ error: "Sesión expirada. Vuelva a iniciar sesión." });
    }

    const uid = decodedToken.uid;

    // 4. VALIDACIÓN DE ROLES Y EMPRESA EN FIRESTORE
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return res.status(403).json({ error: "Usuario no registrado." });

    const userData = userDoc.data();
    if (userData.rol !== "administrador") {
      return res.status(403).json({ error: "Acceso denegado. Se requiere ser administrador." });
    }

    const empresaId = userData.empresa_id;
    const empresaDoc = await db.collection("empresas").doc(empresaId).get();
    if (!empresaDoc.exists) return res.status(404).json({ error: "La empresa no existe." });

    const empresaData = empresaDoc.data();
    if (!empresaData.activo) return res.status(403).json({ error: "Empresa inactiva." });


    // 5. 🚀 CÁLCULO DE VENTANA TEMPORAL: 60 DÍAS SIMÉTRICOS (ZONA HORARIA LIMA, PERÚ)
    const ahora = new Date();
    const fechaLima = ahora.toLocaleDateString("en-US", { timeZone: "America/Lima" });
    const [mes, dia, anio] = fechaLima.split("/");

    const mm = mes.padStart(2, "0");
    const dd = dia.padStart(2, "0");

    // Fin de toda la ventana: Hoy a las 23:59:59 hora de Perú
    const finPeriodoJs = new Date(`${anio}-${mm}-${dd}T23:59:59-05:00`);

    // Separación del bloque más reciente (Mes 2: últimos 30 días)
    const inicioMes2Js = new Date(finPeriodoJs);
    inicioMes2Js.setDate(inicioMes2Js.getDate() - 29);
    inicioMes2Js.setHours(0, 0, 0, 0);

    // Separación del bloque anterior (Mes 1: del día -30 al -59)
    const finMes1Js = new Date(inicioMes2Js);
    finMes1Js.setDate(finMes1Js.getDate() - 1);
    finMes1Js.setHours(23, 59, 59, 999);

    const inicioMes1Js = new Date(finMes1Js);
    inicioMes1Js.setDate(inicioMes1Js.getDate() - 29);
    inicioMes1Js.setHours(0, 0, 0, 0);

    // Timestamps absolutos para la query global de 60 días
    const inicioPeriodoGlobal = Timestamp.fromDate(inicioMes1Js);
    const finPeriodoGlobal = Timestamp.fromDate(finPeriodoJs);

    const opcionesTexto = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' };
    const periodoTexto = `${inicioMes1Js.toLocaleDateString("es-PE", opcionesTexto)} al ${finPeriodoJs.toLocaleDateString("es-PE", opcionesTexto)}`;

    logger.info(`🤖 Ejecutando Reporte Bimestral para el periodo: ${periodoTexto}. Empresa: ${empresaData.nombre_empresa}`);


    // 6. CONSULTA MULTIPLE DE CONSULTAS HISTÓRICAS (INCLUYENDO CATÁLOGO DE PRODUCTOS)
    const [ventasSnapshot, comprasSnapshot, recursosSnapshot, productosSimplesSnapshot] = await Promise.all([
      db.collection("ventas")
        .where("empresa_id", "==", empresaId)
        .where("fecha_hora", ">=", inicioPeriodoGlobal)
        .where("fecha_hora", "<=", finPeriodoGlobal)
        .get(),
      db.collection("compras")
        .where("empresa_id", "==", empresaId)
        .where("fecha", ">=", inicioPeriodoGlobal)
        .where("fecha", "<=", finPeriodoGlobal)
        .get(),
      db.collection("registro_compra_producto_recurso")
        .where("empresa_id", "==", empresaId)
        .where("fecha_compra", ">=", inicioPeriodoGlobal)
        .where("fecha_compra", "<=", finPeriodoGlobal)
        .get(),
      db.collection("productos_simples")
        .where("empresa_id", "==", empresaId)
        .get()
    ]);


    // 7. 🧹 CARPINTERÍA MATEMÁTICA EN NODE.JS

    // 7.1. Mapeo de producto_id -> categoria para análisis macro
    let mapaProductosCategorias = {};
    productosSimplesSnapshot.forEach(doc => {
      const p = doc.data();
      // Guardamos la categoría o la descripción de la categoría (priorizar texto amigable si existe)
      mapaProductosCategorias[doc.id] = p.categoria || p.id_categoria || "Sin Categoría";
    });

    let ingresosBimestre = 0;
    let ingresosMes1 = 0; // Bloque antiguo
    let ingresosMes2 = 0; // Bloque reciente

    let egresosMercaderia = 0;
    let egresosRecursos = 0;

    let totalProductosVendidosContador = 0;
    let productosPromoVendidosContador = 0;

    let clientesVipMap = {};
    let categoriasFacturacionMap = {};

    // Procesamiento de Ventas de los últimos 60 días
    ventasSnapshot.forEach(doc => {
      const data = doc.data();
      const totalVenta = data.total_venta || 0;
      ingresosBimestre += totalVenta;

      // Clasificación intermensual según el timestamp de Firestore
      if (data.fecha_hora) {
        const fechaVentaMs = data.fecha_hora.toMillis();
        if (fechaVentaMs >= inicioMes2Js.getTime()) {
          ingresosMes2 += totalVenta;
        } else {
          ingresosMes1 += totalVenta;
        }
      }

      // Auditoría de Clientes VIP (Filtro Ultra Estricto por Teléfono)
      const nombreCliente = (data.nombre_cliente || "").toString().trim();
      const numCliente = (data.num_cliente || "").toString().trim();

      if (nombreCliente !== "" && nombreCliente !== "Cliente Genérico" && numCliente !== "") {
        if (!clientesVipMap[numCliente]) {
          clientesVipMap[numCliente] = { nombre: nombreCliente, totalInvertido: 0 };
        }
        clientesVipMap[numCliente].totalInvertido += totalVenta;
      }

      // Desglose por Categorías y Conversión de Promociones
      const productosList = data.productos_vendidos || [];
      productosList.forEach(item => {
        const cant = item.cantidad || 0;
        totalProductosVendidosContador += cant;

        if (item.tipo_producto === "promoción") {
          productosPromoVendidosContador += cant;
        }

        // Determinar categoría del ítem vendido
        let categoriaAsignada = "Otros / Combos";
        if (item.tipo_producto === "producto simple") {
          categoriaAsignada = mapaProductosCategorias[item.producto_id] || "No Categorizado";
        } else if (item.tipo_producto === "promoción") {
          categoriaAsignada = "Promociones Especiales";
        }

        categoriasFacturacionMap[categoriaAsignada] = (categoriasFacturacionMap[categoriaAsignada] || 0) + (item.subtotal || 0);
      });
    });

    // Procesamiento de Egresos
    comprasSnapshot.forEach(doc => {
      egresosMercaderia += doc.data().costo_total_operacion || 0;
    });

    recursosSnapshot.forEach(doc => {
      egresosRecursos += doc.data().precio_compra || 0;
    });

    // Ordenar y extraer el TOP 3 de Clientes VIP
    const top3ClientesVip = Object.keys(clientesVipMap)
      .map(num => ({
        telefono: num,
        nombre: clientesVipMap[num].nombre,
        total_gastado_acumulado: Number(clientesVipMap[num].totalInvertido.toFixed(2))
      }))
      .sort((a, b) => b.total_gastado_acumulado - a.total_gastado_acumulado)
      .slice(0, 3);

    // Ordenar y extraer el TOP 3 de Categorías con Mayor Facturación
    const top3Categorias = Object.keys(categoriasFacturacionMap)
      .map(cat => ({
        categoria: cat,
        monto_facturado: Number(categoriasFacturacionMap[cat].toFixed(2))
      }))
      .sort((a, b) => b.monto_facturado - a.monto_facturado)
      .slice(0, 3);

    // Ratio de conversión de promociones
    const ratioConversion = totalProductosVendidosContador > 0
      ? (productosPromoVendidosContador / totalProductosVendidosContador) * 100
      : 0;

    const egresosTotalesBimestre = egresosMercaderia + egresosRecursos;

    // PAYLOAD INTEGRAL LISTO PARA LA IA
    const datosMasticadosBimestre = {
      periodo_completo: periodoTexto,
      metricas_financieras_bimestre: {
        ingresos_totales_60_dias: ingresosBimestre.toFixed(2),
        egresos_totales_60_dias: egresosTotalesBimestre.toFixed(2),
        inversion_en_mercaderia: egresosMercaderia.toFixed(2),
        gastos_en_recursos: egresosRecursos.toFixed(2)
      },
      comparativa_intermensual: {
        ingresos_primeros_30_dias: ingresosMes1.toFixed(2),
        ingresos_ultimos_30_dias: ingresosMes2.toFixed(2)
      },
      top_3_categorias_facturacion: top3Categorias,
      top_3_clientes_vip: top3ClientesVip,
      ratio_conversion_promociones: `${ratioConversion.toFixed(1)}%`
    };


    // 8. 🧠 LLAMADA COGNITIVA A GEMINI IA
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Actúa como un Director General de Estrategia Comercial y Consultor Corporativo Senior para comercios minoristas locales (como tiendas de barrio, minimarkets, librerías, papelerías o bazares).
      Analiza el rendimiento estratégico consolidado de los últimos 60 días del negocio basado en los siguientes datos analíticos:
      
      Opcional: Si a través de los datos del negocio o el contexto de las categorías puedes deducir con total seguridad el rubro específico (ej: una librería/papelería por venta de útiles y fotocopias, o una bodega por abarrotes), adapta sutilmente tus referencias al tipo de negocio. De lo contrario, mantén un lenguaje adaptable.
      
      ${JSON.stringify(datosMasticadosBimestre, null, 2)}
      
      Redacta un reporte gerencial estratégico utilizando exactamente la siguiente estructura de tres bloques independientes en formato limpio:
      
      ### 1. Análisis Macroeconómico del Negocio
      (Evalúa con rigurosidad la tendencia comparando los primeros 30 días contra los últimos 30 días. Determina si el negocio está en una fase de aceleración, estancamiento o contracción comercial. Examina si el balance de ingresos frente a la estructura de costos e inversión de mercadería proyecta un crecimiento saludable a mediano plazo).
      
      ### 2. Radiografía del Consumidor VIP
      (Analiza el peso financiero y la relevancia del TOP 3 de clientes VIP en la facturación total del bimestre. Redacta una estrategia comercial de fidelización comunitaria altamente personalizada y creativa para retener a este segmento de alto valor, sugiriendo mecánicas accionables o beneficios exclusivos enfocados en sus categorías principales).
      
      ### 3. Evaluación de Estrategia de Precios
      (Analiza el ratio de conversión de promociones. Determina si el porcentaje de productos vendidos bajo formato promocional está actuando eficazmente como un gancho para atraer volumen o si existe un riesgo latente de estar canibalizando el margen de ganancia neto del negocio. Proporciona una recomendación táctica de fijación de precios).
      
      Utiliza un lenguaje persuasivo, altamente estratégico y motivador, eliminando tecnicismos financieros abstractos para que sea directo, valioso y fácil de absorber en dispositivos móviles por el(la) emprendedor(a), utilizando términos generales como "negocio", "comercio" o "empresa".
    `;

    const resultadoIA = await model.generateContent(prompt);
    const textoReporteFinal = resultadoIA.response.text();


    // 9. OPERACIÓN EN BASE DE DATOS: GUARDAR REPORTE BIMESTRAL
    const nuevoReporteRef = db.collection("reportes").doc();
    const documentoReporte = {
      empresa_id: empresaId,
      fecha_registro: Timestamp.now(),
      texto_reporte: textoReporteFinal,
      tipo_reporte: "Bimestral",
      titulo: `Inteligencia Estratégica Bimestral - ${periodoTexto}`
    };

    await nuevoReporteRef.set(documentoReporte);


    // 10. RESPUESTA EXITOSA AL FRONTEND
    return res.status(200).json({
      success: true,
      mensaje: "Reporte estratégico bimestral generado con éxito.",
      data: documentoReporte
    });

  } catch (error) {
    logger.error("❌ Error crítico en generarReporteBimestral:", error);
    return res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
  }
});