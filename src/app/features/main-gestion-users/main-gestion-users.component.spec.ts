import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainGestionUsersComponent } from './main-gestion-users.component';

describe('MainGestionUsersComponent', () => {
  let component: MainGestionUsersComponent;
  let fixture: ComponentFixture<MainGestionUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainGestionUsersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainGestionUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
