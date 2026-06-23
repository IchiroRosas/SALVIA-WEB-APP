import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainInvitarUsuarioFormComponent } from './main-invitar-usuario-form.component';

describe('MainInvitarUsuarioFormComponent', () => {
  let component: MainInvitarUsuarioFormComponent;
  let fixture: ComponentFixture<MainInvitarUsuarioFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainInvitarUsuarioFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainInvitarUsuarioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
