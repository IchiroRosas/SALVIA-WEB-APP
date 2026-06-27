import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, docData } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ProductoRecursoDb, ProductoRecursoListadoDto } from '../../../shared/models/dto'; 
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InventarioService } from '../../services/inventario.service'; 
import { ActualizarProdRecursoComponent } from './popups-crud-producto-recurso/actualizar-prod-recurso/actualizar-prod-recurso.component'; 
import { AgregarProdRecursoComponent } from './popups-crud-producto-recurso/agregar-prod-recurso/agregar-prod-recurso.component';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-producto-recurso',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './producto-recurso.component.html',
  styleUrls: ['./producto-recurso.component.css']
})
export class ProductoRecursoComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private inventarioService = inject(InventarioService);

  rolUsuario: string | null = null;
  empresaId: string | null = null;
  recursosMapeados$!: Observable<ProductoRecursoListadoDto[]>;

  // Variables de control de estado para la Paginación
  private paginaActualSubject = new BehaviorSubject<number>(1);
  paginaActual = 1;
  itemsPorPagina = 5; 
  totalResultados = 0;

  ngOnInit(): void {
    this.rolUsuario = sessionStorage.getItem('rol');

    this.recursosMapeados$ = user(this.auth).pipe(
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

        const recursosQuery = query(
          collection(this.firestore, 'producto_recurso'), 
          where('empresa_id', '==', miEmpresaId), 
          where('activo', '==', true)
        );
        const provsQuery = query(
          collection(this.firestore, 'proveedores'), 
          where('empresa_id', '==', miEmpresaId)
        );

        const recursosData$ = collectionData(recursosQuery, { idField: 'id' }) as Observable<any[]>;
        const provsData$ = collectionData(provsQuery, { idField: 'id' });

        return combineLatest([recursosData$, provsData$]).pipe(
          map(([recursos, proveedores]) => {
            return recursos.map((rec: any, index: number): ProductoRecursoListadoDto => {
              const provEncontrado = proveedores.find((p: any) => p.id === rec.id_proveedor);

              return {
                id: rec.id || '',
                customId: `REC-${String(index + 1).padStart(3, '0')}`,
                nombre: rec['descripcion_prod'],
                marca: rec['marca_prod'] || 'Sin Marca',
                proveedor: provEncontrado ? provEncontrado['nombre_proveedor'] : 'Sin Proveedor',
                precioCompra: rec['precio_compra'] || 0
              };
            });
          })
        );
      }),
      // 🌟 Unimos la búsqueda global y la segmentación reactiva por páginas aquí:
      switchMap((todosLosRecursos: ProductoRecursoListadoDto[]) => {
        return combineLatest([
          this.paginaActualSubject,
          this.inventarioService.termino$
        ]).pipe(
          map(([pagina, termino]) => {
            
            // 1. Filtrado inteligente por Nombre del Recurso O Nombre del Proveedor
            const filtrados = todosLosRecursos.filter(r => {
              const cumpleNombre = r.nombre ? r.nombre.toLowerCase().includes(termino) : false;
              const cumpleProveedor = r.proveedor ? r.proveedor.toLowerCase().includes(termino) : false;
              
              return cumpleNombre || cumpleProveedor;
            });

            // 2. Recalcular contadores con base en el nuevo set filtrado
            this.totalResultados = filtrados.length;
            
            const maxPaginas = this.totalPaginas;
            if (pagina > maxPaginas && maxPaginas > 0) {
              this.paginaActual = maxPaginas;
            }

            // 3. Segmentar el trozo de la página actual
            const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
            return filtrados.slice(inicio, inicio + this.itemsPorPagina);
          })
        );
      })
    );
  }

  // Getters y Auxiliares de Paginación para enlazar al HTML
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

  agregarRecurso(): void {
    const dialogRef = this.dialog.open(AgregarProdRecursoComponent, {
      width: '50vw',
      maxWidth: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Lógica opcional tras cerrar el modal
      }
    });
  }

  editarRecurso(id: string): void {
    this.dialog.open(ActualizarProdRecursoComponent, {
      width: '60vw',
      maxWidth: 'none',
      disableClose: true,
      data: { idRecurso: id }
    });
  }

  eliminarRecurso(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este recurso se dará de baja del inventario operativo.',
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
          await this.inventarioService.eliminarProductoRecurso(id);
          this.toastr.success('El recurso fue eliminado con éxito.', '¡Eliminado!');
        } catch (error) {
          console.error(error);
          this.toastr.error('No se pudo eliminar el recurso.', 'Error');
        }
      }
    });
  }
}