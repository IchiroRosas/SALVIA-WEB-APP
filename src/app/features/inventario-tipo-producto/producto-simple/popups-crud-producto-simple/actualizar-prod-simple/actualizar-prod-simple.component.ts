import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Firestore, collection, getDocs, query, where, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-actualizar-prod-simple',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule],
  templateUrl: './actualizar-prod-simple.component.html',
  styleUrl: './actualizar-prod-simple.component.css'
})
export class ActualizarProdSimpleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<ActualizarProdSimpleComponent>);
  private toastr = inject(ToastrService);
  private data = inject(MAT_DIALOG_DATA);

  idProducto!: string;
  productoForm!: FormGroup;
  isSubmitting = false;
  isLoading = true;
  listaCategorias: any[] = [];
  listaProveedores: any[] = [];
  buscarCategoria = '';
  buscarProveedor = '';
  showCatDropdown = false;
  showProvDropdown = false;

  ngOnInit(): void {
    this.idProducto = this.data.idProducto;

    // Inicialización de la estructura del formulario reactivo
    this.productoForm = this.fb.group({
      descripcion_prod: ['', [Validators.required, Validators.minLength(2)]],
      marca_prod: [''],
      unidad_medida: ['', [Validators.required]],
      precio_compra_unitario: [0, [Validators.required, Validators.min(0)]],
      precio_venta_unitario: [0, [Validators.required, Validators.min(0)]],
      stock_actual: [0, [Validators.required, Validators.min(0)]],
      id_categoria: [''],
      id_proveedor: ['']
    }, {
      validators: this.validarPrecios
    });

    this.inicializarDatos();
  }

  validarPrecios(group: AbstractControl): ValidationErrors | null {
    const compra = group.get('precio_compra_unitario')?.value;
    const venta = group.get('precio_venta_unitario')?.value;
    const ventaControl = group.get('precio_venta_unitario');

    if (compra !== null && venta !== null && Number(venta) < Number(compra)) {
      // Setea el error en el control individual para pintar el borde rojo
      ventaControl?.setErrors({ ...ventaControl.errors, ventaMenor: true });
      return { ventaMenor: true };
    } else {
      // Limpia el error personalizado sin pisar otros validadores activos
      if (ventaControl?.hasError('ventaMenor')) {
        const errors = { ...ventaControl.errors };
        delete errors['ventaMenor'];
        ventaControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  }

  async inicializarDatos(): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      // 1. Conseguir empresa_id del usuario
      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return;
      const miEmpresaId = userSnap.data()['empresa_id'];

      // 2. Traer listas maestras de la empresa (Categorías y Proveedores activos)
      const catQuery = query(collection(this.firestore, 'categorias'), where('empresa_id', '==', miEmpresaId), where('activo', '==', true));
      const catSnap = await getDocs(catQuery);
      this.listaCategorias = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const provQuery = query(collection(this.firestore, 'proveedores'), where('empresa_id', '==', miEmpresaId), where('activo', '==', true));
      const provSnap = await getDocs(provQuery);
      this.listaProveedores = provSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Recuperar el documento del producto actual desde Firestore
      const prodDocRef = doc(this.firestore, 'productos_simples', this.idProducto);
      const prodSnap = await getDoc(prodDocRef);

      if (prodSnap.exists()) {
        const prodData = prodSnap.data();

        // Rellenamos el Formulario Reactivo
        this.productoForm.patchValue({
          descripcion_prod: prodData['descripcion_prod'],
          marca_prod: prodData['marca_prod'] || '',
          unidad_medida: prodData['unidad_medida'],
          precio_compra_unitario: prodData['precio_compra_unitario'] ?? 0,
          precio_venta_unitario: prodData['precio_venta_unitario'] ?? 0,
          stock_actual: prodData['stock_actual'] ?? 0,
          id_categoria: prodData['id_categoria'] || '',
          id_proveedor: prodData['id_proveedor'] || ''
        });

        // Resolvemos las cadenas de texto correspondientes para que los inputs muestren el nombre y no el UID vacío
        const catAsignada = this.listaCategorias.find(c => c.id === prodData['id_categoria']);
        if (catAsignada) this.buscarCategoria = catAsignada.nombre_categoria;

        const provAsignado = this.listaProveedores.find(p => p.id === prodData['id_proveedor']);
        if (provAsignado) this.buscarProveedor = provAsignado.nombre_proveedor;
      } else {
        this.toastr.error('El producto solicitado no existe.', 'Error');
        this.dialogRef.close();
      }

    } catch (error) {
      console.error('Error al precargar la información:', error);
      this.toastr.error('Error al consultar los registros del producto.', 'Error');
    } finally {
      this.isLoading = false;
    }
  }

  // Filtrado reactivo en tiempo real
  get categoriasFiltradas(): any[] {
    if (!this.buscarCategoria.trim()) return this.listaCategorias;
    return this.listaCategorias.filter(c =>
      c.nombre_categoria.toLowerCase().includes(this.buscarCategoria.toLowerCase())
    );
  }

  get proveedoresFiltrados(): any[] {
    if (!this.buscarProveedor.trim()) return this.listaProveedores;
    return this.listaProveedores.filter(p =>
      p.nombre_proveedor.toLowerCase().includes(this.buscarProveedor.toLowerCase())
    );
  }

  seleccionarCategoria(cat: any): void {
    this.buscarCategoria = cat.nombre_categoria;
    this.productoForm.patchValue({ id_categoria: cat.id });
    this.showCatDropdown = false;
  }

  seleccionarProveedor(prov: any): void {
    this.buscarProveedor = prov.nombre_proveedor;
    this.productoForm.patchValue({ id_proveedor: prov.id });
    this.showProvDropdown = false;
  }

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

  async actualizar(): Promise<void> {
    if (this.productoForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const prodDocRef = doc(this.firestore, 'productos_simples', this.idProducto);

      // Mapeamos los datos modificados respetando los formatos numéricos
      const cambiosProducto = {
        descripcion_prod: this.productoForm.value.descripcion_prod.trim(),
        marca_prod: this.productoForm.value.marca_prod?.trim() || '',
        unidad_medida: this.productoForm.value.unidad_medida.trim(),
        precio_compra_unitario: Number(this.productoForm.value.precio_compra_unitario),
        precio_venta_unitario: Number(this.productoForm.value.precio_venta_unitario),
        stock_actual: Number(this.productoForm.value.stock_actual),
        id_categoria: this.productoForm.value.id_categoria || '',
        id_proveedor: this.productoForm.value.id_proveedor || ''
      };

      // 🌟 Actualizamos en Firestore mediante updateDoc
      await updateDoc(prodDocRef, cambiosProducto);

      this.toastr.success('El producto se actualizó con éxito.', '¡Modificado!', {
        timeOut: 2500,
        progressBar: true
      });

      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      this.toastr.error('No se pudieron salvar los cambios en la base de datos.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}