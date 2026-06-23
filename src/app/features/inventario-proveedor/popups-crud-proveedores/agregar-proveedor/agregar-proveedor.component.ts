import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Firestore, collection, addDoc, doc, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-agregar-provider',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agregar-proveedor.component.html',
  styleUrl: './agregar-proveedor.component.css'
})
export class AgregarProveedorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<AgregarProveedorComponent>);
  private toastr = inject(ToastrService);

  proveedorForm!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.proveedorForm = this.fb.group({
      nombre_proveedor: ['', [Validators.required, Validators.minLength(3)]],
      num_proveedor: ['', [Validators.required, Validators.pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/)]], // Validación básica de teléfono
      direccion1_prov: ['', [Validators.required]],
      direccion2_prov: [''] // Opcional
    });
  }

  async registrar(): Promise<void> {
    if (this.proveedorForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      // 1. Obtener el UID del usuario actual logueado
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('No se encontró un usuario autenticado.');

      // 2. Traer el documento del usuario para extraer su empresa_id
      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) throw new Error('El perfil de usuario no existe.');
      const userData = userSnap.data();
      const miEmpresaId = userData['empresa_id'];

      if (!miEmpresaId) throw new Error('El usuario no tiene una empresa asignada.');

      // 3. Construir el objeto limpiando campos de texto
      const nuevoProveedor = {
        nombre_proveedor: this.proveedorForm.value.nombre_proveedor.trim(),
        num_proveedor: this.proveedorForm.value.num_proveedor.trim(),
        direccion1_prov: this.proveedorForm.value.direccion1_prov.trim(),
        direccion2_prov: this.proveedorForm.value.direccion2_prov?.trim() || '',
        empresa_id: miEmpresaId,
        activo: true
      };

      // 4. Guardar en Firestore
      await addDoc(collection(this.firestore, 'proveedores'), nuevoProveedor);

      this.toastr.success('Proveedor registrado correctamente.', '¡Éxito!', {
        timeOut: 2500,
        progressBar: true
      });

      this.dialogRef.close(true);

    } catch (error: any) {
      console.error('Error al registrar el proveedor:', error);
      this.toastr.error(error.message || 'Hubo un problema al guardar.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}