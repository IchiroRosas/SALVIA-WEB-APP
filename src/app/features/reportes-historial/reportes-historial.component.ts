import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, query, where, doc, docData, Timestamp } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { InventarioService } from '../services/inventario.service';
import { Router } from '@angular/router'; 

export interface TransaccionListadoDto {
  id: string;
  tipo: 'Compra' | 'Venta' | 'Gasto Interno'; // Agregamos el nuevo tipo
  montoTotal: number;
  fechaHora: Date | null;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './reportes-historial.component.html',
  styleUrls: ['./reportes-historial.component.css']
})
export class ReportesHistorialComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  public inventarioService = inject(InventarioService);
    private router = inject(Router);

  empresaId: string | null = null;
  transaccionesFiltradas$!: Observable<TransaccionListadoDto[]>;

  private filtroTipoSubject = new BehaviorSubject<string>('TODOS');

  // Helper definitivo para convertir Timestamps de Firebase a Date nativo de JS
  private convertirTimestampADate(campoFecha: any): Date | null {
    if (!campoFecha) return null;
    // Si ya viene con el método nativo .toDate() de Firebase
    if (typeof campoFecha.toDate === 'function') {
      return campoFecha.toDate();
    }
    // Si Firebase lo deserializó como un objeto JSON plano {seconds, nanoseconds}
    if (campoFecha.seconds !== undefined) {
      return new Date(campoFecha.seconds * 1000);
    }
    // Si ya es un objeto Date
    if (campoFecha instanceof Date) {
      return campoFecha;
    }
    return null;
  }

  ngOnInit(): void {
    // Definimos rangos del día de hoy (00:00:00 a 23:59:59)
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const timestampInicio = Timestamp.fromDate(hoyInicio);

    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);
    const timestampFin = Timestamp.fromDate(hoyFin);

    this.transaccionesFiltradas$ = user(this.auth).pipe(
      switchMap(authUser => {
        if (!authUser) return of(null);
        const userDocRef = doc(this.firestore, 'users', authUser.uid);
        return docData(userDocRef);
      }),
      switchMap((userData: any) => {
        if (!userData || !userData.empresa_id) {
          console.warn('Salvia: No se encontró empresa_id');
          return of([]);
        }

        const miEmpresaId = userData.empresa_id;
        this.empresaId = miEmpresaId;

        // 1. QUERY VENTAS
        const ventasQuery = query(
          collection(this.firestore, 'ventas'), 
          where('empresa_id', '==', miEmpresaId),
          where('fecha_hora', '>=', timestampInicio), // Ojo: Comentar estas líneas si vas a probar datos antiguos
          where('fecha_hora', '<=', timestampFin)
        );

        // 2. QUERY COMPRAS
        const comprasQuery = query(
          collection(this.firestore, 'compras'), 
          where('empresa_id', '==', miEmpresaId),
          where('fecha', '>=', timestampInicio),
          where('fecha', '<=', timestampFin)
        );

        // 3. QUERY GASTOS INTERNOS (registro_compra_producto_recurso)
        const gastosQuery = query(
          collection(this.firestore, 'registro_compra_producto_recurso'), 
          where('empresa_id', '==', miEmpresaId),
          where('fecha_compra', '>=', timestampInicio),
          where('fecha_compra', '<=', timestampFin)
        );

        // Pasamos las colecciones a Observables
        const ventasData$ = collectionData(ventasQuery, { idField: 'id' }) as Observable<any[]>;
        const comprasData$ = collectionData(comprasQuery, { idField: 'id' }) as Observable<any[]>;
        const gastosData$ = collectionData(gastosQuery, { idField: 'id' }) as Observable<any[]>;

        // Combinamos las 3 fuentes de datos en paralelo
        return combineLatest([ventasData$, comprasData$, gastosData$]).pipe(
          map(([ventas, compras, gastos]) => {
            
            // Mapeo unificado usando el convertidor seguro de fechas
            const ventasMapeadas = ventas.map((v): TransaccionListadoDto => ({
              id: v.id || '',
              tipo: 'Venta',
              montoTotal: v.total_venta || 0, 
              fechaHora: this.convertirTimestampADate(v.fecha_hora)
            }));

            const comprasMapeadas = compras.map((c): TransaccionListadoDto => ({
              id: c.id || '',
              tipo: 'Compra',
              montoTotal: c.costo_total_operacion || 0,
              fechaHora: this.convertirTimestampADate(c.fecha)
            }));

            const gastosMapeados = gastos.map((g): TransaccionListadoDto => ({
              id: g.id || '',
              tipo: 'Gasto Interno',
              montoTotal: g.precio_compra || 0, // Extraído de tu captura de pantalla
              fechaHora: this.convertirTimestampADate(g.fecha_compra)
            }));

            // Retornamos la unión limpia de los 3 arreglos
            return [...ventasMapeadas, ...comprasMapeadas, ...gastosMapeados];
          })
        );
      }),
      // Procesamiento de filtros reactivos del frontend
      switchMap((todasLasTransacciones: TransaccionListadoDto[]) => {
        return combineLatest([
          this.filtroTipoSubject,
          this.inventarioService.termino$.pipe(startWith(''))
        ]).pipe(
          map(([filtroTipo, termino]) => {
            const busqueda = (termino || '').toLowerCase().trim();

            return todasLasTransacciones.filter(t => {
              const cumpleTipo = filtroTipo === 'TODOS' || t.tipo === filtroTipo;
              const cumpleBuscador = t.tipo.toLowerCase().includes(busqueda) || 
                                     t.montoTotal.toString().includes(busqueda);
              return cumpleTipo && cumpleBuscador;
            });
          })
        );
      })
    );
  }

  cambiarFiltroTipo(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.filtroTipoSubject.next(valor);
  }

  verDetalleTransaccion(id: string, tipo: string): void {
    this.toastr.info(`Visualizando ${tipo}: ${id}`, 'Detalle de Transacción');
  }

    volver(): void {
    this.router.navigate(['/menu-principal']);
  }

}