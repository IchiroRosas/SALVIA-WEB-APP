import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where, doc, updateDoc, addDoc, docData, getDocs } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ProductoCompuestoDb, ProductoSimpleDb } from '../../shared/models/dto';

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

}
