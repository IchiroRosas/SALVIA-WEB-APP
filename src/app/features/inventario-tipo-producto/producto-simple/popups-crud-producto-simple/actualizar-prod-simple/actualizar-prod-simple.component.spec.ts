import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualizarProdSimpleComponent } from './actualizar-prod-simple.component';

describe('ActualizarProdSimpleComponent', () => {
  let component: ActualizarProdSimpleComponent;
  let fixture: ComponentFixture<ActualizarProdSimpleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualizarProdSimpleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualizarProdSimpleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
