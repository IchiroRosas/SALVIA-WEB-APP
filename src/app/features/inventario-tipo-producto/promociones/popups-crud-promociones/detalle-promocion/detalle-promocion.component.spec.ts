import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallePromocionComponent } from './detalle-promocion.component';

describe('DetallePromocionComponent', () => {
  let component: DetallePromocionComponent;
  let fixture: ComponentFixture<DetallePromocionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePromocionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetallePromocionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
