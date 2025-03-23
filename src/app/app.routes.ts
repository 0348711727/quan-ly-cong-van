import { Routes } from '@angular/router';
import { HomeComponent } from './share/home/home.component';

export const routes: Routes = [
  { pathMatch: 'full', redirectTo: '', path: '' },
  { path: '', component: HomeComponent },
  {
    path: 'add-document',
    loadComponent: () =>
      import('./partial/add-document/add-document.component').then(
        (com) => com.AddDocumentComponent
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./share/not-found-404/not-found-404.component').then(
        (com) => com.NotFound404Component
      ),
  },
];
