import { Component, OnInit, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { InventarioService } from '../../../../services/inventario.service';
import { ProductoSimpleDb } from '../../../../../shared/models/dto';

@Component({
  selector: 'app-actualizar-promocion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './actualizar-promocion.component.html',
  styleUrl: './actualizar-promocion.component.css'
})
export class ActualizarPromocionComponent {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<ActualizarPromocionComponent>);
  private toastr = inject(ToastrService);
  private inventarioService = inject(InventarioService);

  // 🌟 Recibir ID enviado desde el componente padre
  private dialogData = inject(MAT_DIALOG_DATA);
  promoId: string = this.dialogData?.id;

  promoForm!: FormGroup;
  empresaId: string | null = null;

  productosSimples: ProductoSimpleDb[] = [];
  productosFiltrados$!: Observable<ProductoSimpleDb[]>;
  productoSeleccionado: ProductoSimpleDb | null = null;
  mostrarDropdown = false;

  costoAcumulado = 0;
  mostrarAdvertenciaMargen = false;

  ngOnInit(): void {
    if (!this.promoId) {
      this.toastr.error('No se especificó un identificador de promoción válido.', 'Error');
      this.dialogRef.close(false);
      return;
    }

    this.inicializarFormulario();

    user(this.auth).pipe(
      switchMap(authUser => {
        if (!authUser) return of(null);
        return docData(doc(this.firestore, 'users', authUser.uid));
      }),
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) return of(null);
        this.empresaId = userData.empresa_id;

        // 🌟 Combinamos la descarga de productos activos junto con la promoción por ID
        return combineLatest([
          this.inventarioService.obtenerProductosSimplesActivos(this.empresaId!),
          this.inventarioService.obtenerPromocionPorId(this.promoId)
        ]).pipe(
          map(([productos, promocion]) => ({ productos, promocion }))
        );
      })
    ).subscribe({
      next: (res: any) => {
        if (!res) return;
        this.productosSimples = res.productos.filter((p: any) => p.activo === true);
        this.configurarBuscadorPredictivo();

        if (res.promocion) {
          this.precargarFormulario(res.promocion);
        } else {
          this.toastr.error('La promoción seleccionada no existe o fue eliminada.', 'Error');
          this.dialogRef.close(false);
        }
      },
      error: (err) => console.error('Error al sincronizar datos del servidor:', err)
    });

    this.observarCambiosDeCostos();
  }

  private inicializarFormulario(): void {
    this.promoForm = this.fb.group({
      buscarProducto: [{ value: '', disabled: true }, Validators.required],
      producto_simple_id: ['', Validators.required],
      descripcion_promo: ['', [Validators.required, Validators.minLength(3)]],
      cantidad_necesaria: [0, [Validators.required, Validators.min(0.001)]],
      promo_precio_total: [0, [Validators.required, Validators.min(0)]],
      unidad_medida_promocion: ['', [Validators.required, Validators.maxLength(30)]]
    });
  }

  private precargarFormulario(promocion: any): void {
    // Buscar el producto base correspondiente para reestablecer la metadata estática de precios y unidades
    const prodBase = this.productosSimples.find(p => p.id === promocion.producto_simple_id);
    if (prodBase) {
      this.productoSeleccionado = prodBase;
    }

    this.promoForm.patchValue({
      buscarProducto: prodBase ? `${prodBase.descripcion_prod} (${prodBase.marca_prod})` : 'Producto no asociado o inactivo',
      producto_simple_id: promocion.producto_simple_id,
      descripcion_promo: promocion.descripcion_promo,
      cantidad_necesaria: promocion.cantidad_necesaria,
      promo_precio_total: promocion.promo_precio_total,
      unidad_medida_promocion: promocion.unidad_medida_promocion
    });

    // Forzar renderizado matemático del costo al momento de poblar el formulario
    if (this.productoSeleccionado) {
      this.costoAcumulado = (this.productoSeleccionado.precio_compra_unitario || 0) * (promocion.cantidad_necesaria || 0);
      this.mostrarAdvertenciaMargen = (promocion.promo_precio_total || 0) < this.costoAcumulado;
    }
  }

  private configurarBuscadorPredictivo(): void {
    this.productosFiltrados$ = this.promoForm.get('buscarProducto')!.valueChanges.pipe(
      startWith(''),
      map(value => {
        if (typeof value !== 'string') return [];
        const filterValue = value.toLowerCase().trim();
        if (!filterValue) return [];
        return this.productosSimples.filter(p =>
          p.descripcion_prod.toLowerCase().includes(filterValue) ||
          p.marca_prod.toLowerCase().includes(filterValue)
        );
      })
    );
  }

  private observarCambiosDeCostos(): void {
    combineLatest([
      this.promoForm.get('cantidad_necesaria')!.valueChanges.pipe(startWith(0)),
      this.promoForm.get('promo_precio_total')!.valueChanges.pipe(startWith(0))
    ]).subscribe(([cantidad, precioVentaPromo]) => {
      if (this.productoSeleccionado) {
        this.costoAcumulado = (this.productoSeleccionado.precio_compra_unitario || 0) * (cantidad || 0);
        this.mostrarAdvertenciaMargen = (precioVentaPromo || 0) < this.costoAcumulado;
      } else {
        this.costoAcumulado = 0;
        this.mostrarAdvertenciaMargen = false;
      }
    });
  }

  seleccionarProducto(producto: ProductoSimpleDb): void {
    this.productoSeleccionado = producto;
    this.mostrarDropdown = false;

    this.promoForm.patchValue({
      buscarProducto: `${producto.descripcion_prod} (${producto.marca_prod})`,
      producto_simple_id: producto.id,
      unidad_medida_promocion: producto.unidad_medida || 'Unidad'
    });
  }

  limpiarSeleccion(): void {
    this.productoSeleccionado = null;
    this.promoForm.patchValue({
      producto_simple_id: '',
      unidad_medida_promocion: ''
    });
  }

  unfocusDropdown(): void {
    setTimeout(() => this.mostrarDropdown = false, 200);
  }

  async guardar(): Promise<void> {
    if (this.promoForm.invalid || !this.empresaId) {
      this.promoForm.markAllAsTouched();
      return;
    }

    const formValues = this.promoForm.getRawValue();

    // FLUJO DE CONFIRMACIONES SWEETALERT ADAPTADO A ACTUALIZACIÓN
    if (this.mostrarAdvertenciaMargen) {
      const result = await Swal.fire({
        title: '¿Confirmar Modificación con Pérdida?',
        text: `El nuevo precio (S/. ${this.promoForm.value.promo_precio_total}) es inferior al costo acumulado (S/. ${this.costoAcumulado.toFixed(2)}). ¿Deseas actualizar los cambios de todas formas?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, guardar con pérdida',
        cancelButtonText: 'Revisar precios',
        reverseButtons: true
      });

      if (!result.isConfirmed) return;

    } else {
      const result = await Swal.fire({
        title: '¿Actualizar Datos de Promoción?',
        text: '¿Estás seguro de que deseas guardar las modificaciones realizadas sobre esta promoción?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2765eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, actualizar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      });

      if (!result.isConfirmed) return;
    }

    const promocionModificada = {
      producto_simple_id: formValues.producto_simple_id,
      descripcion_promo: formValues.descripcion_promo.trim(),
      cantidad_necesaria: Number(formValues.cantidad_necesaria),
      promo_precio_total: Number(formValues.promo_precio_total),
      unidad_medida_promocion: formValues.unidad_medida_promocion.trim()
    };

    try {
      // 🌟 Consumir el método del service para actualizar por ID
      await this.inventarioService.actualizarPromocion(this.promoId, promocionModificada);
      this.toastr.success('Los cambios fueron actualizados con éxito.', '¡Actualización Exitosa!', {
        timeOut: 3000,
        progressBar: true
      });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error al actualizar la promoción:', error);
      this.toastr.error('Ocurrió un error inesperado al intentar sobreescribir la promoción.', 'Error');
    }
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }

}
