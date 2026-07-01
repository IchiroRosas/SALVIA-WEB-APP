process.env.TZ = "America/Lima";
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// true = Solo simula en pantalla. false = Escribe en tu Firebase real.
const MODO_SIMULACRO = false; 

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

/**
 * Genera un Timestamp de Firestore para una fecha específica,
 * asegurando el horario de atención de 8:00 AM a 9:59 PM (22:00 hrs).
 */
function generarFechaHoraAleatoria(fechaBase) {
  const d = new Date(fechaBase); 
  
  // Horas desde las 8 AM hasta las 9:59 PM (Hora 21)
  const hora = Math.floor(Math.random() * (22 - 8) + 8); 
  const minuto = Math.floor(Math.random() * 60);
  const segundo = Math.floor(Math.random() * 60);
  
  d.setHours(hora, minuto, segundo);
  
  return Timestamp.fromDate(d);
}

const randomArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function sembrarHistorialTresMeses() {
  console.log(`🤖 Iniciando generador histórico de 3 meses (Abril - Junio 2026)...`);
  console.log(`🛡️ ¿Modo Simulacro Activo?: ${MODO_SIMULACRO ? "SÍ" : "NO (ESCRIBIENDO EN FIRESTORE)"}\n`);

  const productosSimples = (catalogos.productos_simples || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const promociones = (catalogos.promociones || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const prodCompuestos = (catalogos.prod_compuesto || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const productoRecurso = (catalogos.producto_recurso || []).filter(p => p.activo && p.empresa_id === EMPRESA_ID);
  const formatsCompra = catalogos.formatos_compra || [];

  if (productosSimples.length === 0) {
    console.error("❌ Error: No hay productos simples activos en el catálogo.");
    return;
  }

  // Definición del rango: 3 meses atrás desde el 30 de junio de 2026
  // Meses en JS: 3 = Abril, 5 = Junio
  let fechaActual = new Date(2026, 3, 1); 
  const fechaFin = new Date(2026, 5, 30);

  let totalVentasCreadas = 0;
  let totalComprasCreadas = 0;
  let totalGastosRecursoCreados = 0;
  let diasProcesados = 0;

  // Bucle diario continuo
  while (fechaActual <= fechaFin) {
    const fechaString = fechaActual.toISOString().split('T')[0];
    diasProcesados++;

    // --- 1. SIMULAR VENTAS DIARIAS (Todos los días se vende) ---
    // Un flujo promedio para un minimarket pequeño: entre 6 y 15 ventas por día
    const cantidadVentasDelDia = Math.floor(Math.random() * (16 - 6) + 6);

    for (let i = 0; i < cantidadVentasDelDia; i++) {
      const cliente = Math.random() > 0.5 ? randomArray(CLIENTES_FICTICIOS) : { nombre: "Cliente Genérico", num: "" };
      const fechaVenta = generarFechaHoraAleatoria(fechaActual);
      
      let productosVendidos = [];
      let totalVenta = 0;
      const itemsEnTicket = Math.floor(Math.random() * 3) + 1; // 1 a 3 productos por compra
      
      for (let j = 0; j < itemsEnTicket; j++) {
        const randTipo = Math.random();
        
        // 75% Probabilidad de Producto Simple
        if (randTipo < 0.75 || (promociones.length === 0 && prodCompuestos.length === 0)) {
          const prod = randomArray(productosSimples);
          const cant = Math.floor(Math.random() * 2) + 1; 
          const subtotal = cant * prod.precio_venta_unitario;
          
          productosVendidos.push({
            producto_id: prod.id,
            tipo_producto: "producto simple",
            descripcion_prod_simple: prod.descripcion_prod,
            descripcion_promo: null,
            descripcion_prod_comp: null,
            cantidad: cant,
            precio_aplicado: prod.precio_venta_unitario,
            subtotal: Number(subtotal.toFixed(2))
          });
          totalVenta += subtotal;
          
        // 15% Probabilidad de Promociones
        } else if (randTipo >= 0.75 && randTipo < 0.90 && promociones.length > 0) {
          const promo = randomArray(promociones);
          const prodAsociado = productosSimples.find(p => p.id === promo.producto_simple_id);
          const cantPaquetes = 1; 
          const subtotal = cantPaquetes * promo.promo_precio_total;

          productosVendidos.push({
            producto_id: promo.id,
            tipo_producto: "promoción",
            descripcion_prod_simple: prodAsociado ? prodAsociado.descripcion_prod : "Producto en Promo",
            descripcion_promo: promo.descripcion_promo,
            descripcion_prod_comp: null,
            cantidad: cantPaquetes,
            precio_aplicado: promo.promo_precio_total,
            subtotal: Number(subtotal.toFixed(2))
          });
          totalVenta += subtotal;

        // 10% Probabilidad de Combos Compuestos
        } else if (prodCompuestos.length > 0) {
          const combo = randomArray(prodCompuestos);
          const cantCombos = 1;
          const subtotal = cantCombos * combo.precio_venta_combo;

          productosVendidos.push({
            producto_id: combo.id,
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
        fecha_hora: fechaVenta,
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

    // --- 2. SIMULAR REABASTECIMIENTO / COMPRAS (Intermitente) ---
    // Un negocio de 1 persona suele comprar stock de 2 a 3 veces por semana (~35% de probabilidad diaria)
    if (Math.random() < 0.35) {
      const productosAComprar = Math.floor(Math.random() * 2) + 1; // compra de 1 a 2 productos mayoristas
      
      for (let k = 0; k < productosAComprar; k++) {
        const prod = randomArray(productosSimples);
        const formato = (formatsCompra.length > 0) ? randomArray(formatsCompra) : { id: "Z5521NLXgIqJScEreEu8", descripcion_formato_compra: "Caja" };

        const cantidadFormatos = Math.floor(Math.random() * 3) + 1; // 1 a 3 cajas/sacos
        const unidadesPorFormato = formato.descripcion_formato_compra === "Saco" ? 50 : 12; 
        const totalUnidades = cantidadFormatos * unidadesPorFormato;
        const costoTotalOp = totalUnidades * prod.precio_compra_unitario;
        const fechaCompra = generarFechaHoraAleatoria(fechaActual);

        const registroCompra = {
          empresa_id: EMPRESA_ID,
          fecha: fechaCompra,
          id_producto: prod.id,
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
    }

    // --- 3. GASTOS RECURSOS INTERNOS (Esporádico) ---
    // Bolsas, insumos de limpieza, etc. (~15% de probabilidad de ocurrencia diaria)
    if (productoRecurso.length > 0 && Math.random() < 0.15) {
      const rec = randomArray(productoRecurso);
      const fechaGasto = generarFechaHoraAleatoria(fechaActual);

      const registroGasto = {
        activo: true,
        empresa_id: EMPRESA_ID,
        prod_recurso_id: rec.id,
        descripcion_prod: rec.descripcion_prod,
        precio_compra: rec.precio_compra,
        fecha_compra: fechaGasto
      };

      if (!MODO_SIMULACRO) {
        await db.collection("registro_compra_producto_recurso").add(registroGasto);
      }
      totalGastosRecursoCreados++;
    }

    // Avanzar un día en el calendario
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  console.log(`\n📊 --- RESUMEN DE PROCESAMIENTO HISTÓRICO ---`);
  console.log(`📅 Días procesados con éxito: ${diasProcesados}`);
  console.log(`🛒 Documentos inyectados en 'ventas': ${totalVentasCreadas}`);
  console.log(`📦 Documentos inyectados en 'compras': ${totalComprasCreadas}`);
  console.log(`🧹 Documentos inyectados en 'registro_compra_producto_recurso': ${totalGastosRecursoCreados}`);
  console.log(`🚀 Inyección completada exitosamente.`);
}

sembrarHistorialTresMeses().catch(console.error);