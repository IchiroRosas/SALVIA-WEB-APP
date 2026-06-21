import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarPromocionComponent } from './agregar-promocion.component';

describe('AgregarPromocionComponent', () => {
  let component: AgregarPromocionComponent;
  let fixture: ComponentFixture<AgregarPromocionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarPromocionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarPromocionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
