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
        path: 'registrar-empresa',
        loadComponent: () => import('./core/register-company/register-company.component').then(m => m.RegisterCompanyComponent)
    },
    {
        path: 'registrar-empleado',
        loadComponent: () => import('./core/register-employee/register-employee.component').then(m => m.RegisterEmployeeComponent)
    },
    {
        path: 'menu-principal',
        loadComponent: () => import('./features/main/main.component').then(m => m.MainComponent)
    },
];