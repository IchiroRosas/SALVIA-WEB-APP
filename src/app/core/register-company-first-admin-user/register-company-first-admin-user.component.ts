import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register-company-first-admin-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-company-first-admin-user.component.html',
  styleUrl: './register-company-first-admin-user.component.css'
})
export class RegisterCompanyFirstAdminUserComponent implements OnInit {
  private fb = inject(FormBuilder);
  router = inject(Router);
  private authService = inject(AuthService);

  empleadoForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  metodoRegistro: 'tradicional' | 'google' = 'tradicional';

  ngOnInit(): void {
    this.empleadoForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      razonSocial: ['', [Validators.required, Validators.minLength(3)]],
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Restaura el estado solo si el usuario canceló el pago y regresó voluntariamente
    const state = history.state;
    if (state && state.origin === 'registro-empresa') {
      this.empleadoForm.patchValue(state.formData);
      this.metodoRegistro = state.metodoRegistro || 'tradicional';

      if (state.pagoExitoso === false) {
        Swal.fire({
          icon: 'warning',
          title: 'Pago Cancelado',
          text: 'No se realizaron cargos. Completa el pago para registrar tu empresa.',
          confirmButtonColor: '#475569'
        });
      }
    }
  }

  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  cambiarMetodo(metodo: 'tradicional' | 'google'): void {
    this.metodoRegistro = metodo;
    this.errorMessage = null;

    const correoControl = this.empleadoForm.get('correo');
    const passwordControl = this.empleadoForm.get('password');
    const confirmPasswordControl = this.empleadoForm.get('confirmPassword');

    if (metodo === 'google') {
      correoControl?.clearValidators();
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
      correoControl?.setValue('google@temporal.com');
      passwordControl?.setValue('123456');
      confirmPasswordControl?.setValue('123456');
    } else {
      correoControl?.setValidators([Validators.required, Validators.email]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPasswordControl?.setValidators([Validators.required]);
      correoControl?.setValue('');
      passwordControl?.setValue('');
      confirmPasswordControl?.setValue('');
    }

    correoControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
    this.empleadoForm.updateValueAndValidity();
  }

  async ejecutarRegistro(): Promise<void> {
    if (this.empleadoForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    const datosFormulario = this.empleadoForm.value;

    try {
      const rucExistenteId = await this.authService.obtenerIdEmpresaPorRuc(datosFormulario.ruc);
      if (rucExistenteId) {
        throw {
          code: 'app/ruc-already-exists',
          message: 'Ya existe una empresa registrada con ese RUC en el sistema de SALVIA.'
        };
      }

      this.isLoading = false;

      // Redirige delegando los datos ingresados a la Pasarela de Pago
      this.router.navigate(['/pasarela-pago'], {
        state: {
          returnUrl: this.router.url,
          origin: 'registro-empresa',
          formData: datosFormulario,
          metodoRegistro: this.metodoRegistro
        }
      });

    } catch (error: any) {
      this.isLoading = false;
      this.manejarErroresCentralizados(error);
    }
  }

  private manejarErroresCentralizados(error: any): void {
    if (error.code === 'app/ruc-already-exists') {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    }

    Swal.fire({
      icon: 'error',
      title: 'Error de registro',
      text: this.errorMessage ?? '',
      confirmButtonColor: '#ff4d4d'
    });
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}