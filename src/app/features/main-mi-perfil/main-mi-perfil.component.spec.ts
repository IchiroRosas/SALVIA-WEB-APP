import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainMiPerfilComponent } from './main-mi-perfil.component';

describe('MainMiPerfilComponent', () => {
  let component: MainMiPerfilComponent;
  let fixture: ComponentFixture<MainMiPerfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainMiPerfilComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainMiPerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
