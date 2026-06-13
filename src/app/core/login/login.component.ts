import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { UsuarioLogeadoDto } from '../../shared/models/dto';
import { SubExpiradaComunicadoComponent } from '../sub-expirada-comunicado/sub-expirada-comunicado.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

export class LoginComponent implements OnInit {

  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialog);

  loginForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  ngOnInit() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async loginTradicional() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    const { correo, password } = this.loginForm.value;

    try {
      const userCredential = await this.authService.loginConEmail(correo, password);
      await this.procesarFlujoPostLogin(userCredential.user.uid);
    } catch (error: any) {
      this.isLoading = false;
      console.error('Error de login tradicional:', error);

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        this.mostrarToastError('Credenciales incorrectas. Verifique su correo o contraseña.');
      } else {
        this.mostrarToastError('Error de conexión con el servidor de autenticación.');
      }
    }
  }

  async loginConGoogle() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const userCredential = await this.authService.loginConGooglePopup();

      await this.procesarFlujoPostLogin(userCredential.user.uid);

    } catch (error: any) {
      this.isLoading = false;
      console.error('Error de login con Google:', error);

      if (error.code !== 'auth/popup-closed-by-user') {
        this.mostrarToastError('No se pudo completar el inicio de sesión con Google.');
      }
    }
  }

  private async procesarFlujoPostLogin(uid: string): Promise<void> {
    try {
      // PASO A: Buscar el perfil del usuario firmado en la colección 'users'
      const perfilUsuario = await this.authService.obtenerPerfilUsuario(uid);

      if (!perfilUsuario) {
        // El usuario se autenticó (quizá con Google) pero no está dado de alta en la BD interna
        await this.authService.cerrarSesion();
        this.isLoading = false;
        this.mostrarToastError('Acceso denegado. Este usuario no está registrado en el sistema.');
        return;
      }

      // Si necesitas validar si el usuario individualmente está deshabilitado
      if (!perfilUsuario.activo) {
        await this.authService.cerrarSesion();
        this.isLoading = false;
        this.mostrarToastError('Su cuenta de usuario ha sido suspendida.');
        return;
      }

      // PASO B: Buscar el estado de la empresa asociada a ese usuario
      const datosEmpresa = await this.authService.obtenerDatosEmpresa(perfilUsuario.empresa_id);

      if (!datosEmpresa) {
        await this.authService.cerrarSesion();
        this.isLoading = false;
        this.mostrarToastError('Error crítico: No se encontró la empresa ligada a tu cuenta.');
        return;
      }

      // PASO C: Mapear y guardar temporalmente en el SessionStorage los datos requeridos por el sistema
      const infoSesion: UsuarioLogeadoDto = {
        user_uid: uid,
        nombre_user: perfilUsuario.nombre_user,
        correo_user: perfilUsuario.correo_user,
        rol: perfilUsuario.rol,
        activo: perfilUsuario.activo,
        empresa_id: perfilUsuario.empresa_id,
        nombre_empresa: datosEmpresa.nombre_empresa
      };

      this.llenarSessionStorage(infoSesion);

      // PASO D: Evaluar suscripción de la empresa
      if (datosEmpresa.activo === true) {
        // Suscripción al día -> Permitir acceso completo
        sessionStorage.setItem('activo', 'true');
        this.isLoading = false;
        this.mensajeBienvenida();
        this.router.navigate(['/menu-principal']);
      } else {
        // Suscripción vencida -> Bloquear pantalla con el Comunicado modal
        sessionStorage.setItem('activo', 'false');
        this.isLoading = false;
        this.mostrarComunicadoExpirada();
      }

    } catch (error) {
      await this.authService.cerrarSesion();
      this.isLoading = false;
      console.error('Error en el flujo post-login:', error);
      this.mostrarToastError('Hubo un problema verificando los permisos de tu empresa.');
    }
  }

  llenarSessionStorage(usuarioLogeado: UsuarioLogeadoDto) {
    sessionStorage.setItem('nombre_user', usuarioLogeado.nombre_user || '');
    sessionStorage.setItem('correo_user', usuarioLogeado.correo_user || '');
    sessionStorage.setItem('nombre_empresa', usuarioLogeado.nombre_empresa || '');
    sessionStorage.setItem('rol', usuarioLogeado.rol || '');
    sessionStorage.setItem('activo', usuarioLogeado.activo.toString() || '');
  }

  mensajeBienvenida() {
    Swal.fire({
      icon: 'success',
      title: `¡Bienvenido(a) ${sessionStorage.getItem('nombre_user')}!`,
      text: 'Has iniciado sesión correctamente.',
      timer: 2000,
      showConfirmButton: false
    });
  }

  mostrarToastError(mensaje: string): void {
    this.errorMessage = mensaje;
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: mensaje,
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true
    });
  }

  mostrarComunicadoExpirada() {
    const dialogRef = this.dialogRef.open(SubExpiradaComunicadoComponent, {
      width: '400px',
      disableClose: true
    })
  }

  irARegistrarEmpresa() {
    this.router.navigate(['/registrar-empresa']);
  }

  irARegistrarEmpleado() {
    this.router.navigate(['/registrar-empleado']);
  }

}