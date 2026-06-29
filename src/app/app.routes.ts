import { Routes } from '@angular/router';
import { IndexComponent } from './shared/layout/index/index.component'; // 🌟 Importamos tu contenedor del Navbar

export const routes: Routes = [

    // ==========================================
    // 1. PANTALLAS COMPLETAS (Sin Navbar - Flujo inicial)
    // ==========================================
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
        path: 'pasarela-pago',
        loadComponent: () => import('./core/pasarela-pago/pasarela-pago.component').then(m => m.PasarelaPagoComponent)
    },

    // ==========================================
    // 2. MÓDULOS DE LA BODEGA (Con Navbar + app-body permanente)
    // ==========================================
    {
        path: '',
        component: IndexComponent, // 🌟 El padre que inyecta el layout general
        children: [
            {
                path: 'menu-principal',
                loadComponent: () => import('./features/main/main.component').then(m => m.MainComponent)
            },
            {
                path: 'inventario',
                children: [
                    {
                        path: '', // 💡 Ruta por defecto: /inventario
                        loadComponent: () => import('./features/inventario/inventario.component').then(m => m.InventarioComponent)
                    },
                    {
                        path: 'categorias', // 💡 Ruta hija: /inventario/categorias
                        loadComponent: () => import('./features/inventario-categoria/inventario-categoria.component').then(m => m.InventarioCategoriaComponent)
                    },
                    {
                        path: 'proveedores', // 💡 Ruta hija: /inventario/categorias
                        loadComponent: () => import('./features/inventario-proveedor/inventario-proveedor.component').then(m => m.InventarioProveedorComponent)
                    }
                ]
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
        ]
    },

    // Manejo de rutas inexistentes
    {
        path: '**',
        redirectTo: 'login'
    }

];