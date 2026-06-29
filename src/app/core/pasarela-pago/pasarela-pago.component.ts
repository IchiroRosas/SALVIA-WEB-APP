import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-pasarela-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pasarela-pago.component.html',
  styleUrls: ['./pasarela-pago.component.css']
})
export class PasarelaPagoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  pagoForm!: FormGroup;
  isPaying = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.pagoForm = this.fb.group({
      nombreTitular: ['', [Validators.required, Validators.minLength(4)]],
      numeroTarjeta: ['', [Validators.required, Validators.pattern('^[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}$')]],
      expiracion: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\/[0-9]{2}$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
  }

  async procesarPago(): Promise<void> {
    if (this.pagoForm.invalid) return;

    this.isPaying = true;

    // Simulamos la espera de la pasarela bancaria
    await new Promise(resolve => setTimeout(resolve, 2500));

    const state = history.state;
    const origin = state?.origin;

    try {
      if (origin === 'sub-expirada') {
        // 🌟 Ejecuta la reactivación directamente desde aquí
        await this.ejecutarLogicaReactivacion();
      } else if (origin === 'registro-empresa') {
        // 🌟 Ejecuta el registro compuesto directamente desde aquí
        await this.finalizarRegistroEnFirebase(state.formData, state.metodoRegistro);
      } else {
        this.isPaying = false;
        this.router.navigate(['/login']);
      }
    } catch (error) {
      this.isPaying = false;
    }
  }

  cancelar(): void {
    const state = history.state;
    const returnUrl = state.returnUrl || '/login';
    
    // Si cancela, regresa notificando el fallo para que el componente previo restaure su estado
    this.router.navigate([returnUrl], { state: { ...state, pagoExitoso: false } });
  }

  // 🌟 LÓGICA DE RENOVACIÓN DE SUSCRIPCIÓN TRASLADADA
  private async ejecutarLogicaReactivacion(): Promise<void> {
    try {
      const rucEmpresa = sessionStorage.getItem('empresa_ruc');
      const nombreEmpresa = sessionStorage.getItem('nombre_empresa') || 'Empresa';
      let empresaId = rucEmpresa ? await this.authService.obtenerIdEmpresaPorRuc(rucEmpresa) : null;

      if (!empresaId) {
        console.warn('RUC no encontrado en sesión. Iniciando plan de rescate desde Firebase Auth...');
        const uidAuth = this.auth.currentUser?.uid;

        if (uidAuth) {
          const userDocRef = doc(this.firestore, 'users', uidAuth);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            empresaId = userDocSnap.data()['empresa_id'] || null;
            console.log('¡Plan de rescate exitoso! Empresa ID recuperado de Firestore:', empresaId);
          }
        }
      }

      if (!empresaId) {
        throw new Error('No se encontró el identificador de la empresa en la sesión ni en el perfil de Firestore.');
      }

      await this.authService.reactivarEmpresa(empresaId);
      console.log(`Empresa ${empresaId} - "${nombreEmpresa}" reactivada exitosamente.`);

      this.isPaying = false;

      // Mostramos el Swal de éxito INMEDIATAMENTE en la pasarela
      Swal.fire({
        icon: 'success',
        title: '¡Suscripción Renovada!',
        text: 'Tu pago fue procesado. El acceso a Salvia ha sido restablecido.',
        confirmButtonColor: '#3287bd'
      }).then(() => {
        sessionStorage.clear(); 
        this.router.navigate(['/login']);
      });

    } catch (error) {
      this.isPaying = false;
      console.error('Error al procesar la renovación en la base de datos:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error de activación',
        text: 'El pago se procesó, pero ocurrió un problema al activar tu suscripción en el sistema. Por favor, contacta a soporte.',
        confirmButtonColor: '#ef4444'
      });
      throw error;
    }
  }

  // 🌟 LÓGICA DE REGISTRO COMPUESTO TRASLADADA
  private async finalizarRegistroEnFirebase(datosFormulario: any, metodoRegistro: 'tradicional' | 'google'): Promise<void> {
    let uidAuth = '';
    let correoUser = '';

    try {
      // PASO 1: FIREBASE AUTH
      if (metodoRegistro === 'tradicional') {
        const userCredential = await createUserWithEmailAndPassword(this.auth, datosFormulario.correo, datosFormulario.password);
        uidAuth = userCredential.user.uid;
        correoUser = datosFormulario.correo;
      } else {
        const userCredential = await this.authService.loginConGooglePopup();
        uidAuth = userCredential.user.uid;
        correoUser = userCredential.user.email ?? '';

        const perfilExistente = await this.authService.obtenerPerfilUsuario(uidAuth);
        if (perfilExistente) {
          throw { code: 'auth/email-used-in-other-company' };
        }
      }

      // PASO 2: CREACIÓN DE LA EMPRESA
      const empresasRef = collection(this.firestore, 'empresas');
      const nuevaEmpresaDoc = await addDoc(empresasRef, {
        activo: true,
        fecha_registro: serverTimestamp(),
        fecha_ultimo_pago: serverTimestamp(),
        nombre_empresa: datosFormulario.razonSocial,
        ruc: datosFormulario.ruc,
        usuario_creador_id: uidAuth
      });

      const idEmpresaGenerado = nuevaEmpresaDoc.id;

      // PASO 3: PERFIL DE USUARIO
      const userDocRef = doc(this.firestore, 'users', uidAuth);
      await setDoc(userDocRef, {
        activo: true,
        correo_user: correoUser,
        empresa_id: idEmpresaGenerado,
        nombre_user: datosFormulario.nombreCompleto,
        rol: 'administrador'
      });

      // PASO 4: CATEGORÍAS POR DEFECTO
      const categoriasPredeterminadas = [
        'Abarrotes básicos',
        'Confitería y Snacks',
        'Frescos',
        'Bebidas',
        'Comidas envasadas listas'
      ];

      const categoriasRef = collection(this.firestore, 'categorias');
      const promesasCategorias = categoriasPredeterminadas.map(nombreCat =>
        addDoc(categoriasRef, {
          activo: true,
          empresa_id: idEmpresaGenerado,
          nombre_categoria: nombreCat
        })
      );

      await Promise.all(promesasCategorias);

      this.isPaying = false;
      
      // Mostramos el Swal de éxito INMEDIATAMENTE en la pasarela
      Swal.fire({
        icon: 'success',
        title: '¡Registro Exitoso!',
        text: 'La empresa y su cuenta administradora han sido dadas de alta.',
        confirmButtonColor: '#3287bd'
      }).then(() => {
        this.router.navigate(['/login']);
      });

    } catch (error: any) {
      this.isPaying = false;
      this.manejarErroresCentralizados(error);
      throw error;
    }
  }

  private manejarErroresCentralizados(error: any): void {
    console.error('Error durante el proceso de registro compuesto:', error);

    if (error.code === 'auth/user-already-registered') {
      this.errorMessage = 'Este correo electrónico ya se encuentra registrado y activo en esta empresa.';
    } else if (error.code === 'auth/email-used-in-other-company') {
      this.errorMessage = 'Esta cuenta ya está vinculada a otra empresa en Salvia. Por favor, utilice un correo diferente para esta empresa.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      this.errorMessage = 'Se cerró la ventana de autenticación de Google.';
    } else if (error.code === 'auth/weak-password') {
      this.errorMessage = 'La contraseña es demasiado débil. Debe contener al menos 6 caracteres.';
    } else if (error.code === 'auth/email-already-in-use') {
      this.errorMessage = 'Ya existe un usuario con ese correo electrónico en el sistema de SALVIA.';
    } else if (error.code === 'app/ruc-already-exists') {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = 'Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.';
    }

    Swal.fire({
      icon: 'error',
      title: 'Error de registro',
      text: this.errorMessage ?? '',
      confirmButtonColor: '#ff4d4d'
    });
  }

  formatearNumeroTarjeta(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    valor = valor.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.pagoForm.controls['numeroTarjeta'].setValue(valor, { emitEvent: false });
  }

  formatearExpiracion(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 2) {
      valor = valor.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
    }
    this.pagoForm.controls['expiracion'].setValue(valor, { emitEvent: false });
  }
}