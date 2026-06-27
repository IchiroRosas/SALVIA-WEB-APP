import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Firestore, collection, getDocs, query, where, doc, getDoc, addDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { ProductoRecursoDb } from '../../../../../shared/models/dto'; // Ajusta según tu archivo de DTOs

@Component({
  selector: 'app-agregar-prod-recurso',
  standalone: true,
  // 🌟 CRUCIAL: Añadir FormsModule y ReactiveFormsModule aquí para que compile el HTML
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agregar-prod-recurso.component.html',
  styleUrl: './agregar-prod-recurso.component.css'
})
export class AgregarProdRecursoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<AgregarProdRecursoComponent>);
  private toastr = inject(ToastrService);

  recursoForm!: FormGroup;
  isSubmitting = false;

  listaProveedores: any[] = [];
  buscarProveedor = '';
  showProvDropdown = false;

  ngOnInit(): void {
    this.recursoForm = this.fb.group({
      descripcion_prod: ['', [Validators.required, Validators.minLength(2)]],
      marca_prod: [''],
      precio_compra: [0, [Validators.required, Validators.min(0)]],
      id_proveedor: ['', [Validators.required]]
    });

    this.cargarDatosEmpresa();
  }

  async cargarDatosEmpresa(): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;

      const miEmpresaId = userSnap.data()['empresa_id'];
      if (!miEmpresaId) return;

      const provQuery = query(
        collection(this.firestore, 'proveedores'),
        where('empresa_id', '==', miEmpresaId),
        where('activo', '==', true)
      );
      const provSnap = await getDocs(provQuery);
      this.listaProveedores = provSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
      console.error('Error al precargar proveedores:', error);
    }
  }

  get proveedoresFiltrados(): any[] {
    if (!this.buscarProveedor.trim()) return this.listaProveedores;
    return this.listaProveedores.filter(p =>
      // 🌟 Corrección TypeScript estricto: Acceso seguro por llave de cadena
      p['nombre_proveedor']?.toLowerCase().includes(this.buscarProveedor.toLowerCase())
    );
  }

  seleccionarProveedor(prov: any): void {
    this.buscarProveedor = prov['nombre_proveedor'];
    this.recursoForm.patchValue({ id_proveedor: prov.id });
    this.showProvDropdown = false;
  }

  evaluarLimpiezaCelda(): void {
    setTimeout(() => {
      if (!this.buscarProveedor.trim()) {
        this.recursoForm.patchValue({ id_proveedor: '' });
      }
    }, 200);
  }

  async guardar(): Promise<void> {
    if (this.recursoForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Sesión inválida.');

      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      const miEmpresaId = userSnap.data()?.['empresa_id'];

      const nuevoRecurso: ProductoRecursoDb = {
        descripcion_prod: this.recursoForm.value.descripcion_prod.trim(),
        marca_prod: this.recursoForm.value.marca_prod?.trim() || 'Sin Marca',
        precio_compra: Number(this.recursoForm.value.precio_compra),
        id_proveedor: this.recursoForm.value.id_proveedor,
        empresa_id: miEmpresaId,
        activo: true
      };

      await addDoc(collection(this.firestore, 'producto_recurso'), nuevoRecurso);

      this.toastr.success('El recurso interno se registró correctamente.', '¡Agregado!', {
        timeOut: 2500,
        progressBar: true
      });

      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error al guardar:', error);
      this.toastr.error('Ocurrió un error inesperado.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}