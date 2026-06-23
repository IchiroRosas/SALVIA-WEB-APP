import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData, query, where, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

// 🌟 Importaciones proyectadas para tus próximos popups de proveedores
import { AgregarProveedorComponent } from './popups-crud-proveedores/agregar-proveedor/agregar-proveedor.component';
import { ModificarProveedorComponent } from './popups-crud-proveedores/modificar-proveedor/modificar-proveedor.component';

@Component({
  selector: 'app-inventario-provider',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './inventario-proveedor.component.html',
  styleUrl: './inventario-proveedor.component.css'
})
export class InventarioProveedorComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  rolUsuario: string | null = null;
  proveedores$!: Observable<any[]>;

  ngOnInit(): void {
    // 1. Obtener el rol directamente del sessionStorage
    this.rolUsuario = sessionStorage.getItem('rol');

    // 2. Flujo reactivo para obtener proveedores según la empresa del usuario logueado
    this.proveedores$ = user(this.auth).pipe(
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

        // Consulta filtrando por empresa_id y asegurando que estén activos
        const provsQuery = query(
          collection(this.firestore, 'proveedores'),
          where('empresa_id', '==', miEmpresaId),
          where('activo', '==', true)
        );

        return collectionData(provsQuery, { idField: 'id' });
      })
    );
  }

  // Validación de Rol
  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }

  // Navegación de regreso al inventario general
  volver(): void {
    this.router.navigate(['/inventario']);
  }

  // Abre popup para agregar proveedor
  agregarProveedor(): void {
    this.dialog.open(AgregarProveedorComponent, {
      width: '460px', // Un poquito más ancho porque tiene un par de campos más que categoría
      disableClose: true
    });
  }

  // Abre popup para editar proveedor pasándole los datos actuales
  editarProveedor(proveedor: any): void {
    this.dialog.open(ModificarProveedorComponent, {
      width: '460px',
      disableClose: true,
      data: proveedor
    });
  }

  // Eliminación lógica con SweetAlert2 y Toastr
  eliminarProveedor(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este proveedor ya no aparecerá en tus listas activas del sistema.',
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
          const provDocRef = doc(this.firestore, 'proveedores', id);

          // Borrado lógico pasando activo a false
          await updateDoc(provDocRef, { activo: false });

          this.toastr.success('El proveedor fue eliminado con éxito.', '¡Eliminado!', {
            timeOut: 2500,
            progressBar: true
          });

        } catch (error) {
          console.error('Error al ocultar el proveedor:', error);
          this.toastr.error('No se pudo eliminar al proveedor en este momento.', 'Error');
        }
      }
    });
  }
}