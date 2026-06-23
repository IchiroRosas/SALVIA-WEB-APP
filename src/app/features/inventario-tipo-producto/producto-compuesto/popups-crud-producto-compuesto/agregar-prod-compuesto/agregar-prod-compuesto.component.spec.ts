import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarProdCompuestoComponent } from './agregar-prod-compuesto.component';

describe('AgregarProdCompuestoComponent', () => {
  let component: AgregarProdCompuestoComponent;
  let fixture: ComponentFixture<AgregarProdCompuestoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarProdCompuestoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarProdCompuestoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
