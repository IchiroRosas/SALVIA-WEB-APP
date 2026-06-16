import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UltimosReportesComponent } from './ultimos-reportes.component';

describe('UltimosReportesComponent', () => {
  let component: UltimosReportesComponent;
  let fixture: ComponentFixture<UltimosReportesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UltimosReportesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UltimosReportesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
