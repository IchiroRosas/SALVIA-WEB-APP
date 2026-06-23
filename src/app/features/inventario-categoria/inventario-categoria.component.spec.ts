import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventarioCategoriaComponent } from './inventario-categoria.component';

describe('InventarioCategoriaComponent', () => {
  let component: InventarioCategoriaComponent;
  let fixture: ComponentFixture<InventarioCategoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioCategoriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioCategoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
