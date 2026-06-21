import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarProdCompuestoComponent } from './actualizar-prod-compuesto.component';

describe('ActualizarProdCompuestoComponent', () => {
  let component: ActualizarProdCompuestoComponent;
  let fixture: ComponentFixture<ActualizarProdCompuestoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarProdCompuestoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarProdCompuestoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
