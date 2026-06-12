import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

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
      correoControl?.setValue('');
      passwordControl?.setValue('');
    } else {
      correoControl?.setValidators([Validators.required, Validators.email]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
    }

    correoControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
  }

  ejecutarRegistro(): void {
    if (this.empleadoForm.invalid) return;

    this.isLoading = true;
    const datosUsuario = this.empleadoForm.value;

    if (this.metodoRegistro === 'tradicional') {
      console.log('Registrando via Firebase Email/Password:', datosUsuario);
      
      // Aquí iría tu servicio: this.authService.registerWithEmail(...)

    } else {
      console.log('Registrando-lanzando PopUp de Google Auth:', {
        uid: datosUsuario.uid,
        nombre: datosUsuario.nombreCompleto,
        rol: datosUsuario.rol
      });

      //Aquí se lanzaría el PopUp de Google Auth y luego se procesaría la respuesta para crear el usuario en Firebase con el rol asignado.
      // Aquí iría tu servicio: this.authService.registerWithGooglePopup(...)

    }

    setTimeout(() => {
      this.isLoading = false;
      Swal.fire({
        icon: 'success',
        title: 'Usuario registrado',
        text: `El perfil fue creado exitosamente bajo el rol de ${datosUsuario.rol}.`,
        confirmButtonColor: '#3287bd'
      }).then(() => this.volver());
    }, 1500);
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}