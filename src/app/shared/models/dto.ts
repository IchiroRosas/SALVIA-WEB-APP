export interface Usuario {
  uid?: string; 
  
  apellidos?: string;
  celular?: string;
  dni?: string;
  email?: string;
  nombres?: string;
  distrito?: string;
  
  rol?: 'administrador' | 'limpiador' | 'cliente';
}