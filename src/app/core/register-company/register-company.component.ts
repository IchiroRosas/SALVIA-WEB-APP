import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import Swal from 'sweetalert2';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PasarelaPagoComponent } from '../pasarela-pago/pasarela-pago.component';
import { AuthService } from '../services/auth.service';

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
    this.empresaForm = this.fb.group({
      razonSocial: ['', [Validators.required, Validators.minLength(3)]],
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]]
    });
  }

  async registrarEmpresa(): Promise<void> {
    if (this.empresaForm.invalid) return;

    this.isLoading = true;

    try {
      const empresaYaRegistrada = await this.authService.obtenerIdEmpresaPorRuc(this.empresaForm.value.ruc);
      if (empresaYaRegistrada) {
        this.isLoading = false;
        throw { code: 'auth/company-already-registered' };
      }

      const dialogRef = this.dialog.open(PasarelaPagoComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed().pipe(take(1)).subscribe((pagoExitoso: boolean) => {
        if (pagoExitoso) {
          this.isLoading = true;
          this.errorMessage = null;

          const { razonSocial, ruc } = this.empresaForm.value;

          this.authService.guardarEmpresa(razonSocial, ruc)
            .then(() => {
              Swal.fire({
                icon: 'success',
                title: '¡Registro Exitoso!',
                text: `No olvides registrar a los usuarios asociados a tu empresa para que puedan acceder al sistema.`,
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

    } catch (error:any) {
      if (error.code === 'auth/company-already-registered') {
        Swal.fire({
          icon: 'warning',
          title: 'Error de registro',
          text: 'Ya existe una empresa registrada con ese RUC.',
          confirmButtonColor: '#ff4d4d'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error inesperado',
          text: 'Ocurrió un error al intentar registrar la empresa.',
          confirmButtonColor: '#ff4d4d'
        });
      }
    }

  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
