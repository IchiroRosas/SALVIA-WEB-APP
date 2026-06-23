import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ProductoSimpleDb, ProductoSimpleListadoDto } from '../../../shared/models/dto'; // Ajusta la ruta de importación
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DetalleProdSimpleComponent } from './popups-crud-producto-simple/detalle-prod-simple/detalle-prod-simple.component';
import { ActualizarProdSimpleComponent } from './popups-crud-producto-simple/actualizar-prod-simple/actualizar-prod-simple.component';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { InventarioService } from "../../services/inventario.service";

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
  private inventarioService = inject(InventarioService);

  rolUsuario: string | null = null;
  empresaId: string | null = null;
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
        this.empresaId = miEmpresaId;

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
                precioVenta: prod.precio_venta_unitario || 0,
                precioCompra: prod.precio_compra_unitario || 0
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

  verDetalleProducto(id: string): void {
    this.dialog.open(DetalleProdSimpleComponent, {
      width: '50vw',
      maxWidth: 'none',
      disableClose: false, // Permite que se cierre al hacer clic fuera
      data: { idProducto: id }
    });
  }

  editarProducto(id: string): void {
    this.dialog.open(ActualizarProdSimpleComponent, {
      width: '60vw',
      maxWidth: 'none',
      disableClose: true,
      data: { idProducto: id }
    });
  }

  async eliminarProdSimple(id: string): Promise<void> {
    if (!this.empresaId) {
      this.toastr.error('No se pudo determinar la empresa del usuario.', 'Error');
      return;
    }

    try {
      // 1. Validar las dependencias desde el Service
      const dependencias = await this.inventarioService.verificarDependenciasProductoSimple(id, this.empresaId);

      // 2. Si se encuentra en alguna colección, se interrumpe y se muestra el listado estructurado
      if (dependencias.compuestos.length > 0 || dependencias.promociones.length > 0) {
        let htmlLista = '<div style="text-align: left; max-height: 250px; overflow-y: auto;">';
        htmlLista += '<p>Este artículo no puede eliminarse porque está asignado a los siguientes elementos:</p>';

        if (dependencias.compuestos.length > 0) {
          htmlLista += '<p style="margin-bottom: 2px; font-weight: bold; color: #1e293b;">🛒 Productos Compuestos (Combos):</p><ul style="margin-top: 2px; padding-left: 20px;">';
          dependencias.compuestos.forEach(comp => htmlLista += `<li>${comp}</li>`);
          htmlLista += '</ul>';
        }

        if (dependencias.promociones.length > 0) {
          htmlLista += '<p style="margin-bottom: 2px; font-weight: bold; color: #1e293b;">🏷️ Promociones:</p><ul style="margin-top: 2px; padding-left: 20px;">';
          dependencias.promociones.forEach(promo => htmlLista += `<li>${promo}</li>`);
          htmlLista += '</ul>';
        }
        htmlLista += '</div>';

        Swal.fire({
          title: 'Acción Bloqueada',
          html: htmlLista,
          icon: 'error',
          confirmButtonText: 'Acepto',
          confirmButtonColor: '#2563eb'
        });

        return; // Rompe el flujo impidiendo la eliminación física/lógica
      }

    } catch (error) {
      console.error('Error al validar dependencias:', error);
      this.toastr.error('Ocurrió un error al verificar la integridad del producto.', 'Error');
      return;
    }

    // 3. Si el producto está libre de dependencias, prosigue el flujo original
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este producto ya no estará disponible para la venta.',
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
          const prodDocRef = doc(this.firestore, 'productos_simples', id);
          await updateDoc(prodDocRef, { activo: false });

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