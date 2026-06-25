import { Component, OnInit, inject } from '@angular/core'; // 🌟 Agregamos inject y OnInit
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // 🌟 Cambiamos RouterLink por Router
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ProductoSimpleComponent } from '../inventario-tipo-producto/producto-simple/producto-simple.component';
import { ProductoCompuestoComponent } from '../inventario-tipo-producto/producto-compuesto/producto-compuesto.component';
import { PromocionesComponent } from '../inventario-tipo-producto/promociones/promociones.component';
import { ProductoRecursoComponent } from '../inventario-tipo-producto/producto-recurso/producto-recurso.component';

import { AgregarProdSimpleComponent } from '../inventario-tipo-producto/producto-simple/popups-crud-producto-simple/agregar-prod-simple/agregar-prod-simple.component';
import { AgregarProdCompuestoComponent } from '../inventario-tipo-producto/producto-compuesto/popups-crud-producto-compuesto/agregar-prod-compuesto/agregar-prod-compuesto.component';
import { AgregarPromocionComponent } from '../inventario-tipo-producto/promociones/popups-crud-promociones/agregar-promocion/agregar-promocion.component';
import { AgregarProdRecursoComponent } from '../inventario-tipo-producto/producto-recurso/popups-crud-producto-recurso/agregar-prod-recurso/agregar-prod-recurso.component';
import { InventarioService } from './../services/inventario.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ProductoSimpleComponent,
    ProductoCompuestoComponent,
    PromocionesComponent,
    ProductoRecursoComponent,
  ],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit { // 🌟 Buena práctica: agregar 'implements OnInit'

  private inventarioService = inject(InventarioService);
  
  onBuscar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inventarioService.actualizarTermino(input.value);
  }

  // 🌟 Inyectamos el servicio Router para la navegación por código
  private router = inject(Router);
  private dialog = inject(MatDialog);

  rolUsuario: string | null = null;
  activeTab: string = 'simples';

  ngOnInit(): void {
    this.rolUsuario = sessionStorage.getItem('rol');
  }

  esAdmin(): boolean {
    return this.rolUsuario === 'administrador';
  }

  irCategorias(): void {
    this.router.navigate(['inventario/categorias']);
  }

  irProveedores(): void {
    this.router.navigate(['inventario/proveedores']);
  }

  agregarElemento(): void {
    switch (this.activeTab) {
      case 'simples':
        this.dialog.open(AgregarProdSimpleComponent, {
          width: '60vw',
          maxWidth: 'none',
          disableClose: true
        });
        break;

      case 'compuestos':
        this.dialog.open(AgregarProdCompuestoComponent, {
          width: '60vw',
          maxWidth: 'none',
          disableClose: true
        });
        break;

      case 'promociones':
        this.dialog.open(AgregarPromocionComponent, {
          width: '60vw',
          maxWidth: 'none',
          disableClose: true
        });
        break;

      case 'recursos':
        this.dialog.open(AgregarProdRecursoComponent, {
          width: '60vw',
          maxWidth: 'none',
          disableClose: true
        });
        break;
    }
  }

  volver(): void {
    this.router.navigate(['/menu-principal']);
  }

}