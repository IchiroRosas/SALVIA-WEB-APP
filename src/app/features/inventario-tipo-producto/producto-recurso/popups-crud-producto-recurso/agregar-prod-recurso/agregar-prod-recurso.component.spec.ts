import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarProdRecursoComponent } from './agregar-prod-recurso.component';

describe('AgregarProdRecursoComponent', () => {
  let component: AgregarProdRecursoComponent;
  let fixture: ComponentFixture<AgregarProdRecursoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarProdRecursoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarProdRecursoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
