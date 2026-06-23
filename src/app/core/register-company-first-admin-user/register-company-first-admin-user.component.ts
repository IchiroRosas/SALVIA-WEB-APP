import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, collection, doc, addDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PasarelaPagoComponent } from '../pasarela-pago/pasarela-pago.component'; // <- Ajusta esta ruta si es necesario
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register-company-first-admin-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './register-company-first-admin-user.component.html',
  styleUrl: './register-company-first-admin-user.component.css'
})
export class RegisterCompanyFirstAdminUserComponent {

  private fb = inject(FormBuilder);
  router = inject(Router);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private dialog = inject(MatDialog);

  empleadoForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  metodoRegistro: 'tradicional' | 'google' = 'tradicional';

  ngOnInit(): void {
    this.empleadoForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      razonSocial: ['', [Validators.required, Validators.minLength(3)]],
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
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

    const correoControl = this.empleadoForm.get('correo');
    const passwordControl = this.empleadoForm.get('password');
    const confirmPasswordControl = this.empleadoForm.get('confirmPassword');

    if (metodo === 'google') {
      correoControl?.clearValidators();
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();

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
    this.empleadoForm.updateValueAndValidity();
  }

  async ejecutarRegistro(): Promise<void> {
    if (this.empleadoForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    const datosFormulario = this.empleadoForm.value;

    try {
      // -------------------------------------------------------------------------
      // PASO 0: VERIFICACIÓN PREVIA DEL RUC (Para evitar crear usuarios huérfanos)
      // -------------------------------------------------------------------------
      const rucExistenteId = await this.authService.obtenerIdEmpresaPorRuc(datosFormulario.ruc);
      if (rucExistenteId) {
        throw {
          code: 'app/ruc-already-exists',
          message: 'Ya existe una empresa registrada con ese RUC en el sistema de SALVIA.'
        };
      }

      // -------------------------------------------------------------------------
      // PASO INTERMEDIO: PASARELA DE PAGO SIMULADA
      // -------------------------------------------------------------------------
      // Apagamos el loading principal para que no bloquee visualmente el modal de pago
      this.isLoading = false;

      const dialogRef = this.dialog.open(PasarelaPagoComponent, {
        width: '400px',
        disableClose: true
      });

      // Convertimos el afterClosed (Observable) a Promesa para mantener el flujo async/await
      const pagoExitoso = await firstValueFrom(dialogRef.afterClosed());

      if (!pagoExitoso) {
        // Si el usuario canceló el pago en el modal, detenemos la ejecución de manera silenciosa
        return;
      }

      // Si el pago fue exitoso, reactivamos el spinner y continuamos con Firebase
      this.isLoading = true;

      let uidAuth = '';
      let correoUser = '';

      // -------------------------------------------------------------------------
      // PASO 1: REGISTRO / AUTENTICACIÓN EN FIREBASE AUTH
      // -------------------------------------------------------------------------
      if (this.metodoRegistro === 'tradicional') {
        // Registro nativo por Email y Contraseña
        const userCredential = await createUserWithEmailAndPassword(this.auth, datosFormulario.correo, datosFormulario.password);
        uidAuth = userCredential.user.uid;
        correoUser = datosFormulario.correo;
      } else {
        // Autenticación por Google Popup externa
        const userCredential = await this.authService.loginConGooglePopup();
        uidAuth = userCredential.user.uid;
        correoUser = userCredential.user.email ?? '';

        // Resguardo de seguridad para Google: Validar que no pertenezca a otra empresa
        const perfilExistente = await this.authService.obtenerPerfilUsuario(uidAuth);
        if (perfilExistente) {
          throw { code: 'auth/email-used-in-other-company' };
        }
      }

      // -------------------------------------------------------------------------
      // PASO 2: CREACIÓN DE LA EMPRESA EN FIRESTORE (Amarre de usuario_creador_id)
      // -------------------------------------------------------------------------
      const empresasRef = collection(this.firestore, 'empresas');
      const nuevaEmpresaDoc = await addDoc(empresasRef, {
        activo: true,
        fecha_registro: serverTimestamp(),
        fecha_ultimo_pago: serverTimestamp(),
        nombre_empresa: datosFormulario.razonSocial,
        ruc: datosFormulario.ruc,
        usuario_creador_id: uidAuth // Asignación del UID generado en el Paso 1
      });

      const idEmpresaGenerado = nuevaEmpresaDoc.id;

      // -------------------------------------------------------------------------
      // PASO 3: CREACIÓN DEL PERFIL DE USUARIO EN LA COLECCIÓN 'users'
      // -------------------------------------------------------------------------
      const userDocRef = doc(this.firestore, 'users', uidAuth);
      await setDoc(userDocRef, {
        activo: true,
        correo_user: correoUser,
        empresa_id: idEmpresaGenerado, // Amarre con el ID generado en el Paso 2
        nombre_user: datosFormulario.nombreCompleto,  // Fallback descriptivo debido al nuevo alcance del formulario
        rol: 'administrador'
      });

      // -------------------------------------------------------------------------
      // 🌟 PASO 4: CREACIÓN DE CATEGORÍAS POR DEFECTO (NUEVO ALCANCE)
      // -------------------------------------------------------------------------
      const categoriasPredeterminadas = [
        'Abarrotes básicos',
        'Confitería y Snacks',
        'Frescos',
        'Bebidas',
        'Comidas envasadas listas'
      ];

      const categoriasRef = collection(this.firestore, 'categorias');

      // Mapeamos los textos a un arreglo de promesas addDoc ejecutándose en paralelo
      const promesasCategorias = categoriasPredeterminadas.map(nombreCat =>
        addDoc(categoriasRef, {
          activo: true,
          empresa_id: idEmpresaGenerado,
          nombre_categoria: nombreCat
        })
      );

      // Esperamos a que las 5 inserciones en Firestore terminen correctamente
      await Promise.all(promesasCategorias);

      // FIN DEL FLUJO EXITOSO
      this.isLoading = false;
      Swal.fire({
        icon: 'success',
        title: '¡Registro Exitoso!',
        text: 'La empresa y su cuenta administradora han sido dadas de alta.',
        confirmButtonColor: '#3287bd'
      }).then(() => this.volver());

    } catch (error: any) {
      this.isLoading = false;
      console.error('Error durante el proceso de registro compuesto:', error);

      // -------------------------------------------------------------------------
      // CONTROL CENTRALIZADO DE ERRORES (Traducción de códigos de estado)
      // -------------------------------------------------------------------------
      if (error.code === 'auth/user-already-registered') {
        this.errorMessage = 'Este correo electrónico ya se encuentra registrado y activo en esta empresa.';
      }
      else if (error.code === 'auth/email-used-in-other-company') {
        this.errorMessage = 'Esta cuenta ya está vinculada a otra empresa en Salvia. Por favor, utilice un correo diferente para esta empresa.';
      }
      else if (error.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Se cerró la ventana de autenticación de Google.';
      }
      else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'La contraseña es demasiado débil. Debe contener al menos 6 caracteres.';
      }
      else if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'Ya existe un usuario con ese correo electrónico en el sistema de SALVIA.';
      }
      else if (error.code === 'app/ruc-already-exists') {
        this.errorMessage = error.message;
      }
      else {
        this.errorMessage = 'Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error de registro',
        text: this.errorMessage ?? '',
        confirmButtonColor: '#ff4d4d'
      });
    }
  }
  volver(): void {
    this.router.navigate(['/login']);
  }

}
