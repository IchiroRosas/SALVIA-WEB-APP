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
}

export interface SessionStorageInfo{
  nombre_user: string;
  correo_user: string;
  empresa_ruc: string;
  nombre_empresa: string;
  rol: string;
}

export interface EmpresaAsociadaDto {
  activo: boolean;
  fecha_registro: Date;
  fecha_ultimo_pago: Date;
  nombre_empresa: string;
  ruc: string;
}

export interface UsuarioRegistroCompletoDto{
  ruc: string;
  empresaUidReal: string;
  nombreCompleto: string;
  rol: string;
  correo: string;
  password: string;
}

export interface UsuarioListadoDto {
  uid: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export interface ProductoSimpleListadoDto {
  id: string;
  customId: string;
  nombre: string;
  categoria: string;
  stock: number;
  precio: number;
}