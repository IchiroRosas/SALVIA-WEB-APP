import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
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
  private inventarioService = inject(InventarioService); // 🌟 Inyectamos el nuevo servicio

  rolUsuario: string | null = null;
  productosCompuestos$!: Observable<ProductoCompuestoListadoDto[]>;

  ngOnInit(): void {
    this.rolUsuario = sessionStorage.getItem('rol');

    this.productosCompuestos$ = user(this.auth).pipe(
      switchMap(authUser => {
        if (!authUser) return of(null);
        const userDocRef = doc(this.firestore, 'users', authUser.uid);
        return docData(userDocRef);
      }),
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) {
          return of([]);
        }

        const miEmpresaId = userData.empresa_id;

        // Consumimos la lista desde el servicio e internalizamos el mapeo al DTO de la tabla
        return this.inventarioService.obtenerProductosCompuestos(miEmpresaId).pipe(
          map(productos => {
            return productos.map((prod: any): ProductoCompuestoListadoDto => ({
              id: prod.id || '',
              nombre: prod.descripcion_prod_comp,
              precioVentaCombo: prod.precio_venta_combo || 0
            }));
          })
        );
      })
    );
  }

  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }

  detalleProducto(id: string): void {
    this.dialog.open(DetalleProdCompuestoComponent, {
      width: '60vw',
      maxWidth: 'none', // Mantiene la consistencia del ancho fluido que arreglamos
      disableClose: true,
      data: { idCombo: id } // Pasamos el ID del combo al modal
    });
  }

  editarProducto(id: string): void {
    this.dialog.open(ActualizarProdCompuestoComponent, {
      width: '60vw',
      maxWidth: 'none', // Mantiene la consistencia del ancho fluido que arreglamos
      disableClose: true,
      data: { idCombo: id } // Pasamos el ID del combo al modal
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
          // Delegamos la eliminación lógica al servicio
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