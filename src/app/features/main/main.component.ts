import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 1. Importa FormsModule para usar [(ngModel)]
import { CurrencyPipe } from '@angular/common'; // Opcional: para darle formato de dinero automáticamente

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,   // 2. Agrégalo aquí
    CurrencyPipe   // 3. Agrégalo aquí si quieres formato automático
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {
  // Estado para controlar si se está editando o no
  isEditingStartBalance = false;
  
  // Valor inicial del balance (guárdalo como número)
  startBalance: number = 45000; 
}