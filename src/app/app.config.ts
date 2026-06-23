import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()), provideAnimationsAsync(),
    provideToastr({
      timeOut: 2500,             // Duración por defecto (2.5 segundos)
      positionClass: 'toast-top-right', // Esquina superior derecha
      preventDuplicates: true,   // Evita acumular el mismo mensaje muchas veces
      progressBar: true,         // Muestra la barra de progreso de tiempo
      closeButton: false         // Oculta el botón 'X' para mantenerlo minimalista
    })
  ]
};
