import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ProductoSimpleDb, ProductoSimpleListadoDto } from '../../../shared/models/dto'; 
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DetalleProdSimpleComponent } from './popups-crud-producto-simple/detalle-prod-simple/detalle-prod-simple.component';
import { ActualizarProdSimpleComponent } from './popups-crud-producto-simple/actualizar-prod-simple/actualizar-prod-simple.component';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { InventarioService } from './../../services/inventario.service';

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
  public inventarioService = inject(InventarioService); // Cambiado a public por seguridad de acceso si fuera necesario

  rolUsuario: string | null = null;
  empresaId: string | null = null;
  productosMapeados$!: Observable<ProductoSimpleListadoDto[]>;

  private paginaActualSubject = new BehaviorSubject<number>(1);
  paginaActual = 1;
  itemsPorPagina = 5; 
  totalResultados = 0;

  ngOnInit(): void {
    this.rolUsuario = sessionStorage.getItem('rol');

    this.productosMapeados$ = user(this.auth).pipe(
      // 1. Obtener datos del usuario logueado
      switchMap(authUser => {
        if (!authUser) return of(null);
        const userDocRef = doc(this.firestore, 'users', authUser.uid);
        return docData(userDocRef);
      }),
      // 2. Consultar las colecciones de Firestore basadas en la empresa
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
            return productos.map((prod: any, index: number): ProductoSimpleListadoDto => {
              const catEncontrada = categorias.find((c: any) => c.id === prod.id_categoria);
              const provEncontrado = proveedores.find((p: any) => p.id === prod.id_proveedor);

              return {
                id: prod.id || '',
                nombre: prod['descripcion_prod'] || '',
                marca: prod['marca_prod'] || 'Sin Marca',
                categoria: catEncontrada ? catEncontrada['nombre_categoria'] : 'Sin Categoría',
                proveedor: provEncontrado ? provEncontrado['nombre_proveedor'] : 'Sin Proveedor',
                stock: prod.stock_actual || 0,
                unidadMedida: prod.unidad_medida || 'N/A',
                precioVenta: prod.precio_venta_unitario || 0,
                precioCompra: prod.precio_compra_unitario || 0,
              };
            });
          })
        );
      }),
      // 3. Aplicar Filtro reactivo multi-campo global y Paginación estructurada
      switchMap((todosLosProductosMapeados: ProductoSimpleListadoDto[]) => {
        return combineLatest([
          this.paginaActualSubject,
          this.inventarioService.termino$ // Escucha los cambios del buscador alojado en tu servicio
        ]).pipe(
          map(([pagina, termino]) => {
            
            // A. Filtrar por Nombre, Marca, Categoría o Proveedor
            const filtrados = todosLosProductosMapeados.filter(p => 
              p.nombre.toLowerCase().includes(termino) ||
              p.marca.toLowerCase().includes(termino) ||
              p.categoria.toLowerCase().includes(termino) ||
              p.proveedor.toLowerCase().includes(termino)
            );

            // B. Ajustar metadata de la paginación de forma dinámica
            this.totalResultados = filtrados.length;
            const maxPaginas = this.totalPaginas;
            if (pagina > maxPaginas && maxPaginas > 0) { 
              this.paginaActual = maxPaginas; 
            }

            // C. Segmentar el array final
            const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
            return filtrados.slice(inicio, inicio + this.itemsPorPagina);
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

  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }

  verDetalleProducto(id: string): void {
    this.dialog.open(DetalleProdSimpleComponent, {
      width: '50vw',
      maxWidth: 'none',
      disableClose: false,
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
      const dependencias = await this.inventarioService.verificarDependenciasProductoSimple(id, this.empresaId);

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

        return;
      }

    } catch (error) {
      console.error('Error al validar dependencias:', error);
      this.toastr.error('Ocurrió un error al verificar la integridad del producto.', 'Error');
      return;
    }

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