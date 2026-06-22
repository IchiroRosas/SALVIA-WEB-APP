import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { InventarioService } from '../../../../services/inventario.service';

@Component({
  selector: 'app-detalle-prod-simple',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './detalle-prod-simple.component.html',
  styleUrl: './detalle-prod-simple.component.css'
})
export class DetalleProdSimpleComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DetalleProdSimpleComponent>);
  public data = inject(MAT_DIALOG_DATA);
  private firestore = inject(Firestore);
  private inventarioService = inject(InventarioService);

  productoDetalle$!: Observable<any>;

  ngOnInit(): void {
    const idProducto = this.data.idProducto;
    if (!idProducto) return;

    this.productoDetalle$ = this.inventarioService.obtenerProductoSimplePorId(idProducto).pipe(
      switchMap((prod: any) => {
        if (!prod) return of(null);

        // Consultas dinámicas para traer los nombres de categoría y proveedor vinculados
        const catObs$ = prod.id_categoria 
          ? docData(doc(this.firestore, 'categorias', prod.id_categoria)) 
          : of(null);
          
        const provObs$ = prod.id_proveedor 
          ? docData(doc(this.firestore, 'proveedores', prod.id_proveedor)) 
          : of(null);

        return combineLatest([catObs$, provObs$]).pipe(
          map(([cat, prov]: [any, any]) => {
            return {
              ...prod,
              nombre_categoria: cat ? (cat.nombre_categoria || 'Sin nombre') : 'Sin Categoría',
              nombre_proveedor: prov ? (prov.nombre_proveedor || prov.razon_social || 'Sin nombre') : 'Sin Proveedor'
            };
          })
        );
      })
    );
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}