import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject, switchMap, map } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InventarioService } from '../../services/inventario.service';
import { PromocionTablaDto, PromocionTablaPromDto } from '../../../shared/models/dto';
import { DetallePromocionComponent } from '../promociones/popups-crud-promociones/detalle-promocion/detalle-promocion.component';
import { ActualizarPromocionComponent } from './popups-crud-promociones/actualizar-promocion/actualizar-promocion.component';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-promociones',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './promociones.component.html',
  styleUrl: './promociones.component.css'
})
export class PromocionesComponent implements OnInit {
  private inventarioService = inject(InventarioService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  promocionesMapeadas$!: Observable<PromocionTablaPromDto[]>;
  esAdmin = signal<boolean>(true); 
  private idEmpresaActual = 'Tj3T6JWn5rCLXxkohscz'; 

  private paginaActualSubject = new BehaviorSubject<number>(1);
  paginaActual = 1;
  itemsPorPagina = 5; 
  totalResultados = 0;

  ngOnInit(): void {
    this.promocionesMapeadas$ = this.inventarioService.obtenerPromocionesMapeadas(this.idEmpresaActual).pipe(
      switchMap(todosLosProductos => {
        return this.paginaActualSubject.pipe(
          map(pagina => {
            this.totalResultados = todosLosProductos.length;
            
            const maxPaginas = this.totalPaginas;
            if (pagina > maxPaginas && maxPaginas > 0) {
              this.paginaActual = maxPaginas;
            }

            const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
            const fin = inicio + this.itemsPorPagina;
            return todosLosProductos.slice(inicio, fin);
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

  verDetallePromo(id: string | undefined): void {
    if (!id) return;

    this.dialog.open(DetallePromocionComponent, {
      data: { id },
      width: '850px',
      maxWidth: '92vw'
    });
  }

  editarPromo(id: string): void {
    if (!id) return;

    this.dialog.open(ActualizarPromocionComponent, {
      data: { id },
      width: '850px',
      maxWidth: '92vw'
    });
  }

  eliminarPromo(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta promoción se dará de baja.',
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
          await this.inventarioService.eliminarPromocion(id);
          this.toastr.success('La promoción fue eliminada con éxito.', '¡Eliminada!');
        } catch (error) {
          console.error(error);
          this.toastr.error('No se pudo eliminar la promoción.', 'Error');
        }
      }
    });
  }
}