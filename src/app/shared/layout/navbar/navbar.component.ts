import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { MainMiPerfilComponent } from '../../../features/main-mi-perfil/main-mi-perfil.component';
import { MainGestionUsersComponent } from '../../../features/main-gestion-users/main-gestion-users.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  isEditingStartBalance = false;
  startBalance: number = 45000;
  nombreUsuario: string = 'Cargando...';
  fechaActual: string = '';
  isAdmin(): boolean {
    return sessionStorage.getItem('rol')?.toLocaleLowerCase() === 'administrador';
  }

  isMenuOpen = false;

  ngOnInit(): void {
    this.obtenerFechaActual();
    this.cargarDatosUsuarioLogueado();
  }

  private obtenerFechaActual(): void {
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const fechaStr = new Date().toLocaleDateString('es-ES', opciones);
    this.fechaActual = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
  }

  private cargarDatosUsuarioLogueado(): void {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(this.firestore, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            this.nombreUsuario = userSnap.data()['nombre_user'] || 'Usuario';
          } else {
            this.nombreUsuario = user.displayName || 'Usuario';
          }
        } catch (error) {
          this.nombreUsuario = user.displayName || 'Usuario';
        }
      } else {
        this.nombreUsuario = 'Invitado';
      }
    });
  }

  // Alternar visibilidad del menú flotante
  toggleUserMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // 🌟 ACCIÓN 1: Abrir Mi Perfil como MatDialog
  abrirPerfil(): void {
    this.isMenuOpen = false;
    this.dialog.open(MainMiPerfilComponent, {
      width: '440px',
      maxWidth: '95vw',
      disableClose: false
    });
  }

  // 🌟 ACCIÓN 2: Abrir Gestión de Usuarios como MatDialog
  abrirGestionarUsuarios(): void {
    this.isMenuOpen = false;
    this.dialog.open(MainGestionUsersComponent, {
      width: '680px',
      maxWidth: '95vw',
      disableClose: false
    });
  }

  // ACCIÓN 3: Logout
  async logout(): Promise<void> {

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se cerrará tu sesión.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        this.isMenuOpen = false;
        try {
          await signOut(this.auth);
          sessionStorage.clear();
          this.router.navigate(['/login']);
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
        }
      }
    });
  }

}
