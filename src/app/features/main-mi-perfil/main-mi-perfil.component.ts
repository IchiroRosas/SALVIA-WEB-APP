import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-main-mi-perfil',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, UpperCasePipe],
  templateUrl: './main-mi-perfil.component.html',
  styleUrl: './main-mi-perfil.component.css'
})
export class MainMiPerfilComponent implements OnInit {

  private dialogRef = inject(MatDialogRef<MainMiPerfilComponent>);

  perfil = {
    correo_user: '',
    empresa_ruc: '',
    nombre_empresa: '',
    nombre_user: '',
    rol: ''
  };

  ngOnInit(): void {
    this.obtenerDatosSesion();
  }

  private obtenerDatosSesion(): void {
    this.perfil.correo_user = sessionStorage.getItem('correo_user') || 'No registrado';
    this.perfil.nombre_empresa = sessionStorage.getItem('nombre_empresa') || 'Sin Empresa';
    this.perfil.empresa_ruc = sessionStorage.getItem('empresa_ruc') || 'Sin RUC';
    this.perfil.nombre_user = sessionStorage.getItem('nombre_user') || 'Usuario Salvia';
    this.perfil.rol = sessionStorage.getItem('rol') || 'Sin rol asignado';
  }

  cerrar(): void {
    this.dialogRef.close();
  }
  
}
