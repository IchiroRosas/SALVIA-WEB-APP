import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { take } from 'rxjs';
import Swal from 'sweetalert2';

//import { LoginService } from '../../services/login.service'; 
import { Usuario } from '../../shared/models/dto';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.css'
})
export class RegisterCompanyComponent implements OnInit {
  private fb = inject(FormBuilder);

  empresaForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  router = inject(Router);

  ngOnInit(): void {
    // 1. Generamos el UID aleatorio de 20 caracteres
    const uidInstanciado = this.generarFirebaseId();

    // 2. Inicializamos el formulario reactivo
    this.empresaForm = this.fb.group({
      uid: [uidInstanciado, Validators.required],
      razonSocial: ['', [Validators.required, Validators.minLength(3)]],
      // Valida que sean solo números y que tenga exactamente entre 10 y 11 caracteres
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]]
    });
  }

  // Algoritmo que emula los UIDs de colección de Firebase
  generarFirebaseId(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let resultado = '';
    for (let i = 0; i < 20; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
  }

  copiarUID(): void {
    const uidValue = this.empresaForm.get('uid')?.value;
    if (uidValue) {
      navigator.clipboard.writeText(uidValue);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '¡UID copiado al portapapeles!',
        showConfirmButton: false,
        timer: 2000
      });
    }
  }

  registrarEmpresa(): void {
    if (this.empresaForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    const datosEmpresa = this.empresaForm.value;
    console.log('Datos enviados a la pasarela/Firestore:', datosEmpresa);

    // Aquí ejecutas tu lógica de envío
    // ...
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
