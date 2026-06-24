import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { InventarioService } from '../../../../services/inventario.service';

@Component({
  selector: 'app-detalle-promocion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-promocion.component.html',
  styleUrl: './detalle-promocion.component.css'
})
export class DetallePromocionComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DetallePromocionComponent>);
  public data = inject<{ id: string | undefined }>(MAT_DIALOG_DATA);
  private inventarioService = inject(InventarioService);

  detalle$!: Observable<any>;

  ngOnInit(): void {
    if (this.data?.id) {
      this.detalle$ = this.inventarioService.obtenerDetallePromocionCompleto(this.data.id);
    } else {
      this.detalle$ = of(null);
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}