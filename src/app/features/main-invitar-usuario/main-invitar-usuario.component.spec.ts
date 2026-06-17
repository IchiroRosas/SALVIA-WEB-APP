import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainInvitarUsuarioComponent } from './main-invitar-usuario.component';

describe('MainInvitarUsuarioComponent', () => {
  let component: MainInvitarUsuarioComponent;
  let fixture: ComponentFixture<MainInvitarUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainInvitarUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainInvitarUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
