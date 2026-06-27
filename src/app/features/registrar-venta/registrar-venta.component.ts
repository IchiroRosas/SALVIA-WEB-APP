import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransaccionesService } from '../services/transacciones.service';
import { Subscription, combineLatest } from 'rxjs';
import Swal from 'sweetalert2';

interface CartItem {
  id: string; // ID único del item del carrito
  itemOriginalId: string; // ID en su respectiva colección de Firestore
  nombre: string;
  tipo: 'simple' | 'compuesto' | 'promocion';
  precioVenta: number;
  cantidad: number;
  subtotal: number;
  unidad_medida: string;
  // Desglose descriptivo para el payload de la BD
  descripcion_prod_simple: string | null;
  descripcion_promo: string | null;
  descripcion_prod_comp: string | null;
  // Array de componentes para la posterior reducción de stock en lote
  componentesSimples: { id_producto_simple: string; cantidadRequerida: number }[];
}

@Component({
  selector: 'app-registrar-venta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './registrar-venta.component.html',
  styleUrl: './registrar-venta.component.css'
})
export class RegistrarVentaComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private transaccionesService = inject(TransaccionesService);
  private router = inject(Router);

  empresaId: string | null = null;
  isSubmitting = false;
  ventaForm!: FormGroup;

  // Catálogos maestros desde Firestore
  productosSimples: any[] = [];
  productosCompuestos: any[] = [];
  promociones: any[] = [];

  // Lista unificada para la barra de búsqueda rápida
  productosUnificados: any[] = [];
  productosFiltrados: any[] = [];

  buscarProductoStr = '';
  showDropdown = false;
  itemSeleccionado: any = null;
  cantidadVenta: number = 1;

  // Estado del Carrito de Ventas
  carrito: CartItem[] = [];
  precioVentaTotal = 0;

  // Notificación Toast nativa integrada
  toastMessage: string | null = null;
  showToast = false;

  private sub!: Subscription;

  ngOnInit(): void {
    this.sub = new Subscription();
    this.initFormulario();

    // Obtener la empresa vinculada al usuario logeado
    const empSub = this.transaccionesService.getEmpresaId().subscribe(empId => {
      if (empId) {
        this.empresaId = empId;
        this.cargarCatalogosVenta();
      }
    });
    this.sub.add(empSub);
  }

  initFormulario(): void {
    this.ventaForm = this.fb.group({
      nombre_cliente: [''],
      telefono_cliente: ['']
    });
  }

  cargarCatalogosVenta(): void {
    if (!this.empresaId) return;

    // combineLatest actúa como un semáforo inteligente:
    // Espera a que las 3 colecciones respondan antes de activar el subscribe
    this.sub.add(
      combineLatest([
        this.transaccionesService.getProductosSimples(this.empresaId),
        this.transaccionesService.getProductosCompuestos(this.empresaId),
        this.transaccionesService.getPromociones(this.empresaId)
      ]).subscribe({
        next: ([simples, compuestos, promos]) => {
          // Asignamos toda la data junta asegurando que ninguna esté vacía
          this.productosSimples = simples;
          this.productosCompuestos = compuestos;
          this.promociones = promos;

          // Ahora que todo está en memoria, consolidamos con total seguridad
          this.consolidarProductosBusqueda();
        },
        error: (err) => {
          console.error('Error crítico al descargar catálogos de Firebase:', err);
        }
      })
    );
  }

  consolidarProductosBusqueda(): void {
    const unificados: any[] = [];

    // 0. Crear un mapa con todas las unidades de productos simples que ya están retenidas en el carrito
    const mapeoDemandaCarrito: { [key: string]: number } = {};
    this.carrito.forEach(cartItem => {
      cartItem.componentesSimples.forEach(comp => {
        const totalUnidades = comp.cantidadRequerida * cartItem.cantidad;
        mapeoDemandaCarrito[comp.id_producto_simple] = (mapeoDemandaCarrito[comp.id_producto_simple] || 0) + totalUnidades;
      });
    });

    // 1. Mapear Productos Simples
    this.productosSimples.forEach(p => {
      const unidadesEnCarrito = mapeoDemandaCarrito[p.id] || 0;
      const stockDisponible = Math.max(0, p.stock_actual - unidadesEnCarrito);
      const unidadMedidaLabel = p.unidad_medida || 'Unidad';

      unificados.push({
        id: p.id,
        nombre: p.descripcion_prod,
        tipo: 'simple',
        precio: p.precio_venta_unitario || 0,
        stock_render: stockDisponible,
        unidad_medida: unidadMedidaLabel,
        detalles: `Precio Reg: S/. ${p.precio_venta_unitario} • Stock: ${stockDisponible} ${unidadMedidaLabel} • Marca: ${p.marca_prod || 'Sin marca'}`,
        componentes: [{ id_producto_simple: p.id, cantidadRequerida: 1 }]
      });
    });

    // 2. Mapear Productos Compuestos
    this.productosCompuestos.forEach(c => {
      // Calculamos el stock disponible en base al inventario neto (restando el carrito)
      const stockCompuesto = this.calcularStockCompuestoMaximo(c.productos_componentes, mapeoDemandaCarrito);
      const unidadMedidaLabel = c.unidad_medida || 'Unidad';

      const infoComponentes = c.productos_componentes?.map((pa: any) => {
        const prodOriginal = this.productosSimples.find(ps => ps.id === pa.producto_simple_id);
        const nombreInsumo = prodOriginal ? prodOriginal.descripcion_prod : 'Insumo';
        const umInsumo = prodOriginal ? (prodOriginal.unidad_medida || 'Unidad') : 'Unidad';
        const marcaInsumo = prodOriginal ? (prodOriginal.marca_prod || 'Sin marca') : 'Sin marca';

        const cantReq = pa.cantidad_necesaria || pa.cantidad || 0;
        return `${cantReq} ${umInsumo} de ${nombreInsumo} (${marcaInsumo})`;
      }).join(', ') || 'Sin desglose';

      unificados.push({
        id: c.id,
        nombre: c.descripcion_prod_comp || 'Combo sin nombre',
        tipo: 'compuesto',
        precio: c.precio_venta_combo || 0,
        stock_render: stockCompuesto,
        unidad_medida: unidadMedidaLabel,
        detalles: `Precio: S/. ${c.precio_venta_combo || 0} • Stock: ${stockCompuesto} ${unidadMedidaLabel} • Incluye: ${infoComponentes}`,
        componentes: c.productos_componentes?.map((pa: any) => ({
          id_producto_simple: pa.producto_simple_id,
          // Mantener la consistencia del objeto mapeado para el carrito
          cantidadRequerida: pa.cantidad_necesaria || pa.cantidad || 1
        })) || []
      });
    });

    // 3. Mapear Promociones especiales
    this.promociones.forEach(pr => {
      const simpleAsociado = this.productosSimples.find(ps => ps.id === pr.producto_simple_id);
      const nombreSimple = simpleAsociado ? simpleAsociado.descripcion_prod : 'Producto no encontrado';

      // Validación de nombres de campo (usa el correcto de tu Firestore)
      const cantMinima = pr.cantidad_necesaria || pr.cantidad_minima_promocion || 0;
      const unidadesEnCarrito = mapeoDemandaCarrito[pr.producto_simple_id] || 0;
      const stockActualDisponible = simpleAsociado ? Math.max(0, simpleAsociado.stock_actual - unidadesEnCarrito) : 0;

      const stockPromo = (simpleAsociado && cantMinima > 0) ? Math.floor(stockActualDisponible / cantMinima) : 0;

      unificados.push({
        id: pr.id,
        nombre: pr.descripcion_promo || 'Promoción sin nombre',
        tipo: 'promocion',
        precio: pr.promo_precio_total || 0,
        stock_render: stockPromo,
        unidad_medida: 'Promoción',
        detalles: `Oferta: ${cantMinima} unidades de [${nombreSimple}] a S/. ${pr.promo_precio_total || 0} • Stock: ${stockPromo}`,
        componentes: [{ id_producto_simple: pr.producto_simple_id, cantidadRequerida: cantMinima }]
      });
    });

    this.productosUnificados = unificados;
    this.filtrarProductos(this.buscarProductoStr);
  }

  calcularStockCompuestoMaximo(productosComponentes: any[], demandaCarrito: { [key: string]: number } = {}): number {
    if (!productosComponentes || productosComponentes.length === 0) return 0;
    let maximoPosible = Infinity;

    for (const pa of productosComponentes) {
      const simple = this.productosSimples.find(ps => ps.id === pa.producto_simple_id);
      if (!simple) return 0;

      // ¡ALERTA! Asegúrate de que aquí se use el nombre exacto de tu campo en Firestore 
      // Si en tu BD se llama 'cantidad', cámbialo a: pa.cantidad
      const cantidadRequeridaEnCombo = pa.cantidad_necesaria || pa.cantidad || 1;

      // Restamos las unidades que ya están comprometidas en el carrito de compras
      const unidadesEnCarrito = demandaCarrito[pa.producto_simple_id] || 0;
      const stockDisponibleReal = Math.max(0, (simple.stock_actual || 0) - unidadesEnCarrito);

      // Calculamos cuántos compuestos completos podemos armar con el stock neto disponible
      const disponible = Math.floor(stockDisponibleReal / cantidadRequeridaEnCombo);

      if (disponible < maximoPosible) {
        maximoPosible = disponible;
      }
    }

    return maximoPosible === Infinity ? 0 : maximoPosible;
  }

  filtrarProductos(val: string): void {
    const filterValue = (val || '').toLowerCase().trim();
    if (!filterValue) {
      this.productosFiltrados = this.productosUnificados;
    } else {
      this.productosFiltrados = this.productosUnificados.filter(p => {
        const nombreOk = p.nombre ? p.nombre.toLowerCase().includes(filterValue) : false;
        const tipoOk = p.tipo ? p.tipo.toLowerCase().includes(filterValue) : false;
        return nombreOk || tipoOk;
      });
    }
  }

  seleccionarProducto(prod: any): void {
    this.itemSeleccionado = prod;
    this.buscarProductoStr = prod.nombre;
    this.showDropdown = false;
    this.cantidadVenta = 1;
  }

  agregarAlCarrito(): void {
    if (!this.itemSeleccionado || this.cantidadVenta <= 0) return;

    const esSimple = this.itemSeleccionado.tipo === 'simple';
    const minPermitido = esSimple ? 0.001 : 1;

    if (this.cantidadVenta < minPermitido) {
      Swal.fire({
        title: 'Cantidad no permitida',
        text: `La cantidad mínima para este artículo es de ${minPermitido}.`,
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (!esSimple && this.cantidadVenta % 1 !== 0) {
      Swal.fire({
        title: 'Cantidad inválida',
        text: 'Para promociones y productos compuestos únicamente se admiten números enteros.',
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const mapeoDemandaSimple: { [key: string]: number } = {};

    this.carrito.forEach(cartItem => {
      cartItem.componentesSimples.forEach(comp => {
        const totalUnidades = comp.cantidadRequerida * cartItem.cantidad;
        mapeoDemandaSimple[comp.id_producto_simple] = (mapeoDemandaSimple[comp.id_producto_simple] || 0) + totalUnidades;
      });
    });

    let stockSuficiente = true;
    let mensajeErrorStock = '';

    for (const comp of this.itemSeleccionado.componentes) {
      const demandaProyectada = (comp.cantidadRequerida * this.cantidadVenta);
      const demandaExistente = mapeoDemandaSimple[comp.id_producto_simple] || 0;
      const demandaTotal = demandaExistente + demandaProyectada;

      const productoOriginal = this.productosSimples.find(ps => ps.id === comp.id_producto_simple);
      const stockRealBodega = productoOriginal ? productoOriginal.stock_actual : 0;

      if (demandaTotal > stockRealBodega) {
        stockSuficiente = false;
        mensajeErrorStock = `Stock insuficiente de [${productoOriginal?.descripcion_prod || 'Insumo Base'}]. Se requieren ${demandaProyectada} unidades, pero sumando el carrito solo quedan ${stockRealBodega - demandaExistente} disponibles en almacén.`;
        break;
      }
    }

    if (!stockSuficiente) {
      Swal.fire({
        title: 'Límite de Stock Superado',
        text: mensajeErrorStock,
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const itemExistente = this.carrito.find(c => c.itemOriginalId === this.itemSeleccionado.id && c.tipo === this.itemSeleccionado.tipo);

    if (itemExistente) {
      itemExistente.cantidad += this.cantidadVenta;
      itemExistente.subtotal = itemExistente.cantidad * itemExistente.precioVenta;
    } else {
      this.carrito.push({
        id: Math.random().toString(36).substring(2, 9),
        itemOriginalId: this.itemSeleccionado.id,
        nombre: this.itemSeleccionado.nombre,
        tipo: this.itemSeleccionado.tipo,
        precioVenta: this.itemSeleccionado.precio,
        cantidad: this.cantidadVenta,
        subtotal: this.itemSeleccionado.precio * this.cantidadVenta,
        unidad_medida: this.itemSeleccionado.tipo === 'simple' ? (this.itemSeleccionado.unidad_medida || 'Unidad') : '---',
        descripcion_prod_simple: this.itemSeleccionado.tipo === 'simple' ? this.itemSeleccionado.nombre : null,
        descripcion_promo: this.itemSeleccionado.tipo === 'promocion' ? this.itemSeleccionado.nombre : null,
        descripcion_prod_comp: this.itemSeleccionado.tipo === 'compuesto' ? this.itemSeleccionado.nombre : null,
        componentesSimples: this.itemSeleccionado.componentes
      });
    }

    this.recalcularTotalVenta();
    this.consolidarProductosBusqueda();
    this.resetearSeleccionFiltro();
  }

  eliminarDelCarrito(index: number): void {
    this.carrito.splice(index, 1);
    this.recalcularTotalVenta();
    this.consolidarProductosBusqueda();
  }

  recalcularTotalVenta(): void {
    this.precioVentaTotal = this.carrito.reduce((acc, curr) => acc + curr.subtotal, 0);
  }

  resetearSeleccionFiltro(): void {
    this.itemSeleccionado = null;
    this.buscarProductoStr = '';
    this.cantidadVenta = 1;
    this.filtrarProductos('');
  }

  evaluarLimpiezaCelda(): void {
    setTimeout(() => {
      if (!this.itemSeleccionado) {
        this.buscarProductoStr = '';
      }
      this.showDropdown = false;
    }, 250);
  }

  async procesarRegistroVenta(): Promise<void> {
    if (!this.empresaId || this.carrito.length === 0 || this.isSubmitting) return;

    const confirmacion = await Swal.fire({
      title: '¿Confirmar Operación de Venta?',
      text: `Se va a registrar la salida de ${this.carrito.length} líneas de productos por un importe total de S/. ${this.precioVentaTotal.toFixed(2)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Completar Venta',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!confirmacion.isConfirmed) return;

    this.isSubmitting = true;

    try {
      const clientFormValues = this.ventaForm.value;

      const productosVendidosPayload = this.carrito.map(item => ({
        cantidad: item.cantidad,
        precio_aplicado: item.precioVenta,
        subtotal: item.subtotal,
        tipo_producto: item.tipo,
        descripcion_prod_simple: item.descripcion_prod_simple,
        descripcion_promo: item.descripcion_promo,
        descripcion_prod_comp: item.descripcion_prod_comp,
        producto_id: item.itemOriginalId
      }));

      const ventaFinalPayload = {
        empresa_id: this.empresaId,
        fecha_hora: new Date(),
        total_venta: this.precioVentaTotal,
        nombre_cliente: clientFormValues.nombre_cliente || 'NO ESPECIFICADO',
        num_cliente: clientFormValues.telefono_cliente || 'NO ESPECIFICADO',
        productos_vendidos: productosVendidosPayload
      };

      const mapaDescuentosInventario: { [key: string]: number } = {};
      this.carrito.forEach(item => {
        item.componentesSimples.forEach(comp => {
          const totalADescontar = comp.cantidadRequerida * item.cantidad;
          mapaDescuentosInventario[comp.id_producto_simple] = (mapaDescuentosInventario[comp.id_producto_simple] || 0) + totalADescontar;
        });
      });

      await this.transaccionesService.ejecutarTransaccionVenta(ventaFinalPayload, mapaDescuentosInventario);

      this.triggerToast('¡Venta procesada con éxito y stock actualizado en tiempo real!');
      this.limpiarModuloCompleto();

    } catch (err) {
      console.error("Fallo crítico en el guardado de la venta:", err);
      this.triggerToast('Ocurrió un error inesperado al guardar la venta en Firebase.');
    } finally {
      this.isSubmitting = false;
    }
  }

  limpiarModuloCompleto(): void {
    this.carrito = [];
    this.precioVentaTotal = 0;
    this.initFormulario();
    this.consolidarProductosBusqueda();
    this.resetearSeleccionFiltro();
  }

  triggerToast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = null;
    }, 4000);
  }

  volver(): void {
    this.router.navigate(['/menu-principal']);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}