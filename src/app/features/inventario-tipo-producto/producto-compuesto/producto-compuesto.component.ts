import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs'; // 🌟 Agregado combineLatest aquí
import { map, switchMap } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { ProductoCompuestoListadoDto } from '../../../shared/models/dto';
import { InventarioService } from '../../services/inventario.service';

import { DetalleProdCompuestoComponent } from './popups-crud-producto-compuesto/detalle-prod-compuesto/detalle-prod-compuesto.component';
import { ActualizarProdCompuestoComponent } from './popups-crud-producto-compuesto/actualizar-prod-compuesto/actualizar-prod-compuesto.component';

@Component({
  selector: 'app-producto-compuesto',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './producto-compuesto.component.html',
  styleUrls: ['./producto-compuesto.component.css']
})
export class ProductoCompuestoComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private inventarioService = inject(InventarioService); 

  rolUsuario: string | null = null;
  productosCompuestos$!: Observable<ProductoCompuestoListadoDto[]>;

  private paginaActualSubject = new BehaviorSubject<number>(1);
  paginaActual = 1;
  itemsPorPagina = 5; 
  totalResultados = 0;

  ngOnInit(): void {
    this.rolUsuario = sessionStorage.getItem('rol');

    this.productosCompuestos$ = user(this.auth).pipe(
      // 1. Obtener información del usuario e identificar su empresa
      switchMap(authUser => {
        if (!authUser) return of(null);
        const userDocRef = doc(this.firestore, 'users', authUser.uid);
        return docData(userDocRef);
      }),
      // 2. Traer los productos compuestos desde el servicio y mapearlos al DTO
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) {
          return of([]);
        }

        const miEmpresaId = userData.empresa_id;

        return this.inventarioService.obtenerProductosCompuestos(miEmpresaId).pipe(
          map(productos => {
            return productos.map((prod: any): ProductoCompuestoListadoDto => ({
              id: prod.id || '',
              nombre: prod.descripcion_prod_comp,
              precioVentaCombo: prod.precio_venta_combo || 0
            }));
          })
        );
      }),
      // 3. 🌟 Filtrado REACTIVO (Solo por Nombre) y Paginación combinada
      switchMap((todosLosProductos: ProductoCompuestoListadoDto[]) => {
        return combineLatest([
          this.paginaActualSubject,
          this.inventarioService.termino$ // Escucha los cambios del buscador global
        ]).pipe(
          map(([pagina, termino]) => {
            
            // A. Aplicar filtro únicamente al campo 'nombre'
            const filtrados = todosLosProductos.filter(p => 
              p.nombre.toLowerCase().includes(termino)
            );

            // B. Recalcular dinámicamente el total de resultados para los botones de la vista
            this.totalResultados = filtrados.length;
            
            const maxPaginas = this.totalPaginas;
            if (pagina > maxPaginas && maxPaginas > 0) {
              this.paginaActual = maxPaginas;
            }

            // C. Segmentar la porción de elementos correspondiente a la página activa
            const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
            return filtrados.slice(inicio, inicio + this.itemsPorPagina);
          })
        );
      })
    );
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalResultados / this.itemsPorPagina);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  get inicioRango(): number {
    return this.totalResultados === 0 ? 0 : (this.paginaActual - 1) * this.itemsPorPagina + 1;
  }

  get finRango(): number {
    const fin = this.paginaActual * this.itemsPorPagina;
    return fin > this.totalResultados ? this.totalResultados : fin;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.paginaActualSubject.next(pagina);
    }
  }

  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }

  detalleProducto(id: string): void {
    this.dialog.open(DetalleProdCompuestoComponent, {
      width: '60vw',
      maxWidth: 'none', 
      disableClose: true,
      data: { idCombo: id } 
    });
  }

  editarProducto(id: string): void {
    this.dialog.open(ActualizarProdCompuestoComponent, {
      width: '60vw',
      maxWidth: 'none', 
      disableClose: true,
      data: { idCombo: id } 
    });
  }

  eliminarProductoCompuesto(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este combo/producto compuesto ya no estará disponible para la venta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await this.inventarioService.eliminarProductoCompuesto(id);

          this.toastr.success('El combo fue eliminado con éxito.', '¡Eliminado!', {
            timeOut: 2500,
            progressBar: true
          });

        } catch (error) {
          console.error('Error al ocultar el producto compuesto:', error);
          this.toastr.error('No se pudo eliminar el combo en este momento.', 'Error');
        }
      }
    });
  }
}