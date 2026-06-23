import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoRecursoComponent } from './producto-recurso.component';

describe('ProductoRecursoComponent', () => {
  let component: ProductoRecursoComponent;
  let fixture: ComponentFixture<ProductoRecursoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoRecursoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoRecursoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
