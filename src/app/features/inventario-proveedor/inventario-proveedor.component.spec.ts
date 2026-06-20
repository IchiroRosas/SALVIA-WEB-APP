import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventarioProveedorComponent } from './inventario-proveedor.component';

describe('InventarioProveedorComponent', () => {
  let component: InventarioProveedorComponent;
  let fixture: ComponentFixture<InventarioProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioProveedorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
