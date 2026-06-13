import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { take } from 'rxjs';
import Swal from 'sweetalert2';
//import { LoginService } from '../../services/login.service'; 
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PasarelaPagoComponent } from '../pasarela-pago/pasarela-pago.component';
import {AuthService} from '../services/auth.service';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.css'
})
export class RegisterCompanyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  router = inject(Router);
  private authService = inject(AuthService);

  empresaForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    const uidInstanciado = this.generarFirebaseId();
    this.empresaForm = this.fb.group({
      uid: [uidInstanciado, Validators.required],
      razonSocial: ['', [Validators.required, Validators.minLength(3)]],
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]]
    });
  }

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

    const dialogRef = this.dialog.open(PasarelaPagoComponent, {
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe((pagoExitoso: boolean) => {
      if (pagoExitoso) {
        this.isLoading = true;
        this.errorMessage = null;

        const { uid, razonSocial, ruc } = this.empresaForm.value;

        this.authService.guardarEmpresa(uid, razonSocial, ruc)
          .then(() => {
            Swal.fire({
              icon: 'success',
              title: '¡Registro Exitoso!',
              text: `No olvides guardar el UID para registrar los usuarios asociados a la empresa: ${uid}`,
              confirmButtonColor: '#3287bd'
            }).then(() => {
              this.isLoading = false;
              this.router.navigate(['/login']);
            });
          })
          .catch((error) => {
            console.error('Error al guardar en Firestore:', error);
            this.isLoading = false;
            this.errorMessage = 'Error al registrar la empresa en la base de datos. Inténtelo de nuevo.';

            Swal.fire({
              icon: 'error',
              title: 'Error de Servidor',
              text: 'No se pudo guardar la información de la empresa.',
              confirmButtonColor: '#ff4d4d'
            });
          });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Pago Cancelado',
          text: 'No se realizaron cargos. El registro de la empresa no se completó.',
          confirmButtonColor: '#475569'
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
