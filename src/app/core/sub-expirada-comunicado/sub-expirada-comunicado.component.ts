import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PasarelaPagoComponent } from '../pasarela-pago/pasarela-pago.component';
import { take } from 'rxjs';
import Swal from 'sweetalert2';

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

  isLoading = false;

  usuarioAdministrador: string = sessionStorage.getItem('rol') || 'Administrador';

  volver(): void {
    this.dialogRef.close();
    this.router.navigate(['/login']);
    window.location.reload();
  }

  renovar(): void {
    const pasarelaRef = this.dialog.open(PasarelaPagoComponent, {
      width: '400px',
      disableClose: true
    });

    pasarelaRef.afterClosed().pipe(take(1)).subscribe((pagoExitoso: boolean) => {
      if (pagoExitoso) {
        this.isLoading = true;
        console.log('Pago de renovación verificado con éxito de forma simulada.');

        // Simulamos la actualización del estado de la suscripción en base de datos

        setTimeout(() => {
          this.isLoading = false;

          Swal.fire({
            icon: 'success',
            title: '¡Suscripción Renovada!',
            text: 'Tu pago fue procesado. El acceso a Salvia ha sido restablecido.',
            confirmButtonColor: '#3287bd'
          }).then(() => {
            this.dialogRef.close();
            this.router.navigate(['/login']);
          });
        }, 1500);
      } else {
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
