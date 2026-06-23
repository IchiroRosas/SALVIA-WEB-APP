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

export interface SessionStorageInfo {
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

export interface UsuarioRegistroCompletoDto {
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

// *************************************
// INVENTARIO - PRODUCTO COMPUESTO (COMBO)
// *************************************

// Modelo exacto de cómo se almacena en Firestore
export interface ProductoCompuestoDb {
  id?: string;
  activo: boolean;
  descripcion_prod_comp: string;
  empresa_id: string;
  precio_venta_combo: number;
  productos_componentes: {
    producto_simple_id: string;
    cantidad_necesaria: number;
    precio_compra_unitario: number;
  }[];
}

// Estructura de lo que se muestra en la tabla
export interface ProductoCompuestoListadoDto {
  id: string;
  nombre: string;
  precioVentaCombo: number;
}

// *************************************
  // INVENTARIO - PRODUCTO RECURSO 
  // *************************************

  // Modelo exacto de cómo se almacena un Recurso Interno en Firestore
  export interface ProductoRecursoDb {
    id?: string;
    activo: boolean;
    descripcion_prod: string;
    empresa_id: string;
    id_proveedor: string;
    marca_prod: string;
    precio_compra: number;
  }

  // Estructura limpia adaptada para las columnas de la tabla (sin columna Estado)
  export interface ProductoRecursoListadoDto {
    id: string;
    customId: string;
    nombre: string;
    marca: string;
    proveedor: string;
    precioCompra: number;
  }

  // *************************************
// INVENTARIO - PROMOCION
// *************************************


// Estructura tal cual viene de Firestore
export interface ProductoSimpleDoc {
  id: string;
  activo: boolean;
  descripcion_prod: string;
  empresa_id: string;
  marca_prod: string;
  precio_compra_unitario: number;
  precio_venta_unitario: number;
  stock_actual: number;
  unidad_medida: string;
}

export interface PromocionDoc {
  id: string;
  activo: boolean;
  cantidad_necesaria: number;
  descripcion_promo: string;
  empresa_id: string;
  producto_simple_id: string;
  promo_precio_total: number;
  unidad_medida_promocion: string;
}

// DTO definitivo mapeado para renderizar la tabla de forma ágil
export interface PromocionTablaDto {
  id: string;
  descripcionPromo: string;
  productoNombre: string;
  productoMarca: string;
  cantidadNecesaria: number;
  unidadMedidaPromo: string;
  precioTotalPromo: number;
}