import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppInsightsService } from './services/app-insights.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  protected readonly title = signal('chitfund-frontend');

  constructor(private appInsights: AppInsightsService) {}

}