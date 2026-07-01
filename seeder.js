const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// true = Solo simula en pantalla. false = Escribe en tu Firebase real.
const MODO_SIMULACRO = true; 

const serviceAccount = require("./serviceAccountKey.json");
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const EMPRESA_ID = "Tj3T6JWn5rCLXxkohscz"; 

// Cargar tus catálogos reales extraídos
const catalogos = require("./mis_catalogos_base.json");

const CLIENTES_FICTICIOS = [
  { nombre: "Roberto Jiménez", num: "+51999888777" },
  { nombre: "María Pia Tiburcio", num: "+51987654321" },
  { nombre: "Juan Carlos Miyagi", num: "+51955443322" },
  { nombre: "Ana Loayza", num: "+51911223344" },
  { nombre: "Carlos Tello", num: "+51966778899" }
];

// Generador de horas exclusivo para el 30 de Junio de 2026 (Mañana a Noche)
function generarFechaHora30Junio() {
  // Mes 5 en JavaScript es Junio (0 = Enero, 1 = Febrero... 5 = Junio)
  const d = new Date(2026, 5, 30); 
  
  // Horas aleatorias desde las 8 AM hasta las 9:59 PM (Hora 21)
  const hora = Math.floor(Math.random() * (22 - 8) + 8); 
  const minuto = Math.floor(Math.random() * 60);
  const segundo = Math.floor(Math.random() * 60);
  
  d.setHours(hora, minuto, segundo);
  
  // RETORNA EN TIMESTAMPS DE FIRESTORE
  return Timestamp.fromDate(d);
}

const randomArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function sembrarHistorialHoy() {
  console.log(`🤖 Iniciando generador estricto para el 30 de Junio de 2026...`);
  console.log(`🛡️ ¿Modo Simulacro Activo?: ${MODO_SIMULACRO ? "SÍ" : "NO (ESCRIBIENDO EN FIRESTORE)"}\n`);

  const productosSimples = (catalogos.productos_simples || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const promociones = (catalogos.promociones || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const prodCompuestos = (catalogos.prod_compuesto || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const productoRecurso = (catalogos.producto_recurso || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const formatsCompra = catalogos.formatos_compra || [];

  if (productosSimples.length === 0) {
    console.error("❌ Error: No hay productos simples activos.");
    return;
  }

  let totalVentasCreadas = 0;
  let totalComprasCreadas = 0;
  let totalGastosRecursoCreados = 0;

  // Forzamos un volumen de ventas intermedio/alto para el simulacro
  const cantidadVentasDelDia = Math.floor(Math.random() * (20 - 10) + 10);

  // --- 1. SIMULAR VENTAS (COLECCIÓN: ventas) ---
  for (let i = 0; i < cantidadVentasDelDia; i++) {
    const cliente = Math.random() > 0.4 ? randomArray(CLIENTES_FICTICIOS) : { nombre: "Cliente Genérico", num: "" };
    const fechaVenta = generarFechaHora30Junio(); // Genera Timestamp
    
    let productosVendidos = [];
    let totalVenta = 0;
    const itemsEnTicket = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < itemsEnTicket; j++) {
      const randTipo = Math.random();
      
      if (randTipo < 0.70 || (promociones.length === 0 && prodCompuestos.length === 0)) {
        const prod = randomArray(productosSimples);
        const cant = Math.floor(Math.random() * 2) + 1; 
        const subtotal = cant * prod.precio_venta_unitario;
        
        productosVendidos.push({
          producto_id: prod.id, // Respeta el UID original del producto simple
          tipo_producto: "producto simple",
          descripcion_prod_simple: prod.descripcion_prod,
          descripcion_promo: null,
          descripcion_prod_comp: null,
          cantidad: cant,
          precio_aplicado: prod.precio_venta_unitario,
          subtotal: Number(subtotal.toFixed(2))
        });
        totalVenta += subtotal;
        
      } else if (randTipo >= 0.70 && randTipo < 0.88 && promociones.length > 0) {
        const promo = randomArray(promociones);
        const prodAsociado = productosSimples.find(p => p.id === promo.producto_simple_id);
        const cantPaquetes = 1; 
        const subtotal = cantPaquetes * promo.promo_precio_total;

        productosVendidos.push({
          producto_id: promo.id, // Respeta el UID original de la promoción
          tipo_producto: "promoción",
          descripcion_prod_simple: prodAsociado ? prodAsociado.descripcion_prod : "Producto en Promo",
          descripcion_promo: promo.descripcion_promo,
          descripcion_prod_comp: null,
          cantidad: cantPaquetes,
          precio_aplicado: promo.promo_precio_total,
          subtotal: Number(subtotal.toFixed(2))
        });
        totalVenta += subtotal;

      } else if (prodCompuestos.length > 0) {
        const combo = randomArray(prodCompuestos);
        const cantCombos = 1;
        const subtotal = cantCombos * combo.precio_venta_combo;

        productosVendidos.push({
          producto_id: combo.id, // Respeta el UID original del combo compuesto
          tipo_producto: "compuesto",
          descripcion_prod_simple: null,
          descripcion_promo: null,
          descripcion_prod_comp: combo.descripcion_prod_comp,
          cantidad: cantCombos,
          precio_aplicado: combo.precio_venta_combo,
          subtotal: Number(subtotal.toFixed(2))
        });
        totalVenta += subtotal;
      }
    }

    const ticketVenta = {
      empresa_id: EMPRESA_ID,
      fecha_hora: fechaVenta, // TIMESTAMP
      nombre_cliente: cliente.nombre,
      num_cliente: cliente.num,
      productos_vendidos: productosVendidos,
      total_venta: Number(totalVenta.toFixed(2))
    };

    if (!MODO_SIMULACRO) {
      await db.collection("ventas").add(ticketVenta);
    }
    totalVentasCreadas++;
  }

  // --- 2. SIMULAR COMPRAS / REABASTECIMIENTO (COLECCIÓN: compras) ---
  // Forzamos la compra de 3 productos clave para cubrir el stock bajo detectado hoy
  const productosAComprar = 3; 
  
  for (let k = 0; k < productosAComprar; k++) {
    const prod = randomArray(productosSimples);
    const formato = (formatsCompra.length > 0) ? randomArray(formatsCompra) : { id: "Z5521NLXgIqJScEreEu8", descripcion_formato_compra: "Caja" };

    const cantidadFormatos = Math.floor(Math.random() * 3) + 2; // entre 2 y 4 cajas/sacos
    const unidadesPorFormato = 12; 
    const totalUnidades = cantidadFormatos * unidadesPorFormato;
    const costoTotalOp = totalUnidades * prod.precio_compra_unitario;
    const fechaCompra = generarFechaHora30Junio(); // Genera Timestamp

    const registroCompra = {
      empresa_id: EMPRESA_ID,
      fecha: fechaCompra, // TIMESTAMP
      id_producto: prod.id, // Respeta el UID original
      descripcion_producto: prod.descripcion_prod,
      formato_compra_id: formato.id,
      descripcion_formato_compra: formato.descripcion_formato_compra,
      cantidad_formato_comprado: cantidadFormatos,
      unidades_por_formato: unidadesPorFormato,
      total_unidades_ingresadas: totalUnidades,
      costo_por_formato: Number((costoTotalOp / cantidadFormatos).toFixed(2)),
      costo_total_operacion: Number(costoTotalOp.toFixed(2)),
      costo_unitario_calculado: prod.precio_compra_unitario
    };

    if (!MODO_SIMULACRO) {
      await db.collection("compras").add(registroCompra);
    }
    totalComprasCreadas++;
  }

  // --- 3. GASTOS RECURSOS INTERNOS (COLECCIÓN: registro_compra_producto_recurso) ---
  // Como hoy es 30 de junio (no es día 15), por defecto no generaría recursos,
  // pero forzamos 1 gasto pequeño de prueba para validar la estructura hoy.
  if (productoRecurso.length > 0) {
    const rec = randomArray(productoRecurso);
    const fechaGasto = generarFechaHora30Junio(); // Genera Timestamp

    const registroGasto = {
      activo: true,
      empresa_id: EMPRESA_ID,
      prod_recurso_id: rec.id, // Respeta el UID original de recursos
      descripcion_prod: rec.descripcion_prod,
      precio_compra: rec.precio_compra,
      fecha_compra: fechaGasto // TIMESTAMP
    };

    if (!MODO_SIMULACRO) {
      await db.collection("registro_compra_producto_recurso").add(registroGasto);
    }
    totalGastosRecursoCreados++;
  }

  console.log(`\n📊 --- RESUMEN DE EJECUCIÓN (FIJADO: 30-JUN-2026) ---`);
  console.log(`🛒 Colección 'ventas': ${totalVentasCreadas} documentos creados.`);
  console.log(`📦 Colección 'compras': ${totalComprasCreadas} documentos creados.`);
  console.log(`🧹 Colección 'registro_compra_producto_recurso': ${totalGastosRecursoCreados} documentos creados.`);
}

sembrarHistorialHoy().catch(console.error);