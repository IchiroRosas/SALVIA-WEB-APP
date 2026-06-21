import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ProductoSimpleDb, ProductoSimpleListadoDto } from '../../../shared/models/dto'; // Ajusta la ruta de importación
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActualizarProdSimpleComponent } from './popups-crud-producto-simple/actualizar-prod-simple/actualizar-prod-simple.component';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-producto-simple',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './producto-simple.component.html',
  styleUrls: ['./producto-simple.component.css']
})

export class ProductoSimpleComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

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

  editarProducto(id: string): void {
    this.dialog.open(ActualizarProdSimpleComponent, {
      width: '60vw',
      maxWidth: 'none',
      disableClose: true,
      data: { idProducto: id }
    });
  }

  eliminarProdSimple(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este producto ya no estará disponible para la venta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb', // Color azul primario de tu paleta
      cancelButtonColor: '#64748b',  // Color gris de tu paleta
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true           // Mantiene una jerarquía visual limpia en Windows/Web
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Apuntamos al documento exacto en Firestore
          const prodDocRef = doc(this.firestore, 'productos_simples', id);

          // Hacemos el borrado lógico cambiando 'activo' a false
          await updateDoc(prodDocRef, { activo: false });

          // Lanzamos el toast de éxito cortito
          this.toastr.success('El producto fue eliminado con éxito.', '¡Eliminado!', {
            timeOut: 2500,
            progressBar: true
          });

        } catch (error) {
          console.error('Error al ocultar el producto:', error);
          this.toastr.error('No se pudo eliminar el producto en este momento.', 'Error');
        }
      }
    });
  }
}