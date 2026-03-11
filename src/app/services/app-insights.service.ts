import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

@Injectable({
  providedIn: 'root'
})
export class AppInsightsService {

  private appInsights = new ApplicationInsights({
    config: {
      connectionString: 'InstrumentationKey=0d99bf34-6355-4d80-963d-b35658323c21;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=1dd09ec7-4d5b-44b2-b506-e78a8e21281a',
      enableAutoRouteTracking: true
    }
  });

  constructor() {
    this.appInsights.loadAppInsights();
  }

  // Track page view
  logPageView(name?: string) {
    this.appInsights.trackPageView({ name });
  }

  // Track custom events
  trackEvent(name: string, properties?: any) {
    this.appInsights.trackEvent({ name }, properties);
  }

  // Track errors
  logException(error: any) {
    this.appInsights.trackException({ exception: error });
  }
}