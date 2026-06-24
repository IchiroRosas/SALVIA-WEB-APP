import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
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
  esAdmin = signal<boolean>(true); // Tu lógica de roles habitual
  private idEmpresaActual = 'Tj3T6JWn5rCLXxkohscz'; // ID dinámico de la sesión activa

  ngOnInit(): void {
    this.promocionesMapeadas$ = this.inventarioService.obtenerPromocionesMapeadas(this.idEmpresaActual);
  }

  verDetallePromo(id: string | undefined): void {
    if (!id) return; // Si no hay ID, frena la ejecución de forma segura

    this.dialog.open(DetallePromocionComponent, {
      data: { id },
      width: '850px',
      maxWidth: '92vw'
    });
  }

  editarPromo(id: string): void {
    if (!id) return; // Si no hay ID, frena la ejecución de forma segura

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