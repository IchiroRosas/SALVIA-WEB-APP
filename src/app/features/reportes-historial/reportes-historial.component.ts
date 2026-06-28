import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reportes-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-historial.component.html',
  styleUrl: './reportes-historial.component.css'
})
export class ReportesHistorialComponent {
  userPrompt: string = '';       // Guarda el texto que tú escribes
  aiResponse: string = '';       // Guarda la respuesta que devuelva la IA
  isLoading: boolean = false;    // Controla si el botón se bloquea mientras piensa

  // 🚨 NOTA: Dejamos la URL vacía por ahora. Cuando despleguemos la función,
  // Firebase nos dará una URL real y la pegaremos aquí.
  private cloudFunctionUrl = 'http://127.0.0.1:5001/salvia-app-865f5/us-central1/preguntarGemini';

  async enviarAI() {
    if (!this.userPrompt.trim()) return;

    this.isLoading = true;
    this.aiResponse = 'Pensando... 🧠';

    try {
      const response = await fetch(this.cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: this.userPrompt })
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      this.aiResponse = data.respuesta;
    } catch (error) {
      console.error('Error al conectar con la Cloud Function:', error);
      this.aiResponse = 'Hubo un error al comunicarse con la IA. Verifica los logs de la consola.';
    } finally {
      this.isLoading = false;
    }
  }
}