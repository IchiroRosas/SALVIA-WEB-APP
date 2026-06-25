import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransaccionesService } from '../services/transacciones.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

interface CartItem {
  id: string; // ID único del item del carrito
  itemOriginalId: string; // ID en su respectiva colección de Firestore
  nombre: string;
  tipo: 'simple' | 'compuesto' | 'promocion';
  precioVenta: number;
  cantidad: number;
  subtotal: number;
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

    // Suscripción triple optimizada en paralelo
    this.sub.add(this.transaccionesService.getProductosSimples(this.empresaId).subscribe(simples => {
      this.productosSimples = simples;
      this.consolidarProductosBusqueda();
    }));

    this.sub.add(this.transaccionesService.getProductosCompuestos(this.empresaId).subscribe(compuestos => {
      this.productosCompuestos = compuestos;
      console.log('Productos Compuestos cargados:', compuestos);
      this.consolidarProductosBusqueda();
    }));

    this.sub.add(this.transaccionesService.getPromociones(this.empresaId).subscribe(promos => {
      this.promociones = promos;
      this.consolidarProductosBusqueda();
    }));
  }

  consolidarProductosBusqueda(): void {
    const unificados: any[] = [];

    // 1. Mapear Productos Simples
    this.productosSimples.forEach(p => {
      const nombreCompleto = p.descripcion_prod;
      const unidadMedidaLabel = p.unidad_medida || 'Unidad';

      unificados.push({
        id: p.id,
        nombre: nombreCompleto,
        tipo: 'simple',
        precio: p.precio_venta_unitario || 0,
        stock_render: p.stock_actual,
        unidad_medida: unidadMedidaLabel,
        detalles: `Precio Reg: S/. ${p.precio_venta_unitario} • Stock: ${p.stock_actual} ${unidadMedidaLabel} • Marca: ${p.marca_prod || 'Sin marca'}`,
        componentes: [{ id_producto_simple: p.id, cantidadRequerida: 1 }]
      });
    });

    // 2. Mapear Productos Compuestos (Modificado para alternar marcas y U.M en los componentes internos)
    this.productosCompuestos.forEach(c => {
      const infoComponentes = c.productos_componentes?.map((pa: any) => {
        const prodOriginal = this.productosSimples.find(ps => ps.id === pa.producto_simple_id);
        const nombreInsumo = prodOriginal ? prodOriginal.descripcion_prod : 'Insumo';
        // Extraemos dinámicamente la marca y unidad de medida del producto simple original
        const umInsumo = prodOriginal ? (prodOriginal.unidad_medida || 'Unidad') : 'Unidad';
        const marcaInsumo = prodOriginal ? (prodOriginal.marca_prod || 'Sin marca') : 'Sin marca';
        
        return `${pa.cantidad_necesaria} ${umInsumo} de ${nombreInsumo} (${marcaInsumo})`;
      }).join(', ') || 'Sin desglose';

      const stockCompuesto = this.calcularStockCompuestoMaximo(c.productos_componentes);
      const unidadMedidaLabel = c.unidad_medida || 'Unidad';

      unificados.push({
        id: c.id,
        nombre: c.descripcion_prod_comp || 'Combo sin nombre',
        tipo: 'compuesto',
        precio: c.precio_venta_combo || 0,
        stock_render: stockCompuesto,
        unidad_medida: unidadMedidaLabel,
        // Modificado: Se quitó la marca del combo superior y se enriqueció la lista de 'Incluye'
        detalles: `Precio: S/. ${c.precio_venta_combo || 0} • Stock: ${stockCompuesto} ${unidadMedidaLabel} • Incluye: ${infoComponentes}`,
        componentes: c.productos_componentes?.map((pa: any) => ({
          id_producto_simple: pa.producto_simple_id,
          cantidadRequerida: pa.cantidad_necesaria
        })) || []
      });
    });

    // 3. Mapear Promociones especiales
    this.promociones.forEach(pr => {
      const simpleAsociado = this.productosSimples.find(ps => ps.id === pr.id_producto_simple);
      const nombreSimple = simpleAsociado ? simpleAsociado.descripcion_prod : 'Prod Simple';
      const stockPromo = simpleAsociado ? Math.floor(simpleAsociado.stock_actual / pr.cantidad_minima) : 0;

      unificados.push({
        id: pr.id,
        nombre: pr.nombre_promocion,
        tipo: 'promocion',
        precio: pr.precio_oferta || 0,
        stock_render: stockPromo,
        unidad_medida: 'Promoción',
        detalles: `Oferta: ${pr.cantidad_minima} unidades de [${nombreSimple}] a precio especial • Stock disp: ${stockPromo}`,
        componentes: [{ id_producto_simple: pr.id_producto_simple, cantidadRequerida: pr.cantidad_minima }]
      });
    });

    this.productosUnificados = unificados;
    this.filtrarProductos(this.buscarProductoStr);
  }

  calcularStockCompuestoMaximo(productosComponentes: any[]): number {
    if (!productosComponentes || productosComponentes.length === 0) return 0;
    let maximoPosible = Infinity;

    for (const pa of productosComponentes) {
      const simple = this.productosSimples.find(ps => ps.id === pa.producto_simple_id);
      if (!simple) return 0;

      const disponible = Math.floor((simple.stock_actual || 0) / (pa.cantidad_necesaria || 1));
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
        descripcion_prod_simple: this.itemSeleccionado.tipo === 'simple' ? this.itemSeleccionado.nombre : null,
        descripcion_promo: this.itemSeleccionado.tipo === 'promocion' ? this.itemSeleccionado.detalles : null,
        descripcion_prod_comp: this.itemSeleccionado.tipo === 'compuesto' ? this.itemSeleccionado.nombre : null,
        componentesSimples: this.itemSeleccionado.componentes
      });
    }

    this.recalcularTotalVenta();
    this.resetearSeleccionFiltro();
  }

  eliminarDelCarrito(index: number): void {
    this.carrito.splice(index, 1);
    this.recalcularTotalVenta();
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
        amount: item.cantidad,
        precio_unitario: item.precioVenta,
        subtotal: item.subtotal,
        tipo_producto: item.tipo,
        descripcion_prod_simple: item.descripcion_prod_simple,
        descripcion_promo: item.descripcion_promo,
        descripcion_prod_comp: item.descripcion_prod_comp
      }));

      const ventaFinalPayload = {
        empresa_id: this.empresaId,
        fecha_venta: new Date(),
        total_venta: this.precioVentaTotal,
        nombre_cliente: clientFormValues.nombre_cliente || 'Cliente Genérico / Ambulante',
        telefono_cliente: clientFormValues.telefono_cliente || null,
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