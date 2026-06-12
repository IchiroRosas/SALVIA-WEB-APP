import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubExpiradaComunicadoComponent } from './sub-expirada-comunicado.component';

describe('SubExpiradaComunicadoComponent', () => {
  let component: SubExpiradaComunicadoComponent;
  let fixture: ComponentFixture<SubExpiradaComunicadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubExpiradaComunicadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubExpiradaComunicadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
