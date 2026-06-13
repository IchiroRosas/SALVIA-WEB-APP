export interface EmpresaRegistroDto {
  activo: boolean;
  fecha_registro: Date;
  fecha_ultimo_pago: Date;
  nombre_empresa: string;
  ruc: string;
}

export interface UsuarioRegistroDto {
  activo: boolean;
  nombre_user: string;
  correo_user: string;
  empresa_id: string;
  rol: string;
}

export interface UsuarioLogeadoDto {
  user_uid: string;
  nombre_user: string;
  correo_user: string;
  rol: string;
  activo: boolean;
  empresa_id: string;
  nombre_empresa: string;
}

export interface SessionStorageInfo{
  nombre_user: string;
  correo_user: string;
  nombre_empresa: string;
  rol: string;
  activo: string;
}