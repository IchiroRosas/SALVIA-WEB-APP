import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, doc, getDoc, getDocs, collection, addDoc, query, where } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-main-invitar-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './main-invitar-usuario-form.component.html',
  styleUrl: './main-invitar-usuario-form.component.css'
})

export class MainInvitarUsuarioFormComponent implements OnInit {

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<MainInvitarUsuarioFormComponent>);
  private dialog = inject(MatDialog);
  private firestore = inject(Firestore);
  public data = inject(MAT_DIALOG_DATA);

  invitacionForm!: FormGroup;
  isSubmitting = false;
  empresaId = '';

  ngOnInit(): void {
    this.empresaId = this.data?.empresa_id || '';

    this.invitacionForm = this.fb.group({
      correo_user: ['', [Validators.required, Validators.email]],
      nombre_user: ['', [Validators.required, Validators.minLength(3)]],
      rol: ['empleado', [Validators.required]]
    });
  }

  async procesarInvitacion(): Promise<void> {
    if (this.invitacionForm.invalid) {
      this.invitacionForm.markAllAsTouched();
      return;
    }

    if (!this.empresaId || this.empresaId.trim() === '') {
      Swal.fire('Error de Contexto', 'No se pudo identificar el ID de tu empresa. Por favor, cierra el panel e intenta de nuevo.', 'error');
      return;
    }

    const rolSeleccionado = this.invitacionForm.value.rol.toLowerCase();

    // 1. Validar confirmación mediante SweetAlert2
    const confirmacion = await Swal.fire({
      title: '¿Registrar invitación?',
      text: `Se agregará a ${this.invitacionForm.value.nombre_user} a la lista invitados para activar.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    if (rolSeleccionado === 'administrador') {
      const confirmacionAdmin = await Swal.fire({
        title: '¿Está seguro?',
        text: 'Este nuevo usuario tendrá todos los privilegios del sistema como usted y no podrá ser dado de baja debido a su rol de Administrador. En caso de querer darle de baja contactar a soporte al usuario al +51 999 555 999.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626', // Color rojo/warning para denotar criticidad
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, estoy seguro',
        cancelButtonText: 'Cancelar'
      });

      // Si el usuario se arrepiente en la advertencia, frena el flujo completo
      if (!confirmacionAdmin.isConfirmed) return;
    }

    this.isSubmitting = true;

    try {
      // 2. Operación Cruzada: Buscar RUC de la colección 'empresas' usando su UID
      const empresaDocRef = doc(this.firestore, 'empresas', this.empresaId);
      const empresaSnap = await getDoc(empresaDocRef);

      let rucEstablecido = 'No especificado';
      if (empresaSnap.exists()) {
        rucEstablecido = empresaSnap.data()['ruc'] || 'No especificado';
      }

      const correoIngresado = this.invitacionForm.value.correo_user;

      /* 2.1. SE VERIFICA que el correo no esté ya registrado en la colección lista_blanca y con estado: pendiente
      */
      const listaBlancaRef = collection(this.firestore, 'lista_blanca');
      const qListaBlanca = query(
        listaBlancaRef,
        where('correo_user', '==', correoIngresado),
        where('estado', '==', 'pendiente')
      );

      /* 2.2. SE VERIFICA que en la colección de users no exista un documento con el correo_user ingresado
      */
      const usersRef = collection(this.firestore, 'users');
      const qUsers = query(
        usersRef,
        where('correo_user', '==', correoIngresado)
      );

      // 🚀 Ejecutamos ambas consultas en paralelo para optimizar el rendimiento
      const [snapshotListaBlanca, snapshotUsers] = await Promise.all([
        getDocs(qListaBlanca),
        getDocs(qUsers)
      ]);

      // Si se encuentra un registro en cualquiera de las dos colecciones, bloqueamos el registro
      if (!snapshotListaBlanca.empty || !snapshotUsers.empty) {
        Swal.fire({
          title: 'Correo ya registrado',
          text: 'El correo ingresado ya está registrado como usuario en Salvia o está pendiente de activación.',
          icon: 'error',
          showCancelButton: true,
          cancelButtonColor: '#64748b',
          cancelButtonText: 'Entendido',
          showConfirmButton: false
        });
        return;
      }

      // 3. Escritura en Firestore
      const listaBlancaRef2 = collection(this.firestore, 'lista_blanca');
      await addDoc(listaBlancaRef2, {
        correo_user: this.invitacionForm.value.correo_user,
        empresa_id: this.empresaId,
        estado: 'pendiente',
        nombre_user: this.invitacionForm.value.nombre_user,
        rol: this.invitacionForm.value.rol.toLowerCase(),
        ruc: rucEstablecido
      });

      // 4. Deshacer todas las capas flotantes abiertas (Cierra ambos Modales)
      this.dialog.closeAll();

      // 5. Emitir Toast no intrusivo de éxito
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

      Toast.fire({
        icon: 'success',
        title: 'Invitación emitida correctamente'
      });

    } catch (error) {
      console.error('Error al registrar datos en lista blanca:', error);
      Swal.fire('Error', 'Hubo problemas de comunicación con la base de datos.', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

}
