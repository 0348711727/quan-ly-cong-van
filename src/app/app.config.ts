import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideL10nTranslation } from 'angular-l10n';
import { routes } from './app.routes';
import { l10nConfig, TranslationLoader } from './l10n-config';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { CustomPaginatorIntl } from './services/custom-paginator-intl.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideL10nTranslation(l10nConfig, {
      translationLoader: TranslationLoader,
    }),
    provideHttpClient(),
    {
      provide: MatPaginatorIntl,
      useClass: CustomPaginatorIntl,
    }
  ],
};
