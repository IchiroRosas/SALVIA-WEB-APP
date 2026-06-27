import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Importación para el direccionamiento
import { TransaccionesService } from '../services/transacciones.service'
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registrar-compra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './registrar-compra.component.html',
  styleUrl: './registrar-compra.component.css'
})
export class RegistrarCompraComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private transaccionesService = inject(TransaccionesService);
  private router = inject(Router); // Inyección del router

  // Control de pestañas/vistas
  tipoProducto: 'simple' | 'recurso' = 'simple';
  empresaId: string | null = null;
  isSubmitting = false;

  // Formularios Reactivos
  compraSimpleForm!: FormGroup;
  compraRecursoForm!: FormGroup;

  // Catálogos desde BD
  formatsCompra: any[] = []; // mapeado abajo como formatosCompra
  formatosCompra: any[] = [];
  productosSimplesMaster: any[] = [];
  productosRecursoMaster: any[] = [];

  // Filtros / Control de Dropdowns
  productosSimplesFiltrados: any[] = [];
  productosRecursoFiltrados: any[] = [];
  showSimpleDropdown = false;
  showRecursoDropdown = false;

  // Campos de texto para inputs de búsqueda
  buscarSimpleStr = '';
  buscarRecursoStr = '';

  // Producto Seleccionado en memoria temporal
  productoSimpleSeleccionado: any = null;
  productoRecursoSeleccionado: any = null;

  // Control de Toasts Local
  toastMessage: string | null = null;
  showToast = false;

  private sub!: Subscription;

  ngOnInit(): void {
    this.initFormularios();
    this.sub = new Subscription();

    // 1. Obtener la empresa del usuario e inicializar flujos
    const empSub = this.transaccionesService.getEmpresaId().subscribe(empId => {
      if (empId) {
        this.empresaId = empId;
        this.cargarCatalogos();
      }
    });
    this.sub.add(empSub);

    // 2. Escuchar cambios para cálculos matemáticos en caliente
    this.setupCalculosSuscripciones();
  }

  initFormularios(): void {
    this.compraSimpleForm = this.fb.group({
      id_producto: ['', Validators.required],
      formato_compra_id: ['', Validators.required],
      descripcion_formato_compra: [''],
      cantidad_formato_comprado: [1, [Validators.required, Validators.min(1)]],
      unidades_por_formato: [1, [Validators.required, Validators.min(1)]],
      costo_por_formato: [0.00, [Validators.required, Validators.min(0.01)]],
      // Campos informativos calculados internamente
      costo_unitario_calculado: [{ value: 0, disabled: true }],
      total_unidades_ingresadas: [{ value: 0, disabled: true }],
      costo_total_operacion: [{ value: 0, disabled: true }]
    });

    this.compraRecursoForm = this.fb.group({
      prod_recurso_id: ['', Validators.required],
      descripcion_prod: [''],
      marca_prod: [{ value: '', disabled: true }],
      nombre_proveedor: [{ value: '', disabled: true }],
      precio_compra: [0.00, [Validators.required, Validators.min(0.01)]],
      cantidad: [0, [Validators.required, Validators.min(0.001)]], // Acepta decimales
      costo_total: [{ value: 0, disabled: true }]
    });
  }

  cargarCatalogos(): void {
    if (!this.empresaId) return;

    // Cargar formatos globales
    this.sub.add(this.transaccionesService.getFormatosCompra().subscribe(f => this.formatosCompra = f));

    // Cargar productos simples activos
    this.sub.add(this.transaccionesService.getProductosSimples(this.empresaId).subscribe(p => {
      this.productosSimplesMaster = p;
      this.filtrarProductosSimples(this.buscarSimpleStr);
    }));

    // Cargar productos de recurso activos
    this.sub.add(this.transaccionesService.getProductosRecurso(this.empresaId).subscribe(r => {
      this.productosRecursoMaster = r;
      this.filtrarProductosRecurso(this.buscarRecursoStr);
    }));
  }

  setupCalculosSuscripciones(): void {
    // Cálculos Producto Simple
    const simpleSub = this.compraSimpleForm.valueChanges.subscribe(() => {
      const cantFormato = this.compraSimpleForm.get('cantidad_formato_comprado')?.value || 0;
      const unidsPorFormato = this.compraSimpleForm.get('unidades_por_formato')?.value || 0;
      const costoFormato = this.compraSimpleForm.get('costo_por_formato')?.value || 0;

      const totalUnidades = cantFormato * unidsPorFormato;
      const costoTotalOp = cantFormato * costoFormato;
      const costoUnitCalc = unidsPorFormato > 0 ? (costoFormato / unidsPorFormato) : 0;

      this.compraSimpleForm.patchValue({
        total_unidades_ingresadas: totalUnidades,
        costo_total_operacion: costoTotalOp,
        costo_unitario_calculado: parseFloat(costoUnitCalc.toFixed(4))
      }, { emitEvent: false });
    });
    this.sub.add(simpleSub);

    // Cálculos Producto Recurso
    const recursoSub = this.compraRecursoForm.valueChanges.subscribe(() => {
      const precioUnit = this.compraRecursoForm.get('precio_compra')?.value || 0;
      const cantidad = this.compraRecursoForm.get('cantidad')?.value || 0;
      const costoTotal = precioUnit * cantidad;

      this.compraRecursoForm.patchValue({
        costo_total: parseFloat(costoTotal.toFixed(2))
      }, { emitEvent: false });
    });
    this.sub.add(recursoSub);
  }

  // --- LOGICA DE AUTOCOMPLETADO SIMPLE ---
  filtrarProductosSimples(val: string): void {
    const filterValue = val.toLowerCase().trim();
    if (!filterValue) {
      this.productosSimplesFiltrados = this.productosSimplesMaster;
    } else {
      this.productosSimplesFiltrados = this.productosSimplesMaster.filter(p =>
        p.descripcion_prod?.toLowerCase().includes(filterValue) ||
        p.marca_prod?.toLowerCase().includes(filterValue)
      );
    }
  }

  seleccionarProductoSimple(prod: any): void {
    this.productoSimpleSeleccionado = prod;
    this.buscarSimpleStr = prod.descripcion_prod;
    this.compraSimpleForm.patchValue({ id_producto: prod.id });
    this.showSimpleDropdown = false;
  }

  // --- LOGICA DE AUTOCOMPLETADO RECURSO ---
  filtrarProductosRecurso(val: string): void {
    const filterValue = val.toLowerCase().trim();
    if (!filterValue) {
      this.productosRecursoFiltrados = this.productosRecursoMaster;
    } else {
      this.productosRecursoFiltrados = this.productosRecursoMaster.filter(r =>
        r.descripcion_prod?.toLowerCase().includes(filterValue) ||
        r.marca_prod?.toLowerCase().includes(filterValue)
      );
    }
  }

  seleccionarProductoRecurso(recurso: any): void {
    this.productoRecursoSeleccionado = recurso;
    this.buscarRecursoStr = recurso.descripcion_prod;
    
    this.compraRecursoForm.patchValue({
      prod_recurso_id: recurso.id,
      descripcion_prod: recurso.descripcion_prod,
      marca_prod: recurso.marca_prod || 'Sin Marca',
      nombre_proveedor: recurso.nombre_proveedor,
      precio_compra: recurso.precio_compra || 0
    });
    this.showRecursoDropdown = false;
  }

  onFormatChange(event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    this.compraSimpleForm.patchValue({
      descripcion_formato_compra: selectedOption.text
    });
  }

  cambiarTipo(tipo: 'simple' | 'recurso'): void {
    this.tipoProducto = tipo;
  }

  evaluarLimpiezaCelda(tipo: 'simple' | 'recurso'): void {
    setTimeout(() => {
      if (tipo === 'simple' && !this.compraSimpleForm.get('id_producto')?.value) {
        this.buscarSimpleStr = '';
      }
      if (tipo === 'recurso' && !this.compraRecursoForm.get('prod_recurso_id')?.value) {
        this.buscarRecursoStr = '';
      }
      this.showSimpleDropdown = false;
      this.showRecursoDropdown = false;
    }, 200);
  }

  // --- GUARDADO / ACCION FINAL DE COMPRA ---
  async guardarCompra(): Promise<void> {
    if (!this.empresaId || this.isSubmitting) return;

    // 1. Validaciones preventivas de formularios
    if (this.tipoProducto === 'simple' && this.compraSimpleForm.invalid) return;
    if (this.tipoProducto === 'recurso' && this.compraRecursoForm.invalid) return;

    // 2. Lanzar SweetAlert2 antes de proceder
    const confirmacion = await Swal.fire({
      title: '¿Confirmar Compra?',
      text: `¿Estás seguro de que deseas registrar este abastecimiento de tipo ${this.tipoProducto === 'simple' ? 'Producto Simple' : 'Producto de Recurso'}?`,
      icon: 'question',
      showCancelButton: true,
      // Usamos el color corporativo que definiste en tu CSS para cada botón
      confirmButtonColor: this.tipoProducto === 'simple' ? '#2563eb' : '#ea580c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    // Si el usuario cancela, rompemos el flujo aquí de inmediato
    if (!confirmacion.isConfirmed) return;

    this.isSubmitting = true;

    try {
      if (this.tipoProducto === 'simple') {
        if (this.compraSimpleForm.invalid) return;

        const rawValues = this.compraSimpleForm.getRawValue();
        
        const compraPayload = {
          cantidad_formato_comprado: Number(rawValues.cantidad_formato_comprado),
          costo_por_formato: Number(rawValues.costo_por_formato),
          costo_total_operacion: Number(rawValues.costo_total_operacion),
          costo_unitario_calculado: Number(rawValues.costo_unitario_calculado),
          descripcion_formato_compra: rawValues.descripcion_formato_compra,
          descripcion_producto: this.productoSimpleSeleccionado.descripcion_prod,
          empresa_id: this.empresaId,
          fecha: new Date(),
          formato_compra_id: rawValues.formato_compra_id,
          id_producto: rawValues.id_producto,
          total_unidades_ingresadas: Number(rawValues.total_unidades_ingresadas),
          unidades_por_formato: Number(rawValues.unidades_por_formato)
        };

        const nuevoStock = (this.productoSimpleSeleccionado.stock_actual || 0) + compraPayload.total_unidades_ingresadas;
        const nuevoPrecioCompraUnitario = compraPayload.costo_unitario_calculado;

        await this.transaccionesService.registrarCompraSimple(
          compraPayload, 
          rawValues.id_producto, 
          nuevoStock, 
          nuevoPrecioCompraUnitario
        );

        this.triggerToast('¡Compra de Producto Simple registrada y stock actualizado con éxito!');

      } else {
        if (this.compraRecursoForm.invalid) return;

        const rawValues = this.compraRecursoForm.getRawValue();

        const registroPayload = {
          activo: true,
          descripcion_prod: rawValues.descripcion_prod,
          empresa_id: this.empresaId,
          fecha_compra: new Date(),
          precio_compra: Number(rawValues.precio_compra),
          cantidad: Number(rawValues.cantidad),
          prod_recurso_id: rawValues.prod_recurso_id
        };

        await this.transaccionesService.registrarCompraRecurso(
          registroPayload, 
          rawValues.prod_recurso_id, 
          registroPayload.precio_compra
        );

        this.triggerToast('¡Compra de Producto de Recurso registrada con éxito!');
      }

      this.limpiarFormulario();

    } catch (error) {
      console.error("Error al registrar la transacción de compra:", error);
      this.triggerToast('Ocurrió un error al procesar el guardado en base de datos.');
    } finally {
      this.isSubmitting = false;
    }
  }

  limpiarFormulario(): void {
    this.initFormularios();
    this.buscarSimpleStr = '';
    this.buscarRecursoStr = '';
    this.productoSimpleSeleccionado = null;
    this.productoRecursoSeleccionado = null;
    this.tipoProducto = 'simple';
    this.setupCalculosSuscripciones();
  }

  triggerToast(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = null;
    }, 4000);
  }

  // Método para el botón de regresar al menú/vista principal
  volver(): void {
    this.router.navigate(['/menu-principal']); // Cambia '/menu-principal' por la ruta interna exacta de tu app
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}