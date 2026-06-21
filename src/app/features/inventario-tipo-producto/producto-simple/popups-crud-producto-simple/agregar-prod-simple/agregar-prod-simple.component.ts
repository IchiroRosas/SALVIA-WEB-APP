import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Firestore, collection, getDocs, query, where, doc, getDoc, addDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-agregar-prod-simple',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agregar-prod-simple.component.html',
  styleUrl: './agregar-prod-simple.component.css'
})
export class AgregarProdSimpleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<AgregarProdSimpleComponent>);
  private toastr = inject(ToastrService);

  productoForm!: FormGroup;
  isSubmitting = false;

  // Listas maestras descargadas de Firestore
  listaCategorias: any[] = [];
  listaProveedores: any[] = [];

  // Inputs de búsqueda en el Frontend
  buscarCategoria = '';
  buscarProveedor = '';

  // Controladores de visibilidad para los Dropdowns personalizados
  showCatDropdown = false;
  showProvDropdown = false;

  ngOnInit(): void {
    // Inicialización del formulario reactivo con valores por defecto
    this.productoForm = this.fb.group({
      descripcion_prod: ['', [Validators.required, Validators.minLength(2)]],
      marca_prod: [''],
      unidad_medida: ['', [Validators.required]],
      precio_compra_unitario: [0, [Validators.required, Validators.min(0)]],
      precio_venta_unitario: [0, [Validators.required, Validators.min(0)]],
      stock_actual: [0, [Validators.required, Validators.min(0)]],
      id_categoria: [''],  // Guardará el UID interno
      id_proveedor: ['']   // Guardará el UID interno
    });

    this.cargarDatosEmpresa();
  }

  async cargarDatosEmpresa(): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      // 1. Conseguir empresa_id del usuario logueado
      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;
      
      const miEmpresaId = userSnap.data()['empresa_id'];
      if (!miEmpresaId) return;

      // 2. Cargar Categorías Activas de la empresa
      const catQuery = query(
        collection(this.firestore, 'categorias'),
        where('empresa_id', '==', miEmpresaId),
        where('activo', '==', true)
      );
      const catSnap = await getDocs(catQuery);
      this.listaCategorias = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. Cargar Proveedores Activos de la empresa
      const provQuery = query(
        collection(this.firestore, 'proveedores'),
        where('empresa_id', '==', miEmpresaId),
        where('activo', '==', true)
      );
      const provSnap = await getDocs(provQuery);
      this.listaProveedores = provSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
      console.error('Error al precargar listas de configuración:', error);
    }
  }

  // Filtrado dinámico en tiempo real para Categorías
  get categoriasFiltradas(): any[] {
    if (!this.buscarCategoria.trim()) return this.listaCategorias;
    return this.listaCategorias.filter(c => 
      c.nombre_categoria.toLowerCase().includes(this.buscarCategoria.toLowerCase())
    );
  }

  // Filtrado dinámico en tiempo real para Proveedores
  get proveedoresFiltrados(): any[] {
    if (!this.buscarProveedor.trim()) return this.listaProveedores;
    return this.listaProveedores.filter(p => 
      p.nombre_proveedor.toLowerCase().includes(this.buscarProveedor.toLowerCase())
    );
  }

  // Selección de Categoría desde el Dropdown
  seleccionarCategoria(cat: any): void {
    this.buscarCategoria = cat.nombre_categoria;
    this.productoForm.patchValue({ id_categoria: cat.id });
    this.showCatDropdown = false;
  }

  // Selección de Proveedor desde el Dropdown
  seleccionarProveedor(prov: any): void {
    this.buscarProveedor = prov.nombre_proveedor;
    this.productoForm.patchValue({ id_proveedor: prov.id });
    this.showProvDropdown = false;
  }

  // Cierra los dropdowns si el usuario borra manualmente y lo deja en blanco
  evaluarLimpiezaCelda(tipo: 'cat' | 'prov'): void {
    setTimeout(() => {
      if (tipo === 'cat' && !this.buscarCategoria.trim()) {
        this.productoForm.patchValue({ id_categoria: '' });
      }
      if (tipo === 'prov' && !this.buscarProveedor.trim()) {
        this.productoForm.patchValue({ id_proveedor: '' });
      }
    }, 200);
  }

  async guardar(): Promise<void> {
    if (this.productoForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Sesión inválida.');

      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      const miEmpresaId = userSnap.data()?.['empresa_id'];

      // Estructuramos el payload exactamente como tu esquema de Firestore
      const nuevoProducto = {
        descripcion_prod: this.productoForm.value.descripcion_prod.trim(),
        marca_prod: this.productoForm.value.marca_prod?.trim() || '',
        unidad_medida: this.productoForm.value.unidad_medida.trim(),
        precio_compra_unitario: Number(this.productoForm.value.precio_compra_unitario),
        precio_venta_unitario: Number(this.productoForm.value.precio_venta_unitario),
        stock_actual: Number(this.productoForm.value.stock_actual),
        id_categoria: this.productoForm.value.id_categoria || '',
        id_proveedor: this.productoForm.value.id_proveedor || '',
        empresa_id: miEmpresaId,
        activo: true
      };

      await addDoc(collection(this.firestore, 'productos_simples'), nuevoProducto);

      this.toastr.success('El producto simple se registró correctamente.', '¡Agregado!', {
        timeOut: 2500,
        progressBar: true
      });

      this.dialogRef.close(true);

    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      this.toastr.error('Ocurrió un error inesperado al procesar el registro.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}