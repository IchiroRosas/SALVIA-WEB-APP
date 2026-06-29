import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sub-expirada-comunicado',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './sub-expirada-comunicado.component.html',
  styleUrls: ['./sub-expirada-comunicado.component.css']
})
export class SubExpiradaComunicadoComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SubExpiradaComunicadoComponent>);
  private router = inject(Router);

  isLoading = false;
  usuarioAdministrador: string = sessionStorage.getItem('rol') || '';

  ngOnInit(): void {
    // Si regresa aquí tras cancelar, reaccionamos al estado (en caso de que vuelva a la vista base)
    const state = history.state;
    if (state && state.origin === 'sub-expirada' && state.pagoExitoso === false) {
      Swal.fire({
        icon: 'warning',
        title: 'Pago Cancelado',
        text: 'No se realizaron cargos. Tu cuenta sigue suspendida temporalmente.',
        confirmButtonColor: '#475569'
      });
    }
  }

  volver(): void {
    sessionStorage.clear();
    this.dialogRef.close();
    this.router.navigate(['/login']);
    window.location.reload();
  }

  renovar(): void {
    // Cierra el modal de advertencia antes de cambiar de página
    this.dialogRef.close(); 
    
    // Envía al usuario a la página completa de pagos indicando el origen
    this.router.navigate(['/pasarela-pago'], {
      state: { returnUrl: this.router.url, origin: 'sub-expirada' }
    });
  }
}