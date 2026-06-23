import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData, query, where, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // 🌟 Importante
import { AgregarCategoriaComponent } from '../inventario-categoria/popups-crud-categorias/agregar-categoria/agregar-categoria.component'; // 🌟 Importar el componente de agregar categoría
import { ModificarCategoriaComponent } from '../inventario-categoria/popups-crud-categorias/modificar-categoria/modificar-categoria.component'; // 🌟 Importar el componente de modificar categoría
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventario-categoria',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './inventario-categoria.component.html',
  styleUrl: './inventario-categoria.component.css'
})

export class InventarioCategoriaComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  rolUsuario: string | null = null;
  categorias$!: Observable<any[]>;

  ngOnInit(): void {
    // 1. Obtener el rol directamente del sessionStorage
    this.rolUsuario = sessionStorage.getItem('rol');

    // 2. Flujo reactivo para obtener categorías según la empresa del usuario
    this.categorias$ = user(this.auth).pipe(
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

        // Construimos la consulta filtrando por empresa_id y asegurando que estén activas
        const catsQuery = query(
          collection(this.firestore, 'categorias'),
          where('empresa_id', '==', miEmpresaId),
          where('activo', '==', true)
        );

        return collectionData(catsQuery, { idField: 'id' });
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

  agregarCategoria(): void {
    this.dialog.open(AgregarCategoriaComponent, {
      width: '420px',
      disableClose: true
    });
  }

  editarCategoria(categoria: any): void {
    this.dialog.open(ModificarCategoriaComponent, {
      width: '420px',
      disableClose: true,
      data: categoria
    });
  }

  eliminarCategoria(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta categoría ya no estará disponible para clasificar tus productos.',
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
          const catDocRef = doc(this.firestore, 'categorias', id);

          // Hacemos el borrado lógico cambiando 'activo' a false
          await updateDoc(catDocRef, { activo: false });

          // Lanzamos el toast de éxito cortito
          this.toastr.success('La categoría fue eliminada con éxito.', '¡Eliminado!', {
            timeOut: 2500,
            progressBar: true
          });

        } catch (error) {
          console.error('Error al ocultar la categoría:', error);
          this.toastr.error('No se pudo eliminar la categoría en este momento.', 'Error');
        }
      }
    });
  }
  
}