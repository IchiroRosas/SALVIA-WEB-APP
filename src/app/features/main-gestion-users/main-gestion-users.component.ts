import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { UsuarioListadoDto } from '../../shared/models/dto';
import { MainInvitarUsuarioComponent } from '../main-invitar-usuario/main-invitar-usuario.component';

@Component({
  selector: 'app-main-gestion-users',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './main-gestion-users.component.html',
  styleUrl: './main-gestion-users.component.css'
})
export class MainGestionUsersComponent implements OnInit {

  private dialogRef = inject(MatDialogRef<MainGestionUsersComponent>);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);

  usuariosActivos: UsuarioListadoDto[] = [];
  isLoading = true;
  miEmpresaId = '';

  ngOnInit(): void {
    this.cargarUsuariosPorEmpresa();
  }

  async cargarUsuariosPorEmpresa(): Promise<void> {
    this.isLoading = true;
    try {
      // 1. Obtener el UID del usuario actualmente autenticado
      const usuarioLogeado = this.auth.currentUser;
      if (!usuarioLogeado) return;

      // 2. Ir a la colección 'users' usando su UID para traer su perfil
      const userDocRef = doc(this.firestore, 'users', usuarioLogeado.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.error('No se encontró el documento del administrador en Firestore.');
        this.isLoading = false;
        return;
      }

      // 3. Extraer el campo 'empresa_id' de su documento
      const datosAdmin = userDocSnap.data();
      this.miEmpresaId = datosAdmin['empresa_id'];

      if (!this.miEmpresaId) {
        console.error('El usuario logeado no tiene un "empresa_id" asociado.');
        this.isLoading = false;
        return;
      }

      // 4. Buscar todos los usuarios que tengan ese mismo 'empresa_id' y tengan rol 'empleado'
      // Conservamos el filtro activo: true para listar solo el personal operativo vigente
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef,
        where('empresa_id', '==', this.miEmpresaId),
        where('activo', '==', true),
        where('rol', "==", "empleado")
      );

      const querySnapshot = await getDocs(q);

      this.usuariosActivos = [];
      querySnapshot.forEach((documento) => {
        // Opcional: Si no quieres que el administrador se vea a sí mismo en la lista, 
        // puedes descomentar la siguiente validación:
        if (documento.id === usuarioLogeado.uid) return;
        this.usuariosActivos.push({
          uid: documento.id,
          nombre: documento.data()['nombre_user'] || 'Usuario sin nombre',
          correo: documento.data()['correo_user'] || 'Correo no disponible',
          rol: documento.data()['rol'] || 'Rol no disponible',
          activo: documento.data()['activo'] || false
        });
      });

    } catch (error) {
      console.error('Error en el flujo de consulta relacional:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async confirmDarDeBajaUsuario(usuario: any): Promise<void> {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas dar de baja a ${usuario.nombre}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#808080',
      confirmButtonText: 'Dar de baja'
    }).then(async (result: any) => {
      if (result.isConfirmed) {
        await this.darDeBajaUsuario(usuario);
      }
    });
  }

  // Mantiene la misma lógica segura para dar de baja
  async darDeBajaUsuario(usuario: any): Promise<void> {
    if (usuario.rol !== 'empleado') return;

    try {
      const docRef = doc(this.firestore, 'users', usuario.uid);

      await updateDoc(docRef, {
        activo: false,
      });

      // Actualización reactiva de la UI
      this.usuariosActivos = this.usuariosActivos.filter(u => u.uid !== usuario.uid);
    } catch (error) {
      console.error('Error al procesar la baja en Firestore:', error);
    }
  }

  invitarUsuario(): void {
    this.dialog.open(MainInvitarUsuarioComponent, {
      width: '600px',
      data: { empresa_id: this.miEmpresaId } 
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

}
