import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoCompuestoComponent } from './producto-compuesto.component';

describe('ProductoCompuestoComponent', () => {
  let component: ProductoCompuestoComponent;
  let fixture: ComponentFixture<ProductoCompuestoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoCompuestoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoCompuestoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
