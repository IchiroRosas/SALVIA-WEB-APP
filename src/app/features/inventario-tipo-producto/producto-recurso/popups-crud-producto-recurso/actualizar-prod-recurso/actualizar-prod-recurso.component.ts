import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Firestore, collection, getDocs, query, where, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { ProductoRecursoDb } from '../../../../../shared/models/dto'; // Ajusta la ruta exacta de tus DTOs

@Component({
  selector: 'app-actualizar-prod-recurso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule],
  templateUrl: './actualizar-prod-recurso.component.html',
  styleUrl: './actualizar-prod-recurso.component.css'
})
export class ActualizarProdRecursoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<ActualizarProdRecursoComponent>);
  private toastr = inject(ToastrService);
  private data = inject(MAT_DIALOG_DATA);

  idRecurso!: string;
  recursoForm!: FormGroup;
  isSubmitting = false;
  isLoading = true;

  listaProveedores: any[] = [];
  buscarProveedor = '';
  showProvDropdown = false;

  ngOnInit(): void {
    // Capturamos el ID del recurso enviado desde el componente de listado
    this.idRecurso = this.data.idRecurso;

    // Inicialización del formulario reactivo con campos de producto_recurso
    this.recursoForm = this.fb.group({
      descripcion_prod: ['', [Validators.required, Validators.minLength(2)]],
      marca_prod: [''],
      precio_compra: [0, [Validators.required, Validators.min(0)]],
      id_proveedor: ['', [Validators.required]]
    });

    this.inicializarDatos();
  }

  async inicializarDatos(): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      // 1. Conseguir empresa_id del usuario actual
      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;
      const miEmpresaId = userSnap.data()['empresa_id'];

      // 2. Cargar Proveedores Activos de la empresa
      const provQuery = query(
        collection(this.firestore, 'proveedores'), 
        where('empresa_id', '==', miEmpresaId), 
        where('activo', '==', true)
      );
      const provSnap = await getDocs(provQuery);
      this.listaProveedores = provSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Recuperar el documento del recurso actual desde Firestore
      const recursoDocRef = doc(this.firestore, 'producto_recurso', this.idRecurso);
      const recursoSnap = await getDoc(recursoDocRef);

      if (recursoSnap.exists()) {
        const recursoData = recursoSnap.data();

        // Rellenamos el Formulario Reactivo
        this.recursoForm.patchValue({
          descripcion_prod: recursoData['descripcion_prod'],
          marca_prod: recursoData['marca_prod'] || '',
          precio_compra: recursoData['precio_compra'] ?? 0,
          id_proveedor: recursoData['id_proveedor'] || ''
        });

        // Resolver la cadena del input buscador del proveedor
        const provAsignado = this.listaProveedores.find(p => p.id === recursoData['id_proveedor']);
        if (provAsignado) this.buscarProveedor = provAsignado['nombre_proveedor'];
      } else {
        this.toastr.error('El recurso solicitado no existe.', 'Error');
        this.dialogRef.close();
      }

    } catch (error) {
      console.error('Error al precargar la información del recurso:', error);
      this.toastr.error('Error al consultar los registros del recurso.', 'Error');
    } finally {
      this.isLoading = false;
    }
  }

  // Filtrado reactivo en tiempo real para proveedores
  get proveedoresFiltrados(): any[] {
    if (!this.buscarProveedor.trim()) return this.listaProveedores;
    return this.listaProveedores.filter(p =>
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

  async actualizar(): Promise<void> {
    if (this.recursoForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const recursoDocRef = doc(this.firestore, 'producto_recurso', this.idRecurso);

      // Payload mapeado según la colección
      const cambiosRecurso = {
        descripcion_prod: this.recursoForm.value.descripcion_prod.trim(),
        marca_prod: this.recursoForm.value.marca_prod?.trim() || 'Sin Marca',
        precio_compra: Number(this.recursoForm.value.precio_compra),
        id_proveedor: this.recursoForm.value.id_proveedor
      };

      await updateDoc(recursoDocRef, cambiosRecurso);

      this.toastr.success('El recurso se actualizó con éxito.', '¡Modificado!', {
        timeOut: 2500,
        progressBar: true
      });

      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error al actualizar el recurso:', error);
      this.toastr.error('No se pudieron guardar los cambios en la base de datos.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}