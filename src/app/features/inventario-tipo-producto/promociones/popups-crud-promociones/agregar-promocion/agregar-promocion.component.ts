import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { InventarioService } from '../../../../services/inventario.service';
import { ProductoSimpleDb } from '../../../../../shared/models/dto';

@Component({
  selector: 'app-agregar-promocion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './agregar-promocion.component.html',
  styleUrl: './agregar-promocion.component.css'
})
export class AgregarPromocionComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<AgregarPromocionComponent>);
  private toastr = inject(ToastrService);
  private inventarioService = inject(InventarioService);

  promoForm!: FormGroup;
  empresaId: string | null = null;

  productosSimples: ProductoSimpleDb[] = [];
  productosFiltrados$!: Observable<ProductoSimpleDb[]>;
  productoSeleccionado: ProductoSimpleDb | null = null;
  mostrarDropdown = false;

  costoAcumulado = 0;
  mostrarAdvertenciaMargen = false;

  ngOnInit(): void {
    this.inicializarFormulario();

    user(this.auth).pipe(
      switchMap(authUser => {
        if (!authUser) return of(null);
        return docData(doc(this.firestore, 'users', authUser.uid));
      }),
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) return of([]);
        this.empresaId = userData.empresa_id;
        return this.inventarioService.obtenerProductosSimplesActivos(this.empresaId!);
      })
    ).subscribe({
      next: (productos: any[]) => {
        this.productosSimples = productos.filter(p => p.activo === true);
        this.configurarBuscadorPredictivo();
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });

    this.observarCambiosDeCostos();
  }

  private inicializarFormulario(): void {
    this.promoForm = this.fb.group({
      buscarProducto: ['', Validators.required],
      producto_simple_id: ['', Validators.required],
      descripcion_promo: ['', [Validators.required, Validators.minLength(3)]], // 🌟 Ajustado a mínimo 3 caracteres
      cantidad_necesaria: [0, [Validators.required, Validators.min(0.001)]], // 🌟 Inicializa en 0, restrictivo a mayor que 0
      promo_precio_total: [0, [Validators.required, Validators.min(0)]], // 🌟 Inicializa en 0, permite 0, prohíbe negativos
      unidad_medida_promocion: ['', [Validators.required, Validators.maxLength(30)]]
    });
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
        // La advertencia se activa si el precio de venta es inferior al costo acumulado
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

    // FLUJO DE CONFIRMACIONES SWEETALERT
    if (this.mostrarAdvertenciaMargen) {
      // Escenario A: Confirmación de venta estratégica con pérdida o costo cero (Rojo/Advertencia)
      const result = await Swal.fire({
        title: '¿Confirmar Margen de Pérdida?',
        text: `El precio de venta asignado (S/. ${this.promoForm.value.promo_precio_total}) es inferior al costo de adquisición acumulado (S/. ${this.costoAcumulado.toFixed(2)}). ¿Deseas registrar esta promoción de todas formas?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, registrar con pérdida',
        cancelButtonText: 'Revisar precios',
        reverseButtons: true
      });

      if (!result.isConfirmed) return;

    } else {
      // Escenario B: Alerta estándar cuando el margen cubre los costos (Azul corporativo)
      const result = await Swal.fire({
        title: '¿Registrar Promoción?',
        text: '¿Estás seguro de que deseas guardar esta nueva promoción con los parámetros ingresados?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2765eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      });

      if (!result.isConfirmed) return;
    }

    const nuevaPromocion = {
      activo: true,
      empresa_id: this.empresaId,
      producto_simple_id: this.promoForm.value.producto_simple_id,
      descripcion_promo: this.promoForm.value.descripcion_promo.trim(),
      cantidad_necesaria: Number(this.promoForm.value.cantidad_necesaria),
      promo_precio_total: Number(this.promoForm.value.promo_precio_total),
      unidad_medida_promocion: this.promoForm.value.unidad_medida_promocion.trim()
    };

    try {
      await this.inventarioService.crearPromocion(nuevaPromocion);
      this.toastr.success('La promoción fue guardada con éxito.', '¡Registro Exitoso!', {
        timeOut: 3000,
        progressBar: true
      });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error al registrar promoción:', error);
      this.toastr.error('Ocurrió un error inesperado en los servidores de inventario.', 'Error');
    }
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}