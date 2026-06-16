import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PasarelaPagoComponent } from '../pasarela-pago/pasarela-pago.component';
import { take } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

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
  private auth = inject(Auth);
  private firestore = inject(Firestore);

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
          // 1. Intentamos recuperar el ID de la empresa desde el sessionStorage
          const rucEmpresa = sessionStorage.getItem('empresa_ruc');
          const nombreEmpresa = sessionStorage.getItem('nombre_empresa') || 'Empresa';
          let empresaId = rucEmpresa ? await this.authService.obtenerIdEmpresaPorRuc(rucEmpresa) : null;

          // 🌟 PLAN DE RESCATE: Si sessionStorage falló o está vacío (por limpiezas de pruebas)
          if (!empresaId) {
            console.warn('RUC no encontrado en sesión. Iniciando plan de rescate desde Firebase Auth...');
            const uidAuth = this.auth.currentUser?.uid;

            if (uidAuth) {
              // Vamos directo al documento del usuario en la colección 'users' de Firestore
              const userDocRef = doc(this.firestore, 'users', uidAuth);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                empresaId = userDocSnap.data()['empresa_id'] || null;
                console.log('¡Plan de rescate exitoso! Empresa ID recuperado de Firestore:', empresaId);
              }
            }
          }

          // Si después de ambos intentos sigue sin aparecer, lanzamos el error controlado
          if (!empresaId) {
            throw new Error('No se encontró el identificador de la empresa en la sesión ni en el perfil de Firestore.');
          }

          // 2. Ejecutamos la reactivación real en Cloud Firestore
          await this.authService.reactivarEmpresa(empresaId);
          console.log(`Empresa ${empresaId} - "${nombreEmpresa}" reactivada exitosamente.`);

          this.isLoading = false;

          // 3. Notificación de éxito rotundo y limpieza segura de sesión
          Swal.fire({
            icon: 'success',
            title: '¡Suscripción Renovada!',
            text: 'Tu pago fue procesado. El acceso a Salvia ha sido restablecido.',
            confirmButtonColor: '#3287bd'
          }).then(() => {
            this.dialogRef.close();
            sessionStorage.clear(); // 🌟 Se limpia la sesión SOLO cuando todo salió perfecto
            this.router.navigate(['/login']);
          });

        } catch (error) {
          this.isLoading = false;
          console.error('Error al procesar la renovación en la base de datos:', error);

          // NOTA: Quitamos el sessionStorage.clear() de aquí para que el usuario pueda 
          // reintentar el pago sin que se le rompa la sesión en un segundo intento.

          Swal.fire({
            icon: 'error',
            title: 'Error de activación',
            text: 'El pago se procesó, pero ocurrió un problema al activar tu suscripción en el sistema. Por favor, contacta a soporte.',
            confirmButtonColor: '#ef4444'
          });
        }

      } else {
        // Si cancela el pago, no le borramos la sesión para permitirle volver a hacer clic en "Renovar"
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
