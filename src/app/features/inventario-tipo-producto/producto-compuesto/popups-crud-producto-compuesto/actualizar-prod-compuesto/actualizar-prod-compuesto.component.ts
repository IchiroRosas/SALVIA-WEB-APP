import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { of, combineLatest } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { InventarioService } from '../../../../services/inventario.service';
import { ProductoSimpleDb, ProductoCompuestoDb } from '../../../../../shared/models/dto';

@Component({
  selector: 'app-actualizar-prod-compuesto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './actualizar-prod-compuesto.component.html',
  styleUrls: ['./actualizar-prod-compuesto.component.css']
})
export class ActualizarProdCompuestoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private inventarioService = inject(InventarioService);
  private toastr = inject(ToastrService);
  private dialogRef = inject(MatDialogRef<ActualizarProdCompuestoComponent>);

  // Recibimos el objeto con el ID enviado desde la tabla ({ idCombo: '...' })
  public dataInput = inject<{ idCombo: string }>(MAT_DIALOG_DATA);

  form!: FormGroup;
  miEmpresaId: string = '';
  catalogoProductosSimples: ProductoSimpleDb[] = [];
  comboCompletoDb!: ProductoCompuestoDb & { id: string }; // Guardará los datos cargados de la BD
  activeDropdownIndex: number | null = null;
  cargando: boolean = true; // Flag visual para el HTML mientras descarga de Firebase

  // Exponemos la función nativa Number para que el HTML pueda realizar cálculos dinámicos inline
  public readonly Number = Number;

  get componentesFormArray(): FormArray {
    return this.form.get('productos_componentes') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    this.cargarDatosEInyectarValores();
  }

  initForm(): void {
    // Inicializa el cascarón del formulario vacío
    this.form = this.fb.group({
      descripcion_prod_comp: ['', Validators.required],
      precio_venta_combo: [0, [Validators.required, Validators.min(0.01)]],
      productos_componentes: this.fb.array([])
    }, { validators: this.validarPrecioCombo });
  }

  cargarDatosEInyectarValores(): void {
    user(this.auth).pipe(
      take(1),
      switchMap(authUser => {
        if (!authUser) return of(null);
        return docData(doc(this.firestore, 'users', authUser.uid));
      }),
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) return of(null);
        this.miEmpresaId = userData.empresa_id;

        // Traemos en paralelo: catálogo de productos activos Y el documento del combo por su ID
        return combineLatest({
          simples: this.inventarioService.obtenerProductosSimplesActivos(this.miEmpresaId).pipe(take(1)),
          comboRaw: docData(doc(this.firestore, 'prod_compuesto', this.dataInput.idCombo)).pipe(take(1))
        });
      })
    ).subscribe({
      next: (resultado) => {
        if (!resultado || !resultado.comboRaw) {
          this.toastr.error('No se pudo encontrar la información del combo.', 'Error');
          this.cerrarModal();
          return;
        }

        this.catalogoProductosSimples = resultado.simples;
        this.comboCompletoDb = { id: this.dataInput.idCombo, ...resultado.comboRaw as ProductoCompuestoDb };

        // Seteamos los valores principales recuperados en el formulario
        this.form.patchValue({
          descripcion_prod_comp: this.comboCompletoDb.descripcion_prod_comp,
          precio_venta_combo: this.comboCompletoDb.precio_venta_combo
        });

        // Rehidratamos el FormArray cruzando los IDs guardados con tu catálogo real
        this.rehidratarComponentesExistentes();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos en la edición', err);
        this.toastr.error('Error de conexión al cargar el combo.');
        this.cerrarModal();
      }
    });
  }

  rehidratarComponentesExistentes(): void {
    if (this.comboCompletoDb.productos_componentes && this.comboCompletoDb.productos_componentes.length > 0) {
      this.comboCompletoDb.productos_componentes.forEach(comp => {
        const match = this.catalogoProductosSimples.find(p => p.id === comp.producto_simple_id);
        
        this.agregarComponenteConDatos({
          buscarTexto: match ? match.descripcion_prod : 'Producto no disponible',
          producto_simple_id: comp.producto_simple_id,
          cantidad_necesaria: comp.cantidad_necesaria,
          precio_compra_unitario: match ? match.precio_compra_unitario : 0,
          unidad_medida: match ? (match.unidad_medida || 'UND') : 'UND',
          marca: match ? (match.marca_prod || 'Sin marca') : 'Sin marca'
        });
      });
    } else {
      this.agregarComponente();
    }
  }

  agregarComponenteConDatos(datos: any): void {
    const grupo = this.fb.group({
      buscarTexto: [datos.buscarTexto, Validators.required],
      producto_simple_id: [datos.producto_simple_id, Validators.required],
      cantidad_necesaria: [datos.cantidad_necesaria, [Validators.required, Validators.min(0.001)]],
      precio_compra_unitario: [datos.precio_compra_unitario],
      unidad_medida: [datos.unidad_medida],
      marca: [datos.marca]
    });

    grupo.get('buscarTexto')?.valueChanges.subscribe(texto => {
      if (!texto || texto.trim() === '') {
        grupo.patchValue({ producto_simple_id: '', precio_compra_unitario: 0, unidad_medida: '', marca: '' }, { emitEvent: false });
      }
    });

    this.componentesFormArray.push(grupo);
  }

  agregarComponente(): void {
    this.agregarComponenteConDatos({ buscarTexto: '', producto_simple_id: '', cantidad_necesaria: 1, precio_compra_unitario: 0, unidad_medida: '', marca: '' });
  }

  eliminarComponente(index: number): void {
    if (this.componentesFormArray.length > 1) {
      this.componentesFormArray.removeAt(index);
      this.form.updateValueAndValidity();
    }
  }

  obtenerFiltrados(texto: string): ProductoSimpleDb[] {
    if (!texto || typeof texto !== 'string') return [];
    const query = texto.toLowerCase().trim();
    return this.catalogoProductosSimples.filter(p => p.descripcion_prod.toLowerCase().includes(query));
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

  async actualizarCombo(): Promise<void> {
    if (this.form.invalid || !this.comboCompletoDb?.id) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      const values = this.form.value;
      const comboActualizado: Partial<ProductoCompuestoDb> = {
        descripcion_prod_comp: values.descripcion_prod_comp,
        precio_venta_combo: Number(values.precio_venta_combo),
        productos_componentes: values.productos_componentes.map((c: any) => ({
          producto_simple_id: c.producto_simple_id,
          cantidad_necesaria: Number(c.cantidad_necesaria)
        }))
      };

      await this.inventarioService.actualizarProductoCompuesto(this.comboCompletoDb.id, comboActualizado);
      this.toastr.success('Producto compuesto actualizado exitosamente.', '¡Éxito!');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error al actualizar:', error);
      this.toastr.error('No se pudo guardar los cambios.', 'Error');
    }
  }

}