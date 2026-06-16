import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportesHistorialComponent } from './reportes-historial.component';

describe('ReportesHistorialComponent', () => {
  let component: ReportesHistorialComponent;
  let fixture: ComponentFixture<ReportesHistorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesHistorialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportesHistorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
