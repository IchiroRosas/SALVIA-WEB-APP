import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-pasarela-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './pasarela-pago.component.html',
  styleUrls: ['./pasarela-pago.component.css']
})
export class PasarelaPagoComponent implements OnInit {
  private fb = inject(FormBuilder);
  // Inyectamos la referencia del modal para poder cerrarlo y mandar datos de vuelta
  private dialogRef = inject(MatDialogRef<PasarelaPagoComponent>);

  pagoForm!: FormGroup;
  isPaying = false;

  ngOnInit(): void {
    this.pagoForm = this.fb.group({
      nombreTitular: ['', [Validators.required, Validators.minLength(4)]],
      numeroTarjeta: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]],
      expiracion: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\/[0-9]{2}$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
  }

  procesarPago(): void {
    if (this.pagoForm.invalid) return;

    this.isPaying = true;

    setTimeout(() => {
      this.isPaying = false;
      this.dialogRef.close(true); 
    }, 2500);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}