import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModificarCategoriaComponent } from './modificar-categoria.component';

describe('ModificarCategoriaComponent', () => {
  let component: ModificarCategoriaComponent;
  let fixture: ComponentFixture<ModificarCategoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModificarCategoriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModificarCategoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
