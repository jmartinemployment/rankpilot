import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  SiteDashboardComponent,
  PageDetailComponent,
} from 'rankpilot-library';

(async () => {
  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
    ],
  });

  const dashboardElement = createCustomElement(SiteDashboardComponent, {
    injector: appRef.injector,
  });
  customElements.define('rankpilot-dashboard', dashboardElement);

  const pageDetailElement = createCustomElement(PageDetailComponent, {
    injector: appRef.injector,
  });
  customElements.define('rankpilot-page-detail', pageDetailElement);
})();
