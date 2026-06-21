import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarProdRecursoComponent } from './actualizar-prod-recurso.component';

describe('ActualizarProdRecursoComponent', () => {
  let component: ActualizarProdRecursoComponent;
  let fixture: ComponentFixture<ActualizarProdRecursoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarProdRecursoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarProdRecursoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
