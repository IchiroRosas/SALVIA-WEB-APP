import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where, doc, updateDoc, addDoc, docData, getDocs } from '@angular/fire/firestore';
import { Observable, combineLatest, switchMap, of, from } from 'rxjs';
import { ProductoCompuestoDb, ProductoSimpleDb, ProductoSimpleDoc, PromocionDoc, PromocionTablaDto, PromocionTablaPromDto } from '../../shared/models/dto';
import { map } from 'rxjs/operators';
import { getDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {

  private firestore = inject(Firestore);

  /**
   * Verifica si un producto simple está asignado a algún producto compuesto o promoción activa
   */
  async verificarDependenciasProductoSimple(productoId: string, empresaId: string): Promise<{ compuestos: string[], promociones: string[] }> {
    const dependencias = {
      compuestos: [] as string[],
      promociones: [] as string[]
    };

    // 1. Validar en la colección 'prod_compuesto' (solo los activos)
    const compQuery = query(
      collection(this.firestore, 'prod_compuesto'),
      where('empresa_id', '==', empresaId),
      where('activo', '==', true)
    );
    const compSnapshot = await getDocs(compQuery);

    compSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const componentes = data['productos_componentes'] || [];
      // Validamos si el UID buscado existe dentro del array de componentes
      const existeEnCombo = componentes.some((c: any) => c.producto_simple_id === productoId);

      if (existeEnCombo && data['descripcion_prod_comp']) {
        dependencias.compuestos.push(data['descripcion_prod_comp']);
      }
    });

    // 2. Validar en la colección 'promociones' (solo las activas)
    const promoQuery = query(
      collection(this.firestore, 'promociones'),
      where('empresa_id', '==', empresaId),
      where('activo', '==', true)
    );
    const promoSnapshot = await getDocs(promoQuery);

    promoSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data['producto_simple_id'] === productoId && data['descripcion_promo']) {
        dependencias.promociones.push(data['descripcion_promo']);
      }
    });

    return dependencias;
  }

  /**
     * Obtiene el flujo reactivo de productos compuestos activos filtrados por empresa
     */
  obtenerProductosCompuestos(empresaId: string): Observable<ProductoCompuestoDb[]> {
    const prodsCompQuery = query(
      collection(this.firestore, 'prod_compuesto'),
      where('empresa_id', '==', empresaId),
      where('activo', '==', true)
    );
    return collectionData(prodsCompQuery, { idField: 'id' }) as Observable<ProductoCompuestoDb[]>;
  }

  /**
   * Realiza el borrado lógico de un producto compuesto (combo)
   */
  eliminarProductoCompuesto(id: string): Promise<void> {
    const prodDocRef = doc(this.firestore, 'prod_compuesto', id);
    return updateDoc(prodDocRef, { activo: false });
  }

  /**
   * Obtiene todos los productos simples activos de la empresa para los autocompletados
   */
  obtenerProductosSimplesActivos(empresaId: string): Observable<ProductoSimpleDb[]> {
    const prodsQuery = query(
      collection(this.firestore, 'productos_simples'),
      where('empresa_id', '==', empresaId),
      where('activo', '==', true)
    );
    return collectionData(prodsQuery, { idField: 'id' }) as Observable<ProductoSimpleDb[]>;
  }

  obtenerProductoCompuestoPorId(id: string): Observable<ProductoCompuestoDb> {
    const prodDocRef = doc(this.firestore, 'prod_compuesto', id);
    return docData(prodDocRef, { idField: 'id' }) as Observable<ProductoCompuestoDb>;
  }

  /**
   * Inserta un nuevo producto compuesto (combo) en la colección 'prod_compuesto'
   */
  crearProductoCompuesto(producto: ProductoCompuestoDb): Promise<any> {
    const colRef = collection(this.firestore, 'prod_compuesto');
    return addDoc(colRef, producto);
  }

  actualizarProductoCompuesto(id: string, producto: Partial<ProductoCompuestoDb>): Promise<void> {
    const prodDocRef = doc(this.firestore, 'prod_compuesto', id);
    return updateDoc(prodDocRef, producto);
  }

  /**
 * Obtiene un producto simple por su UID en tiempo real
 */
  obtenerProductoSimplePorId(id: string): Observable<any> {
    const prodDocRef = doc(this.firestore, 'productos_simples', id);
    return docData(prodDocRef, { idField: 'id' });
  }


  obtenerPromocionesMapeadas(empresaId: string): Observable<PromocionTablaPromDto[]> {
    const promoRef = collection(this.firestore, 'promociones');
    const promoQuery = query(
      promoRef,
      where('empresa_id', '==', empresaId),
      where('activo', '==', true)
    );
    const promociones$ = collectionData(promoQuery, { idField: 'id' }) as Observable<PromocionDoc[]>;

    const prodRef = collection(this.firestore, 'productos_simples');
    const prodQuery = query(prodRef, where('empresa_id', '==', empresaId));
    const productos$ = collectionData(prodQuery, { idField: 'id' }) as Observable<ProductoSimpleDoc[]>;

    return combineLatest([promociones$, productos$]).pipe(
      map(([promociones, productos]) => {
        const productosMap = new Map<string, ProductoSimpleDoc>();

        productos.forEach(p => {
          if (p.id) {
            productosMap.set(p.id, p);
          }
        });

        return promociones.map(promo => {
          const productoAsociado = productosMap.get(promo.producto_simple_id);

          return {
            id: promo.id || '',
            descripcionPromo: promo.descripcion_promo,
            productoNombre: productoAsociado ? productoAsociado.descripcion_prod : 'Producto no encontrado',
            productoMarca: productoAsociado ? productoAsociado.marca_prod : 'N/A',
            cantidadNecesaria: promo.cantidad_necesaria,
            unidadMedidaProducto: productoAsociado ? productoAsociado.unidad_medida : 'N/A',
            unidadMedidaPromo: promo.unidad_medida_promocion,
            precioTotalPromo: promo.promo_precio_total
          };
        });
      })
    );
  }

  obtenerDetallePromocionCompleto(promoId: string): Observable<any> {
    const promoDocRef = doc(this.firestore, `promociones/${promoId}`);
    const promo$ = docData(promoDocRef, { idField: 'id' }) as Observable<any>;

    const prodRef = collection(this.firestore, 'productos_simples');
    const productos$ = collectionData(prodRef, { idField: 'id' }) as Observable<any[]>;

    const provRef = collection(this.firestore, 'proveedores');
    const proveedores$ = collectionData(provRef, { idField: 'id' }) as Observable<any[]>;

    return combineLatest([promo$, productos$, proveedores$]).pipe(
      map(([promo, productos, proveedores]) => {
        if (!promo) return null;

        // 1. Buscamos el producto asociado a la promoción
        const producto = productos.find(p => p.id === promo.producto_simple_id);
        let proveedorTxt = 'Sin proveedor';

        // 2. Si el producto existe y tiene un id_proveedor, buscamos su nombre real
        if (producto && producto.id_proveedor) {
          const prov = proveedores.find(p => p.id === producto.id_proveedor);
          if (prov) {
            proveedorTxt = prov.nombre_proveedor; // Campo exacto de tu colección de proveedores
          }
        }

        return {
          promo,
          producto: producto ? {
            ...producto,
            nombre_proveedor: proveedorTxt // Lo inyectamos directamente aquí
          } : null
        };
      })
    );
  }

  obtenerPromocionPorId(promoId: string): Observable<any> {
    const docRef = doc(this.firestore, 'promociones', promoId);
    return from(getDoc(docRef).then(snapshot => {
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    }));
  }

  /**
   * Modifica los campos editables de una promoción existente
   */
  actualizarPromocion(promoId: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, 'promociones', promoId);
    return updateDoc(docRef, data);
  }

  /**
   * Guarda una nueva promoción comercial en Firestore
   */
  crearPromocion(promocion: Omit<PromocionDoc, 'id'>): Promise<any> {
    const colRef = collection(this.firestore, 'promociones');
    return addDoc(colRef, promocion);
  }

  eliminarPromocion(promoId: string): Promise<void> {
    const recursoDocRef = doc(this.firestore, 'promociones', promoId);
    return updateDoc(recursoDocRef, { activo: false });

  }

  /**
   * Obtiene el flujo reactivo de productos recurso (recursos internos) activos filtrados por empresa
   */
  obtenerProductosRecursoActivos(empresaId: string): Observable<any[]> {
    const recursosQuery = query(
      collection(this.firestore, 'producto_recurso'),
      where('empresa_id', '==', empresaId),
      where('activo', '==', true)
    );
    return collectionData(recursosQuery, { idField: 'id' });
  }

  /**
   * Realiza el borrado lógico de un producto recurso (recurso interno)
   */
  eliminarProductoRecurso(id: string): Promise<void> {
    const recursoDocRef = doc(this.firestore, 'producto_recurso', id);
    return updateDoc(recursoDocRef, { activo: false });
  }

  /**
   * Obtiene un producto recurso por su UID en tiempo real
   */
  obtenerProductoRecursoPorId(id: string): Observable<any> {
    const recursoDocRef = doc(this.firestore, 'producto_recurso', id);
    return docData(recursoDocRef, { idField: 'id' });
  }

  /**
   * Inserta un nuevo producto recurso en la colección 'producto_recurso'
   */
  crearProductoRecurso(recurso: any): Promise<any> {
    const colRef = collection(this.firestore, 'producto_recurso');
    return addDoc(colRef, recurso);
  }

  /**
   * Actualiza un producto recurso existente de forma parcial
   */
  actualizarProductoRecurso(id: string, recurso: Partial<any>): Promise<void> {
    const recursoDocRef = doc(this.firestore, 'producto_recurso', id);
    return updateDoc(recursoDocRef, recurso);
  }


}
