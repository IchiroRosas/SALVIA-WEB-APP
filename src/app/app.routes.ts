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
        path: 'registrar-empresa',
        loadComponent: () => import('./core/register-company/register-company.component').then(m => m.RegisterCompanyComponent)
    },
    {
        path: 'registrar-empleado',
        loadComponent: () => import('./core/register-employee/register-employee.component').then(m => m.RegisterEmployeeComponent)
    }
];