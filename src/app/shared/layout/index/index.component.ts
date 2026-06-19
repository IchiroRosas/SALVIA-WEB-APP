import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { BodyComponent } from '../body/body.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [NavbarComponent, BodyComponent, RouterOutlet],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexComponent {

}
