import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleProdCompuestoComponent } from './detalle-prod-compuesto.component';

describe('DetalleProdCompuestoComponent', () => {
  let component: DetalleProdCompuestoComponent;
  let fixture: ComponentFixture<DetalleProdCompuestoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleProdCompuestoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleProdCompuestoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
