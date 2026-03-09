import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../components/sidebar/sidebar'; // Fixed import name

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule], // Fixed array
  template: `
    <app-sidebar [isOpen]="isSidebarOpen" (toggle)="toggleSidebar()"></app-sidebar>
    
    <div [style.marginLeft]="isSidebarOpen ? '260px' : '72px'" 
         style="padding: 20px; transition: margin-left 0.3s ease; min-height: 100vh; background-color: #f8f9fa;">
      <router-outlet></router-outlet> </div>
  `
})
export class LayoutComponent { // Ensuring this is named LayoutComponent
  isSidebarOpen = true;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}