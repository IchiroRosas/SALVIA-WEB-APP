import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-employee.component.html',
  styleUrl: './register-employee.component.css'
})

export class RegisterEmployeeComponent implements OnInit {
  private fb = inject(FormBuilder);
  router = inject(Router);
  private authService = inject(AuthService);

  empleadoForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  metodoRegistro: 'tradicional' | 'google' = 'tradicional';

  ngOnInit(): void {
    this.empleadoForm = this.fb.group({
      uid: ['', [Validators.required, Validators.maxLength(20)]],
      nombreCompleto: ['', [Validators.required, Validators.minLength(4)]],
      rol: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  cambiarMetodo(metodo: 'tradicional' | 'google'): void {
    this.metodoRegistro = metodo;
    this.errorMessage = null;

    const correoControl = this.empleadoForm.get('correo');
    const passwordControl = this.empleadoForm.get('password');

    if (metodo === 'google') {
      correoControl?.clearValidators();
      passwordControl?.clearValidators();
      correoControl?.setValue('google@temporal.com');
      passwordControl?.setValue('123456');
    } else {
      correoControl?.setValidators([Validators.required, Validators.email]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      correoControl?.setValue('');
      passwordControl?.setValue('');
    }
    correoControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
  }

  async ejecutarRegistro(): Promise<void> {
    if (this.empleadoForm.invalid) return;
    const correoControl = this.empleadoForm.get('correo');

    this.isLoading = true;
    this.errorMessage = null;
    const datosUsuario = this.empleadoForm.value;

    try {
      const empresaExiste = await this.authService.verificarEmpresaExiste(datosUsuario.uid);

      if (!empresaExiste) {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Empresa no encontrada',
          text: 'El UID ingresado no corresponde a ninguna empresa registrada en Salvia.',
          confirmButtonColor: '#ef4444'
        });
        return;
      }

      if (this.metodoRegistro === 'tradicional') {
        const usuarioYaRegistrado = await this.authService.comprobarUsuarioRegistrado(correoControl?.value, datosUsuario.uid);

        if (usuarioYaRegistrado) {
          this.isLoading = false;
          throw { code: 'auth/user-already-registered' };
        }
      }

      if (this.metodoRegistro === 'tradicional') {
        await this.authService.registrarConEmail(datosUsuario);
      } else {
        await this.authService.registrarConGoogle(datosUsuario);
      }

      this.isLoading = false;

      Swal.fire({
        icon: 'success',
        title: '¡Usuario Registrado!',
        text: `El perfil fue guardado con éxito bajo el rol de "${datosUsuario.rol}".`,
        confirmButtonColor: '#3287bd'
      }).then(() => this.volver());

    } catch (error: any) {
      this.isLoading = false;
      console.error('Error durante el registro:', error);

      if (error.code === 'auth/email-already-in-use' || error.code === 'auth/user-already-registered') {
        this.errorMessage = 'Esta cuenta (correo o perfil de Google) ya se encuentra registrada bajo el UID de esta empresa.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Se cerró la ventana de autenticación de Google.';
      } else {
        this.errorMessage = 'Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error de registro',
        text: this.errorMessage,
        confirmButtonColor: '#ff4d4d'
      });
    }
  }

  volver(): void {
    this.router.navigate(['/login']);
  }

}