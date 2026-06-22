import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InventarioService } from '../../../../services/inventario.service';
import { switchMap, map, Subscription } from 'rxjs';
import { ProductoCompuestoDb } from '../../../../../shared/models/dto';

@Component({
  selector: 'app-detalle-prod-compuesto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-prod-compuesto.component.html',
  styleUrl: './detalle-prod-compuesto.component.css'
})
export class DetalleProdCompuestoComponent {

  cargando = true;
  comboData: any = null;
  totalCostoAcumulado = 0;
  private subscripcion!: Subscription;
  dataCombo?: ProductoCompuestoDb & { id?: string };

  constructor(
    private dialogRef: MatDialogRef<DetalleProdCompuestoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { idCombo: string },
    private inventarioService: InventarioService
  ) { }

  ngOnInit(): void {
    this.cargarInformacionCompleta();
  }

  ngOnDestroy(): void {
    if (this.subscripcion) {
      this.subscripcion.unsubscribe();
    }
  }

  cargarInformacionCompleta(): void {
    this.cargando = true;

    this.subscripcion = this.inventarioService.obtenerProductoCompuestoPorId(this.data.idCombo)
      .pipe(
        switchMap((combo: any) => {
          // Buscamos todos los productos simples activos pertenecientes a la misma empresa
          return this.inventarioService.obtenerProductosSimplesActivos(combo.empresa_id).pipe(
            map((simples: any[]) => {

              // Recorremos el Array de sub-componentes del Combo
              const componentesEnriquecidos = combo.productos_componentes?.map((comp: any) => {

                // Buscamos el documento correspondiente en la colección de 'productos_simples'
                const coincidencia = simples.find(s => s.id === comp.producto_simple_id);

                /* 🌟 SOLUCIÓN AL COSTO FALTANTE:
                  Si 'comp.precio_compra_unitario' no existe en el combo, lo jalamos del producto simple.
                  Asegúrate de cambiar 'precio_compra_unitario' por cómo se llame el campo de costo 
                  en tu colección de 'productos_simples' (ej: precio_compra, costo, etc.)
                */
                const costoUnitarioResuelto = comp.precio_compra_unitario
                  || coincidencia?.precio_compra_unitario
                  || coincidencia?.precio_compra
                  || coincidencia?.precio_costo
                  || 0;

                return {
                  ...comp,
                  descripcion_prod: coincidencia ? coincidencia.descripcion_prod : 'Producto No Encontrado',
                  marca_prod: coincidencia ? coincidencia.marca_prod : '—',
                  unidad_medida: coincidencia?.unidad_medida || coincidencia?.u_medida || 'Kilogramo',

                  // Inyectamos el costo resuelto directamente al item para asegurar los cálculos
                  precio_compra_unitario: costoUnitarioResuelto
                };
              }) || [];

              return {
                ...combo,
                productos_componentes: componentesEnriquecidos
              };
            })
          );
        })
      )
      .subscribe({
        next: (comboCompleto) => {
          this.comboData = comboCompleto;
          this.calcularCostoTotal();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al recuperar los datos:', error);
          this.cargando = false;
        }
      });
  }
  
  calcularCostoTotal(): void {
    if (!this.comboData || !this.comboData.productos_componentes) return;
    this.totalCostoAcumulado = this.comboData.productos_componentes.reduce((acc: number, item: any) => {
      const cantidad = Number(item.cantidad_necesaria || 0);
      const costoUnitario = Number(item.precio_compra_unitario || 0);
      return acc + (cantidad * costoUnitario);
    }, 0);
  }

  cerrarModal(): void {
    this.dialogRef.close();
  }

}
