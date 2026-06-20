import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importaciones con las rutas exactas según tu árbol de directorios
import { ProductoSimpleComponent } from '../inventario-tipo-producto/producto-simple/producto-simple.component';
import { ProductoCompuestoComponent } from '../inventario-tipo-producto/producto-compuesto/producto-compuesto.component';
import { PromocionesComponent } from '../inventario-tipo-producto/promociones/promociones.component';
import { ProductoRecursoComponent } from '../inventario-tipo-producto/producto-recurso/producto-recurso.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  // Agregamos los componentes standalones al arreglo de imports
  imports: [
    CommonModule,
    ProductoSimpleComponent,
    ProductoCompuestoComponent,
    PromocionesComponent,
    ProductoRecursoComponent
  ],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent {
  // Estado para controlar qué pestaña se muestra por defecto
  activeTab: string = 'simples';
}