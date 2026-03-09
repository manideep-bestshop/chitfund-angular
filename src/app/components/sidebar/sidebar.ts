import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  @Input() isOpen = true; 
  @Output() toggle = new EventEmitter<void>(); 

  private router = inject(Router);

  get role() {
    return localStorage.getItem('userRole') || 'User';
  }

  get userName() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').firstName || 'User';
    } catch { return 'User'; }
  }

  hasAccess(roles: string[]) {
    return roles.includes(this.role);
  }

  handleLogout() {
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}