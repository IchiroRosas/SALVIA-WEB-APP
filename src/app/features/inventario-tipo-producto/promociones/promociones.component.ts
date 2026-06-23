import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InventarioService } from '../../services/inventario.service';
import { PromocionTablaDto } from '../../../shared/models/dto';
import { DetallePromocionComponent } from '../promociones/popups-crud-promociones/detalle-promocion/detalle-promocion.component';

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

  promocionesMapeadas$!: Observable<PromocionTablaDto[]>;
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
    console.log('Editar promo:', id);
  }

  eliminarPromo(id: string): void {
    console.log('Eliminar promo:', id);
  }
}