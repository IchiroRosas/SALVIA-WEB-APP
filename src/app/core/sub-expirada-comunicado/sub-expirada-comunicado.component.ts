import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PasarelaPagoComponent } from '../pasarela-pago/pasarela-pago.component';
import { take } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sub-expirada-comunicado',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './sub-expirada-comunicado.component.html',
  styleUrls: ['./sub-expirada-comunicado.component.css']
})
export class SubExpiradaComunicadoComponent {
  private dialogRef = inject(MatDialogRef<SubExpiradaComunicadoComponent>);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private authService = inject(AuthService);

  isLoading = false;

  usuarioAdministrador: string = sessionStorage.getItem('rol') || '';

  volver(): void {
    sessionStorage.clear();
    this.dialogRef.close();
    this.router.navigate(['/login']);
    window.location.reload();
  }

  renovar(): void {
    const pasarelaRef = this.dialog.open(PasarelaPagoComponent, {
      width: '400px',
      disableClose: true
    });

    pasarelaRef.afterClosed().pipe(take(1)).subscribe(async (pagoExitoso: boolean) => {
      if (pagoExitoso) {
        this.isLoading = true;

        try {
          // 1. Recuperamos el ID de la empresa guardado previamente en la sesión
          const empresaId = sessionStorage.getItem('empresa_id');
          const nombreEmpresa = sessionStorage.getItem('nombre_empresa');

          if (!empresaId) {
            throw new Error('No se encontró el identificador de la empresa en la sesión actual.');
          }

          // 2. Ejecutamos la reactivación real en Cloud Firestore
          await this.authService.reactivarEmpresa(empresaId);
          console.log(`Empresa ${empresaId} - "${nombreEmpresa}" reactivada exitosamente en base de datos.`);

          this.isLoading = false;

          // 3. Notificación de éxito rotundo
          Swal.fire({
            icon: 'success',
            title: '¡Suscripción Renovada!',
            text: 'Tu pago fue procesado. El acceso a Salvia ha sido restablecido.',
            confirmButtonColor: '#3287bd'
          }).then(() => {
            this.dialogRef.close();
            sessionStorage.clear();
            this.router.navigate(['/login']);
          });

          sessionStorage.clear();

        } catch (error) {
          this.isLoading = false;
          console.error('Error al procesar la renovación en la base de datos:', error);
          sessionStorage.clear();
          Swal.fire({
            icon: 'error',
            title: 'Error de activación',
            text: 'El pago se procesó, pero ocurrió un problema al activar tu suscripción en el sistema. Por favor, contacta a soporte.',
            confirmButtonColor: '#ef4444'
          });
        }

      } else {
        sessionStorage.clear();
        Swal.fire({
          icon: 'warning',
          title: 'Pago Cancelado',
          text: 'No se realizaron cargos. Tu cuenta sigue suspendida temporalmente.',
          confirmButtonColor: '#475569'
        });
      }
    });
  }
}
