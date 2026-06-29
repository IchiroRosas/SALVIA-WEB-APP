import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject, switchMap, map, combineLatest, of } from 'rxjs'; // 🌟 Se añade 'of'
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Firestore, doc, docData } from '@angular/fire/firestore'; // 🌟 Se añade Firestore
import { Auth, user } from '@angular/fire/auth';                   // 🌟 Se añade Auth y user
import { InventarioService } from '../../services/inventario.service';
import { PromocionTablaPromDto } from '../../../shared/models/dto';
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
  private firestore = inject(Firestore); // 🌟 Inyección de Firestore
  private auth = inject(Auth);           // 🌟 Inyección de Firebase Auth

  rolUsuario: string | null = null;
  empresaId: string | null = null;       // 🌟 Guardará el ID dinámico de la empresa

  promocionesMapeadas$!: Observable<PromocionTablaPromDto[]>;

  private paginaActualSubject = new BehaviorSubject<number>(1);
  paginaActual = 1;
  itemsPorPagina = 5; 
  totalResultados = 0;

  ngOnInit(): void {
    this.rolUsuario = sessionStorage.getItem('rol');

    this.promocionesMapeadas$ = user(this.auth).pipe(
      // 1. Obtener datos del usuario logueado en Firebase
      switchMap(authUser => {
        if (!authUser) return of(null);
        const userDocRef = doc(this.firestore, 'users', authUser.uid);
        return docData(userDocRef);
      }),
      // 2. Recuperar el empresa_id e invocar al servicio de inventario
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) {
          return of([]);
        }

        const miEmpresaId = userData.empresa_id;
        this.empresaId = miEmpresaId; // Almacenamos el ID de la empresa de forma interna

        // Pasamos el ID de la empresa dinámico obtenido de Firestore
        return this.inventarioService.obtenerPromocionesMapeadas(miEmpresaId);
      }),
      // 3. Aplicar Filtro reactivo multi-campo y paginación
      switchMap((todasLasPromociones: PromocionTablaPromDto[]) => {
        return combineLatest([
          this.paginaActualSubject,
          this.inventarioService.termino$
        ]).pipe(
          map(([pagina, termino]) => {
            
            // Filtro de doble criterio (Nombre de Promo O Nombre de Producto)
            const filtradas = todasLasPromociones.filter(p => {
              const cumplePromo = p.descripcionPromo ? p.descripcionPromo.toLowerCase().includes(termino) : false;
              const cumpleProducto = p.productoNombre ? p.productoNombre.toLowerCase().includes(termino) : false;
              
              return cumplePromo || cumpleProducto; 
            });

            this.totalResultados = filtradas.length;
            
            const maxPaginas = this.totalPaginas;
            if (pagina > maxPaginas && maxPaginas > 0) {
              this.paginaActual = maxPaginas;
            }

            const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
            return filtradas.slice(inicio, inicio + this.itemsPorPagina);
          })
        );
      })
    );
  }

  // 🌟 Se mantienen intactos todos tus métodos de ordenación, ventanas y utilidades sin alterar nombres
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

  verDetallePromo(id: string | undefined): void {
    if (!id) return;

    this.dialog.open(DetallePromocionComponent, {
      data: { id },
      width: '850px',
      maxWidth: '92vw'
    });
  }

  editarPromo(id: string): void {
    if (!id) return;

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

  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }
}