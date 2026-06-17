import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { MainInvitarUsuarioFormComponent } from '../main-invitar-usuario-form/main-invitar-usuario-form.component';

@Component({
  selector: 'app-main-invitar-usuario',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './main-invitar-usuario.component.html',
  styleUrl: './main-invitar-usuario.component.css'
})
export class MainInvitarUsuarioComponent implements OnInit {

  private dialogRef = inject(MatDialogRef<MainInvitarUsuarioComponent>);
  private dialog = inject(MatDialog);
  private firestore = inject(Firestore);
  public data = inject(MAT_DIALOG_DATA);

  invitadosPendientes: any[] = [];
  isLoading = true;
  empresaId = '';

  ngOnInit(): void {
    this.empresaId = this.data?.empresa_id || '';
    if (this.empresaId) {
      this.cargarInvitadosPendientes();
    } else {
      this.isLoading = false;
      console.error('No se recibió un empresa_id válido desde el componente padre.');
    }
  }

  async cargarInvitadosPendientes(): Promise<void> {
    this.isLoading = true;
    try {
      const listaBlancaRef = collection(this.firestore, 'lista_blanca');
      const q = query(
        listaBlancaRef,
        where('empresa_id', '==', this.empresaId),
        where('estado', '==', 'pendiente')
      );

      const querySnapshot = await getDocs(q);
      this.invitadosPendientes = [];

      querySnapshot.forEach((documento) => {
        this.invitadosPendientes.push({
          id: documento.id,
          ...documento.data()
        });
      });
    } catch (error) {
      console.error('Error al mapear la lista blanca:', error);
    } finally {
      this.isLoading = false;
    }
  }

  siguiente(): void {
    this.dialog.open(MainInvitarUsuarioFormComponent, {
      width: '500px',
      data: { empresa_id: this.empresaId }
    });
  }

  volver(): void {
    this.dialogRef.close();
  }

}
