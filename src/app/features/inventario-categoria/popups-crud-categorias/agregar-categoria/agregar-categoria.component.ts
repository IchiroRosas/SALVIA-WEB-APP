import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Firestore, collection, addDoc, doc, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-agregar-categoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agregar-categoria.component.html',
  styleUrl: './agregar-categoria.component.css'
})
export class AgregarCategoriaComponent {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<AgregarCategoriaComponent>);
  private toastr = inject(ToastrService);

  categoriaForm: FormGroup;
  isSubmitting = false;

  constructor() {
    this.categoriaForm = this.fb.group({
      nombre_categoria: ['', [Validators.required, Validators.minLength(3)]]
    });
  }
  async registrar(): Promise<Array<any> | any> {
    if (this.categoriaForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      const authUser = this.auth.currentUser;
      if (!authUser) throw new Error('Usuario no autenticado');

      // 1. Obtener empresa_id del documento del usuario en Firestore
      const userDocRef = doc(this.firestore, 'users', authUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) throw new Error('No se encontraron datos del usuario');
      const userData = userSnap.data();
      const empresaId = userData['empresa_id'];

      if (!empresaId) throw new Error('El usuario no tiene una empresa asignada');

      // 2. Insertar en la colección 'categorias'
      const nuevaCategoria = {
        nombre_categoria: this.categoriaForm.value.nombre_categoria.trim(),
        empresa_id: empresaId,
        activo: true
      };

      await addDoc(collection(this.firestore, 'categorias'), nuevaCategoria);

      // 3. Mostrar toast de éxito y cerrar modal
      this.toastr.success('La categoría se registró correctamente.', '¡Éxito!', {
        timeOut: 2500,        // Duración corta (2.5 segundos)
        progressBar: true,    // Barra visual de tiempo transcurrido
        positionClass: 'toast-top-right'
      });


      // Cerrar devolviendo true para confirmar éxito
      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error al registrar categoría:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}