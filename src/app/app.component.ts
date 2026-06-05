import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Salvia-Web';
  firestore = inject(Firestore);

  ngOnInit(): void {
    const categoriasCollection = collection(this.firestore, 'categorias');
    console.log('¡Firestore está conectado correctamente!', categoriasCollection);
  }
}
