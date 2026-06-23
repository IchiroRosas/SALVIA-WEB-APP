import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-modificar-categoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modificar-categoria.component.html',
  styleUrl: './modificar-categoria.component.css'
})
export class ModificarCategoriaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private dialogRef = inject(MatDialogRef<ModificarCategoriaComponent>);
  private toastr = inject(ToastrService);

  // 🌟 Inyectamos la data recibida del padre
  protected data = inject<any>(MAT_DIALOG_DATA);

  categoriaForm!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.categoriaForm = this.fb.group({
      // 🌟 Eliminamos Validators.trim de aquí también
      nombre_categoria: [this.data?.nombre_categoria || '', [Validators.required, Validators.minLength(3)]]
    });
  }

  async modificar(): Promise<void> {
    if (this.categoriaForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      // Apuntamos al documento exacto usando el id recibido
      const catDocRef = doc(this.firestore, 'categorias', this.data.id);

      await updateDoc(catDocRef, {
        nombre_categoria: this.categoriaForm.value.nombre_categoria.trim()
      });

      // 🌟 TOAST DE ÉXITO: Aparece inmediatamente antes de cerrar
      this.toastr.success('La categoría se actualizó correctamente.', '¡Éxito!', {
        timeOut: 2500,        // Duración corta (2.5 segundos)
        progressBar: true,    // Barra visual de tiempo transcurrido
        positionClass: 'toast-top-right'
      });

      this.dialogRef.close(true);
      
    } catch (error) {
      console.error('Error al actualizar la categoría:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}