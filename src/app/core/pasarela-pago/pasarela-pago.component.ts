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
      numeroTarjeta: ['', [Validators.required, Validators.pattern('^[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}$')]],
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

  formatearNumeroTarjeta(event: Event): void {
    const input = event.target as HTMLInputElement;
    // 1. Eliminar todo lo que no sea un dígito
    let valor = input.value.replace(/\D/g, '');

    // 2. Agrupar de 4 en 4 separados por un espacio
    valor = valor.replace(/(\d{4})(?=\d)/g, '$1 ');

    // 3. Actualizar el valor en el FormCtrl de Angular de manera segura
    this.pagoForm.controls['numeroTarjeta'].setValue(valor, { emitEvent: false });
  }

  formatearExpiracion(event: Event): void {
    const input = event.target as HTMLInputElement;
    // 1. Eliminar todo lo que no sea un dígito
    let valor = input.value.replace(/\D/g, '');

    // 2. Insertar la barra "/" después de los primeros 2 dígitos
    if (valor.length > 2) {
      valor = valor.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
    }

    // 3. Actualizar el valor en el FormCtrl
    this.pagoForm.controls['expiracion'].setValue(valor, { emitEvent: false });
  }

}