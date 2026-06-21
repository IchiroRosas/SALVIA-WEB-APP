import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, docData } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ProductoSimpleDb, ProductoSimpleListadoDto } from '../../../shared/models/dto'; // Ajusta la ruta de importación

@Component({
  selector: 'app-producto-simple',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto-simple.component.html',
  styleUrls: ['./producto-simple.component.css']
})

export class ProductoSimpleComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  rolUsuario: string | null = null;
  productosMapeados$!: Observable<ProductoSimpleListadoDto[]>;

  ngOnInit(): void {

    this.rolUsuario = sessionStorage.getItem('rol');

    this.productosMapeados$ = user(this.auth).pipe(
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

        const prodsQuery = query(collection(this.firestore, 'productos_simples'), where('empresa_id', '==', miEmpresaId), where('activo', '==', true));
        const catsQuery = query(collection(this.firestore, 'categorias'), where('empresa_id', '==', miEmpresaId));
        const provsQuery = query(collection(this.firestore, 'proveedores'), where('empresa_id', '==', miEmpresaId));

        const prodsData$ = collectionData(prodsQuery, { idField: 'id' }) as Observable<ProductoSimpleDb[]>;
        const catsData$ = collectionData(catsQuery, { idField: 'id' });
        const provsData$ = collectionData(provsQuery, { idField: 'id' });

        return combineLatest([prodsData$, catsData$, provsData$]).pipe(
          map(([productos, categorias, proveedores]) => {
            return productos.map((prod: ProductoSimpleDb): ProductoSimpleListadoDto => {

              // Buscar correspondencia de Categoría por UID de documento
              const catEncontrada = categorias.find((c: any) => c.id === prod.id_categoria);

              return {
                id: prod.id || '',
                nombre: prod.descripcion_prod,
                categoria: catEncontrada ? catEncontrada['nombre_categoria'] : 'Sin Categoría',
                marca: prod.marca_prod || 'Sin Marca',
                stock: prod.stock_actual || 0,
                unidadMedida: prod.unidad_medida || 'N/A',
                precioVenta: prod.precio_venta_unitario || 0
              };
            });
          })
        );
      })
    );
  }

  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }

  editarProducto(id: string) {
    console.log('Editar producto con ID:', id);
  }

  eliminarProducto(id: string) {
    console.log('Eliminar producto con ID:', id);
  }
}