import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { take } from 'rxjs';
import Swal from 'sweetalert2';

//import { LoginService } from '../../services/login.service'; 
import { Usuario } from '../../shared/models/dto';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);
  // private loginService = inject(LoginService);
  private fb = inject(FormBuilder);

  loginForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  usuarioLogeado: Usuario[] = [];

  ngOnInit() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  /*
  async iniciarSesion() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    const { correo, password } = this.loginForm.value;

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, correo, password);
      
      this.loginService.obtenerDatosUsuarioLogeado(userCredential.user.uid)
        .pipe(take(1))
        .subscribe({
          next: (usuarioLogeado) => {
            if (usuarioLogeado.length === 0) {
              this.auth.signOut();
              this.errorMessage = 'Acceso denegado. No eres administrador.';
              this.isLoading = false;
              return;
            }

            this.llenarSessionStorage(usuarioLogeado[0]);
            this.router.navigate(['/login']); // Cambia aquí a la ruta a la que deseas redirigir tras logearte
            this.mensajeBienvenida();
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Error al verificar los permisos del usuario.';
            this.isLoading = false;
          }
        });
        
    } catch (error) {
      this.errorMessage = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      this.isLoading = false;
    }
  }
  */

  llenarSessionStorage(usuarioLogeado: Usuario) {
    sessionStorage.setItem('nombres', usuarioLogeado.nombres || '');
    sessionStorage.setItem('apellidos', usuarioLogeado.apellidos || '');
    sessionStorage.setItem('email', usuarioLogeado.email || '');
    sessionStorage.setItem('nroDocumento', usuarioLogeado.dni || '');
    sessionStorage.setItem('celular', usuarioLogeado.celular || '');
  }

  mensajeBienvenida() {
    Swal.fire({
      icon: 'success',
      title: `¡Bienvenido(a) ${sessionStorage.getItem('nombres')} ${sessionStorage.getItem('apellidos')}!`,
      text: 'Has iniciado sesión correctamente.',
      timer: 2000,
      showConfirmButton: false
    });
  }

  irARegistrarEmpresa() {
    this.router.navigate(['/registrar-empresa']);
  }

  irARegistrarEmpleado() {
    this.router.navigate(['/registrar-empleado']);
  }

}