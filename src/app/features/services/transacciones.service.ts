import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  collectionData,
  increment
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TransaccionesService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  constructor() { }

  //*************************************************************
  // COMPRAS
  //*************************************************************

  /**
   * Obtiene el empresa_id del usuario actual autenticado
   */
  getEmpresaId(): Observable<string | null> {
    return from(new Promise<string | null>((resolve) => {
      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userDocRef = doc(this.firestore, `users/${user.uid}`);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            resolve(userDoc.data()['empresa_id'] || null);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    }));
  }

  /**
   * Obtiene la lista de formatos de compra globales
   */
  getFormatosCompra(): Observable<any[]> {
    const formatosRef = collection(this.firestore, 'formatos_compra');
    return collectionData(formatosRef, { idField: 'id' });
  }

  /**
   * Obtiene los proveedores de la empresa
   */
  getProveedores(empresaId: string): Observable<any[]> {
    const provRef = collection(this.firestore, 'proveedores');
    const q = query(provRef, where('empresa_id', '==', empresaId), where('activo', '==', true));
    return collectionData(q, { idField: 'id' });
  }

  /**
   * Obtiene productos simples mapeados con el nombre de su proveedor
   */
  getProductosSimples(empresaId: string): Observable<any[]> {
    const prodRef = collection(this.firestore, 'productos_simples');
    const q = query(prodRef, where('empresa_id', '==', empresaId), where('activo', '==', true));

    return this.getProveedores(empresaId).pipe(
      switchMap(proveedores => {
        return collectionData(q, { idField: 'id' }).pipe(
          map(productos => productos.map(prod => {
            const prov = proveedores.find(p => p.id === prod['id_proveedor']);
            return {
              ...prod,
              nombre_proveedor: prov ? prov.nombre_proveedor : 'Proveedor Desconocido'
            };
          }))
        );
      })
    );
  }

  /**
   * Obtiene productos de recurso mapeados con el nombre de su proveedor
   */
  getProductosRecurso(empresaId: string): Observable<any[]> {
    const recursoRef = collection(this.firestore, 'producto_recurso');
    const q = query(recursoRef, where('empresa_id', '==', empresaId), where('activo', '==', true));

    return this.getProveedores(empresaId).pipe(
      switchMap(proveedores => {
        return collectionData(q, { idField: 'id' }).pipe(
          map(recursos => recursos.map(rec => {
            const prov = proveedores.find(p => p.id === rec['id_proveedor']);
            return {
              ...rec,
              nombre_proveedor: prov ? prov.nombre_proveedor : 'Proveedor Desconocido'
            };
          }))
        );
      })
    );
  }

  /**
   * Registra la compra de un producto simple empleando un lote atómico (Batch)
   */
  registrarCompraSimple(compraData: any, productoId: string, nuevoStock: number, nuevoPrecioCompra: number): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Crear nuevo documento en colección 'compras'
    const comprasCollectionRef = collection(this.firestore, 'compras');
    const nuevaCompraDocRef = doc(comprasCollectionRef);
    batch.set(nuevaCompraDocRef, compraData);

    // 2. Actualizar stock y precio en 'productos_simples'
    const productoDocRef = doc(this.firestore, `productos_simples/${productoId}`);
    batch.update(productoDocRef, {
      stock_actual: nuevoStock,
      precio_compra_unitario: nuevoPrecioCompra
    });

    return batch.commit();
  }

  /**
   * Registra la compra de un producto recurso empleando un lote atómico (Batch)
   */
  registrarCompraRecurso(registroData: any, recursoId: string, nuevoPrecioCompra: number): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Crear nuevo documento en 'registro_compra_producto_recurso'
    const registroCollectionRef = collection(this.firestore, 'registro_compra_producto_recurso');
    const nuevoRegistroDocRef = doc(registroCollectionRef);
    batch.set(nuevoRegistroDocRef, registroData);

    // 2. Actualizar precio de compra en 'producto_recurso'
    const recursoDocRef = doc(this.firestore, `producto_recurso/${recursoId}`);
    batch.update(recursoDocRef, {
      precio_compra: nuevoPrecioCompra
    });

    return batch.commit();
  }

  //*************************************************************
  // VENTAS / BUSQUEDAS
  //*************************************************************

  /**
   * Obtiene los productos compuestos (combos) activos de la empresa
   */
  getProductosCompuestos(empresaId: string): Observable<any[]> {
    const compuestoRef = collection(this.firestore, 'prod_compuesto');
    const q = query(compuestoRef, where('empresa_id', '==', empresaId), where('activo', '==', true));
    return collectionData(q, { idField: 'id' });
  }

  /**
   * Obtiene las promociones activas de la empresa
   */
  getPromociones(empresaId: string): Observable<any[]> {
    const promoRef = collection(this.firestore, 'promociones');
    const q = query(promoRef, where('empresa_id', '==', empresaId), where('activo', '==', true));
    return collectionData(q, { idField: 'id' });
  }

  /**
   * Registra una venta completa y actualiza los stocks de múltiples productos simples simultáneamente.
   */
  async ejecutarTransaccionVenta(payloadVenta: any, mapaDescuentos: { [key: string]: number }): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Generar nuevo documento de venta con ID automático
    const ventaRef = doc(collection(this.firestore, 'ventas'));
    batch.set(ventaRef, payloadVenta);

    // 2. Procesar las reducciones físicas de stock de los productos simples involucrados
    for (const productoSimpleId of Object.keys(mapaDescuentos)) {
      const cantidadADescontar = mapaDescuentos[productoSimpleId];
      const prodSimpleRef = doc(this.firestore, `productos_simples/${productoSimpleId}`);

      batch.update(prodSimpleRef, {
        stock_actual: increment(-cantidadADescontar)
      });
    }

    // 3. Confirmar lote completo
    await batch.commit();
  }

}