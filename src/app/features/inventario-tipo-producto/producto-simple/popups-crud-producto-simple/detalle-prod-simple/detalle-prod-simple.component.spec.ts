import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleProdSimpleComponent } from './detalle-prod-simple.component';

describe('DetalleProdSimpleComponent', () => {
  let component: DetalleProdSimpleComponent;
  let fixture: ComponentFixture<DetalleProdSimpleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleProdSimpleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleProdSimpleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
