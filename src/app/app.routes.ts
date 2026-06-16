import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./core/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'registro-empresa-primer-admin',
        loadComponent: () => import('./core/register-company-first-admin-user/register-company-first-admin-user.component').then(m => m.RegisterCompanyFirstAdminUserComponent)
    },
    {
        path: 'activar-cuenta',
        loadComponent: () => import('./core/activate-user/activate-user.component').then(m => m.ActivateUserComponent)
    },
    {
        path: 'menu-principal',
        loadComponent: () => import('./features/main/main.component').then(m => m.MainComponent)
    },
    
    // ==========================================
    // RUTAS DE LOS MÓDULOS (FEATURES)
    // ==========================================
    {
        path: 'inventario',
        loadComponent: () => import('./features/inventario/inventario.component').then(m => m.InventarioComponent)
    },
    {
        path: 'nuevo-producto',
        loadComponent: () => import('./features/nuevo-producto/nuevo-producto.component').then(m => m.NuevoProductoComponent)
    },
    {
        path: 'registrar-compra',
        loadComponent: () => import('./features/registrar-compra/registrar-compra.component').then(m => m.RegistrarCompraComponent)
    },
    {
        path: 'registrar-venta',
        loadComponent: () => import('./features/registrar-venta/registrar-venta.component').then(m => m.RegistrarVentaComponent)
    },
    {
        path: 'reportes-historial',
        loadComponent: () => import('./features/reportes-historial/reportes-historial.component').then(m => m.ReportesHistorialComponent)
    },
    {
        path: 'ultimos-reportes',
        loadComponent: () => import('./features/ultimos-reportes/ultimos-reportes.component').then(m => m.UltimosReportesComponent)
    }
];