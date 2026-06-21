import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarProdSimpleComponent } from './agregar-prod-simple.component';

describe('AgregarProdSimpleComponent', () => {
  let component: AgregarProdSimpleComponent;
  let fixture: ComponentFixture<AgregarProdSimpleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarProdSimpleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarProdSimpleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
