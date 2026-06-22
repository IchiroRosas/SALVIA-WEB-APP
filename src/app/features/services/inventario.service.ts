import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where, doc, updateDoc, addDoc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ProductoCompuestoDb, ProductoSimpleDb } from '../../shared/models/dto';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {

  private firestore = inject(Firestore);

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

}
