import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Subscription, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { InventarioService } from '../../../../services/inventario.service';
import { ProductoSimpleDb, ProductoCompuestoDb } from '../../../../../shared/models/dto';

@Component({
  selector: 'app-agregar-prod-compuesto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './agregar-prod-compuesto.component.html',
  styleUrls: ['./agregar-prod-compuesto.component.css']
})
export class AgregarProdCompuestoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private inventarioService = inject(InventarioService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<AgregarProdCompuestoComponent>);
  isSubmitting = false;

  form!: FormGroup;
  miEmpresaId: string = '';
  catalogoProductosSimples: ProductoSimpleDb[] = [];
  activeDropdownIndex: number | null = null;

  get componentesFormArray(): FormArray {
    return this.form.get('productos_componentes') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    this.cargarDatosEmpresaYComponentes();
  }

  initForm(): void {
    this.form = this.fb.group({
      descripcion_prod_comp: ['', Validators.required],
      // 🌟 CAMBIO: Permitimos el 0 como mínimo para que no bloquee el inicio del formulario
      precio_venta_combo: [0, [Validators.required, Validators.min(0)]],
      productos_componentes: this.fb.array([])
    });
  }

  cargarDatosEmpresaYComponentes(): void {
    user(this.auth).pipe(
      take(1),
      switchMap(authUser => {
        if (!authUser) return of(null);
        return docData(doc(this.firestore, 'users', authUser.uid));
      }),
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) return of([]);
        this.miEmpresaId = userData.empresa_id;
        return this.inventarioService.obtenerProductosSimplesActivos(this.miEmpresaId);
      })
    ).subscribe({
      next: (productos) => {
        this.catalogoProductosSimples = productos;
        // Garantizamos que empiece con al menos 1 producto simple obligatorio
        if (this.componentesFormArray.length === 0) {
          this.agregarComponente();
        }
      },
      error: (err) => console.error('Error al precargar catálogo de productos', err)
    });
  }

  agregarComponente(): void {
    const grupo = this.fb.group({
      buscarTexto: ['', Validators.required],
      producto_simple_id: ['', Validators.required], // Campo oculto clave
      cantidad_necesaria: [1, [Validators.required, Validators.min(0.001)]],
      precio_compra_unitario: [0],
      unidad_medida: [''],
      marca: ['']
    });

    grupo.get('buscarTexto')?.valueChanges.subscribe(texto => {
      if (!texto || texto.trim() === '') {
        grupo.patchValue({ producto_simple_id: '', precio_compra_unitario: 0, unidad_medida: '', marca: '' }, { emitEvent: false });
      }
    });

    this.componentesFormArray.push(grupo);
  }

  eliminarComponente(index: number): void {
    // Regla de negocio: Mínimo debe quedar 1 producto seleccionado siempre
    if (this.componentesFormArray.length > 1) {
      this.componentesFormArray.removeAt(index);
      this.form.updateValueAndValidity();
    }
  }

  obtenerFiltrados(texto: string): ProductoSimpleDb[] {
    if (!texto || typeof texto !== 'string') return [];
    const query = texto.toLowerCase().trim();
    return this.catalogoProductosSimples.filter(p =>
      p.descripcion_prod.toLowerCase().includes(query)
    );
  }

  seleccionarProducto(index: number, producto: ProductoSimpleDb): void {
    const fila = this.componentesFormArray.at(index);
    fila.patchValue({
      buscarTexto: producto.descripcion_prod,
      producto_simple_id: producto.id,
      precio_compra_unitario: producto.precio_compra_unitario,
      unidad_medida: producto.unidad_medida || 'UND',
      marca: producto.marca_prod || 'Sin marca'
    });
    this.activeDropdownIndex = null;
    this.form.updateValueAndValidity();
  }

  // 🌟 CORRECCIÓN 2: Aseguramos el casteo numérico estricto usando Number()
  validarPrecioCombo(control: AbstractControl): ValidationErrors | null {
    const precioVenta = Number(control.get('precio_venta_combo')?.value || 0);
    const componentes = control.get('productos_componentes') as FormArray;

    if (!componentes || componentes.length === 0) return null;

    let costoTotalCombo = 0;
    componentes.controls.forEach(c => {
      const cantidad = Number(c.get('cantidad_necesaria')?.value || 0);
      const precioCompra = Number(c.get('precio_compra_unitario')?.value || 0);
      costoTotalCombo += (cantidad * precioCompra);
    });

    if (precioVenta < costoTotalCombo) {
      return { precioMenorAlCosto: true, costoMinimo: costoTotalCombo };
    }
    return null;
  }

  get totalCostoAcumulado(): number {
    let total = 0;
    this.componentesFormArray.controls.forEach(c => {
      const cant = Number(c.get('cantidad_necesaria')?.value || 0);
      const precio = Number(c.get('precio_compra_unitario')?.value || 0);
      total += (cant * precio);
    });
    return total;
  }

  cerrarModal(): void {
    this.dialogRef.close(false);
  }

  async guardarCombo(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.value;
    const precioVenta = Number(values.precio_venta_combo);
    const costoAcumulado = this.totalCostoAcumulado;

    // Validación manual de negocio previa al envío
    if (precioVenta < costoAcumulado) {
      const confirmacion = await Swal.fire({
        title: '¿Está seguro de continuar?',
        text: `El precio de venta (S/.${precioVenta.toFixed(2)}) es menor al costo acumulado total de sus componentes (S/.${costoAcumulado.toFixed(2)}).`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, registrar de todos modos',
        cancelButtonText: 'No, cancelar y cerrar todo'
      });

      // Si el usuario cancela, cerramos por completo el popup principal
      if (!confirmacion.isConfirmed) {
        this.cerrarModal();
        return;
      }
    }

    // Si pasó la alerta o el precio es correcto, se ejecuta el registro normal
    this.isSubmitting = true;
    try {
      const nuevoCombo: ProductoCompuestoDb = {
        activo: true,
        descripcion_prod_comp: values.descripcion_prod_comp,
        empresa_id: this.miEmpresaId,
        precio_venta_combo: precioVenta,
        productos_componentes: values.productos_componentes.map((c: any) => ({
          producto_simple_id: c.producto_simple_id,
          cantidad_necesaria: Number(c.cantidad_necesaria),
          precio_compra_unitario: Number(c.precio_compra_unitario)
        }))
      };

      await this.inventarioService.crearProductoCompuesto(nuevoCombo);
      this.toastr.success('Producto compuesto registrado exitosamente.', '¡Éxito!');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error al guardar el combo:', error);
      this.toastr.error('No se pudo registrar el combo en Firestore.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

}