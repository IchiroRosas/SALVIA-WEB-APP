import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductoSimpleListadoDto } from '../../../shared/models/dto';

@Component({
  selector: 'app-producto-simple',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto-simple.component.html',
  styleUrls: ['./producto-simple.component.css']
})
export class ProductoSimpleComponent implements OnInit {
  private firestore = inject(Firestore);
  
  // Observable unificado que alimentará la tabla directamente
  productosMapeados$!: Observable<ProductoSimpleListadoDto[]>;

  ngOnInit(): void {
    // 1. Referencias a las colecciones de Firebase
    const prodsRef = collection(this.firestore, 'productos_simples');
    const catsRef = collection(this.firestore, 'categorias');
    const provsRef = collection(this.firestore, 'proveedores');

    // 2. Traemos la data incluyendo el ID del documento
    const prodsData$ = collectionData(prodsRef, { idField: 'id' });
    const catsData$ = collectionData(catsRef, { idField: 'id' });
    const provsData$ = collectionData(provsRef, { idField: 'id' });
    console.log(prodsData$)
    // 3. Cruzamos los datos de forma reactiva
    this.productosMapeados$ = combineLatest([prodsData$, catsData$, provsData$]).pipe(
      map(([productos, categorias, proveedores]) => {
        return productos.map((prod: any, index: number) => {
          
          // Buscar correspondencia de Categoría
          const catEncontrada = categorias.find((c: any) => c.id === prod.id_categoria);

          return {
            id: prod.id,
            // Genera un ID visual limpio tipo PRD-001 basándose en la posición
            customId: `PRD-${String(index + 1).padStart(3, '0')}`,
            nombre: `${prod.descripcion_prod} ${prod.marca_prod || ''}`.trim(),
            // Acceso seguro mediante firma de índice
            categoria: catEncontrada ? catEncontrada['nombre_categoria'] : 'Sin Categoría',
            stock: prod.stock_actual || 0,
            precio: prod.precio_venta_unitario || 0
          };
        });
      })
    );
  }

  // Métodos para acciones futuras
  editarProducto(id: string) {
    console.log('Editar producto con ID:', id);
  }

  eliminarProducto(id: string) {
    console.log('Eliminar producto con ID:', id);
  }
}