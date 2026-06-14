import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, getDocs, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { EmpresaAsociadaDto, UsuarioLogeadoDto, UsuarioRegistroDto } from '../../shared/models/dto';
import { Router } from '@angular/router';
import { collection, query, where } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // 1 - REGISTRO DE EMPRESA
  guardarEmpresa(idEmpresa: string, razonSocial: string, ruc: string): Promise<void> {
    const docRef = doc(this.firestore, 'empresas', idEmpresa);

    const dataEmpresa = {
      activo: true,
      fecha_registro: serverTimestamp(),
      fecha_ultimo_pago: serverTimestamp(),
      nombre_empresa: razonSocial,
      ruc: ruc
    };

    return setDoc(docRef, dataEmpresa);
  }

  // 2 - VERIFICACIÓN DE EMPRESA
  async verificarEmpresaExiste(empresaId: string): Promise<boolean> {
    const docRef = doc(this.firestore, 'empresas', empresaId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  // 3 - REGISTRO TRADICIONAL CON EMAIL Y CONTRASEÑA
  async registrarConEmail(datos: any): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(this.auth, datos.correo, datos.password);
    const uidAuth = userCredential.user.uid;

    await this.guardarUsuarioEnFirestore(
      uidAuth,
      {
        nombre: datos.nombreCompleto,
        correo: datos.correo,
        empresaId: datos.uid,
        rol: datos.rol
      }
    );
  }

  // 4 - REGISTRO CON GOOGLE
  async registrarConGoogle(datosFormulario: any): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(this.auth, provider);
    const uidAuth = userCredential.user.uid;
    const correoGoogle = userCredential.user.email ?? '';

    const yaExisteEnEmpresa = await this.comprobarUsuarioRegistrado(correoGoogle, datosFormulario.uid);
    if (yaExisteEnEmpresa) {
      throw { code: 'auth/user-already-registered' };
    }

    await this.guardarUsuarioEnFirestore(uidAuth, {
      nombre: datosFormulario.nombreCompleto,
      correo: correoGoogle,
      empresaId: datosFormulario.uid,
      rol: datosFormulario.rol
    });
  }

  // 5 - REGISTRO DE USUARIO EN FIRESTORE
  private async guardarUsuarioEnFirestore(uid: string, info: { nombre: string, correo: string, empresaId: string, rol: string }): Promise<void> {
    const docRef = doc(this.firestore, 'users', uid);

    const dataUsuario: UsuarioRegistroDto = {
      activo: true,
      nombre_user: info.nombre,
      correo_user: info.correo,
      empresa_id: info.empresaId,
      rol: info.rol.toLowerCase()
    };

    return setDoc(docRef, dataUsuario);
  }

  // 6 - LOGIN TRADICIONAL CON EMAIL Y CONTRASEÑA
  loginConEmail(correo: string, password: string) {
    return signInWithEmailAndPassword(this.auth, correo, password);
  }

  // 7 - LOGIN CON GOOGLE
  loginConGooglePopup() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(this.auth, provider);
  }

  // 8 - OBTENER USUARIO POR SU UID
  async obtenerPerfilUsuario(uid: string): Promise<UsuarioLogeadoDto | null> {
    const docRef = doc(this.firestore, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UsuarioLogeadoDto) : null;
  }

  // 9 - OBTENER EMPRESA POR SU UID
  async obtenerDatosEmpresaAsociada(empresaId: string): Promise<EmpresaAsociadaDto | null> {
    const docRef = doc(this.firestore, 'empresas', empresaId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as EmpresaAsociadaDto) : null;
  }

  // 10 - CERRAR SESIÓN
  async cerrarSesion(): Promise<void> {
    sessionStorage.clear();
    this.router.navigate(['/login']);
    return signOut(this.auth);
  }

  // 11 - DESACTIVA UNA EMPRESA - SE USARÁ PARA CUANDO UNA SUSCRIPCIÓN ESTÉ VENCIDA (>30 DIAS DESDE ULTIMO PAGO)
  async desactivarEmpresa(empresaId: string): Promise<void> {
    const docRef = doc(this.firestore, 'empresas', empresaId);
    // updateDoc solo modifica el campo seleccionado sin borrar el resto del documento
    return updateDoc(docRef, { activo: false });
  }

  // 12 - REACTIVAR UNA CUENTA DE EMPRESA - SE USARÁ PARA CUANDO UNA SUSCRIPCIÓN VUELVA A ESTAR VIGENTE
  async reactivarEmpresa(empresaId: string): Promise<void> {
    const docRef = doc(this.firestore, 'empresas', empresaId);
    return updateDoc(docRef, { activo: true, fecha_ultimo_pago: serverTimestamp() });
  }

  // 13 - COMPROBAR SI UN USUARIO YA ESTA REGISTRADO EN SALVIA POR SU CORREO
  async comprobarUsuarioRegistrado(correo: string, empresaId: string): Promise<boolean> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(
      usersRef,
      where('correo_user', '==', correo),
      where('empresa_id', '==', empresaId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

}