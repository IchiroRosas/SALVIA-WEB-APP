// *************************************
// MÓDULO DE AUTENTICACIÓN Y SEGURIDAD
// *************************************

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


// *************************************
// INVENTARIO - PRODUCTO SIMPLE
// *************************************

// Modelo exacto de cómo se almacena en Firestore
export interface ProductoSimpleDb {
  id?: string;
  activo: boolean;
  descripcion_prod: string;
  empresa_id: string;
  id_categoria: string;
  id_proveedor: string;
  marca_prod: string;
  precio_compra_unitario: number;
  precio_venta_unitario: number;
  stock_actual: number;
  unidad_medida: string;
}

// Estructura limpia adaptada para las columnas de la tabla (DTO)
export interface ProductoSimpleListadoDto {
  id: string;
  nombre: string;
  categoria: string;
  marca: string;
  stock: number;
  unidadMedida: string;
  precioVenta: number;
  precioCompra: number;
}

// Modelo exacto de cómo se almacena en Firestore
export interface ProductoCompuestoDb {
  activo: boolean;
  descripcion_prod_comp: string;
  empresa_id: string;
  precio_venta_combo: number;
  productos_componentes:{
    cantidad_necesaria: number;
    producto_simple_id: string;
  }[];
}   

export interface ProductoCompuestoListadoDto {
  id: string;
  nombre: string;
  precioVentaCombo: number;
  componentes: {
    nombreProductoSimple: string;
    cantidadNecesaria: number;
  }[];
}