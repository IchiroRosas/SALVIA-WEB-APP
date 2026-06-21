import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarPromocionComponent } from './actualizar-promocion.component';

describe('ActualizarPromocionComponent', () => {
  let component: ActualizarPromocionComponent;
  let fixture: ComponentFixture<ActualizarPromocionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarPromocionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarPromocionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
