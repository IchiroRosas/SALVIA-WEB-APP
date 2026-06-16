import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';
import { Auth, createUserWithEmailAndPassword, deleteUser } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs, doc, updateDoc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-activate-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './activate-user.component.html',
  styleUrl: './activate-user.component.css'
})
export class ActivateUserComponent implements OnInit {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  activarForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  metodoRegistro: 'tradicional' | 'google' = 'tradicional';

  ngOnInit(): void {
    this.activarForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  cambiarMetodo(metodo: 'tradicional' | 'google'): void {
    this.metodoRegistro = metodo;
    this.errorMessage = null;

    const correoControl = this.activarForm.get('correo');
    const passwordControl = this.activarForm.get('password');
    const confirmPasswordControl = this.activarForm.get('confirmPassword');

    if (metodo === 'google') {
      correoControl?.clearValidators();
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();

      // Valores temporales para bypass de validación reactiva
      correoControl?.setValue('google@temporal.com');
      passwordControl?.setValue('123456');
      confirmPasswordControl?.setValue('123456');
    } else {
      correoControl?.setValidators([Validators.required, Validators.email]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPasswordControl?.setValidators([Validators.required]);

      correoControl?.setValue('');
      passwordControl?.setValue('');
      confirmPasswordControl?.setValue('');
    }

    correoControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
    this.activarForm.updateValueAndValidity();
  }

  async ejecutarActivacion(): Promise<void> {
    if (this.activarForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    const datosFormulario = this.activarForm.value;

    try {
      // -------------------------------------------------------------------------
      // PASO 0: VALIDACIÓN EN LA COLECCIÓN 'lista_blanca'
      // -------------------------------------------------------------------------
      let correoABuscar = datosFormulario.correo;

      // Si es Google, primero disparamos el popup para conocer el correo real
      let userCredentialGoogle: any = null;
      if (this.metodoRegistro === 'google') {
        userCredentialGoogle = await this.authService.loginConGooglePopup();
        correoABuscar = userCredentialGoogle.user.email ?? '';
      }

      const listaBlancaRef = collection(this.firestore, 'lista_blanca');
      const q = query(
        listaBlancaRef,
        where('correo_user', '==', correoABuscar),
        where('ruc', '==', datosFormulario.ruc),
        where('estado', '==', 'pendiente')
      );

      const querySnapshot = await getDocs(q);

      // 🌟 VALIDACIÓN DE LA INVITACIÓN + MÓDULO DE ROLLBACK
      if (querySnapshot.empty) {
        // Si el usuario usó Google pero no está invitado, lo borramos inmediatamente de Auth
        if (this.metodoRegistro === 'google' && userCredentialGoogle?.user) {
          await deleteUser(userCredentialGoogle.user);
        }

        throw {
          code: 'app/invitation-not-found',
          message: 'No se encontró ninguna invitación pendiente que coincida con el correo y RUC ingresados.'
        };
      }

      // Extraemos los datos del invitado aprobados por el administrador
      const invitacionDoc = querySnapshot.docs[0];
      const datosInvitado = invitacionDoc.data();
      const listaBlancaDocId = invitacionDoc.id;

      let uidAuth = '';
      let correoUser = '';

      // -------------------------------------------------------------------------
      // PASO 1: AUTENTICACIÓN / REGISTRO EN FIREBASE AUTH (SI ES TRADICIONAL)
      // -------------------------------------------------------------------------
      if (this.metodoRegistro === 'tradicional') {
        const userCredential = await createUserWithEmailAndPassword(this.auth, datosFormulario.correo, datosFormulario.password);
        uidAuth = userCredential.user.uid;
        correoUser = datosFormulario.correo;
      } else {
        // Si es Google, tomamos el UID que ya se generó en el Paso 0
        uidAuth = userCredentialGoogle.user.uid;
        correoUser = correoABuscar;
      }

      // -------------------------------------------------------------------------
      // PASO 2: ACTUALIZAR EL ESTADO EN 'lista_blanca' A 'usado'
      // -------------------------------------------------------------------------
      const invitacionDocRef = doc(this.firestore, 'lista_blanca', listaBlancaDocId);
      await updateDoc(invitacionDocRef, { estado: 'usado' });

      // -------------------------------------------------------------------------
      // PASO 3: CREACIÓN DEL DOCUMENTO EN LA COLECCIÓN 'users'
      // -------------------------------------------------------------------------
      const userDocRef = doc(this.firestore, 'users', uidAuth);
      await setDoc(userDocRef, {
        activo: true,
        correo_user: correoUser,
        empresa_id: datosInvitado['empresa_id'],
        nombre_user: datosInvitado['nombre_user'],
        rol: datosInvitado['rol']
      });

      // FIN DEL FLUJO EXITOSO
      this.isLoading = false;
      Swal.fire({
        icon: 'success',
        title: '¡Cuenta Activada!',
        text: `Bienvenido(a) al sistema, ${datosInvitado['nombre_user']}. Ya puedes iniciar sesión.`,
        confirmButtonColor: '#3287bd'
      }).then(() => this.irAlLogin());

    } catch (error: any) {
      this.isLoading = false;
      console.error('Error durante la activación de la cuenta:', error);

      // Control de errores centralizado
      if (error.code === 'app/invitation-not-found') {
        this.errorMessage = error.message;
      } else if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'Este correo electrónico ya se encuentra registrado en el sistema.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Se cerró la ventana de autenticación de Google.';
      } else {
        this.errorMessage = 'Ocurrió un error inesperado al activar la cuenta. Inténtalo de nuevo.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error de activación',
        text: this.errorMessage ?? '',
        confirmButtonColor: '#ff4d4d'
      });
    }
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }
}
