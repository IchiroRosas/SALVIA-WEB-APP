import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-modificar-provider',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modificar-proveedor.component.html',
  styleUrl: './modificar-proveedor.component.css'
})
export class ModificarProveedorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private dialogRef = inject(MatDialogRef<ModificarProveedorComponent>);
  private toastr = inject(ToastrService);

  // 🌟 Inyectamos la data del proveedor seleccionado desde la tabla padre
  protected data = inject<any>(MAT_DIALOG_DATA);

  proveedorForm!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.proveedorForm = this.fb.group({
      nombre_proveedor: [this.data?.nombre_proveedor || '', [Validators.required, Validators.minLength(3)]],
      num_proveedor: [this.data?.num_proveedor || '', [Validators.required, Validators.pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/)]],
      direccion1_prov: [this.data?.direccion1_prov || '', [Validators.required]],
      direccion2_prov: [this.data?.direccion2_prov || '']
    });
  }

  async modificar(): Promise<void> {
    if (this.proveedorForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      // Apuntamos al documento exacto usando el id que viene en la data
      const provDocRef = doc(this.firestore, 'proveedores', this.data.id);

      const cambiosProveedor = {
        nombre_proveedor: this.proveedorForm.value.nombre_proveedor.trim(),
        num_proveedor: this.proveedorForm.value.num_proveedor.trim(),
        direccion1_prov: this.proveedorForm.value.direccion1_prov.trim(),
        direccion2_prov: this.proveedorForm.value.direccion2_prov?.trim() || ''
      };

      await updateDoc(provDocRef, cambiosProveedor);

      this.toastr.success('Información de proveedor actualizada.', '¡Éxito!', {
        timeOut: 2500,
        progressBar: true
      });

      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error al actualizar el proveedor:', error);
      this.toastr.error('No se pudieron guardar los cambios en la base de datos.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}