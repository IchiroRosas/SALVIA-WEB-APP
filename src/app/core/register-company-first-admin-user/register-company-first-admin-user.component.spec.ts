import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterCompanyFirstAdminUserComponent } from './register-company-first-admin-user.component';

describe('RegisterCompanyFirstAdminUserComponent', () => {
  let component: RegisterCompanyFirstAdminUserComponent;
  let fixture: ComponentFixture<RegisterCompanyFirstAdminUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterCompanyFirstAdminUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCompanyFirstAdminUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
