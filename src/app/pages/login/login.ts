import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { AppInsightsService } from '../../services/app-insights.service'; // Added

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './login.html'
})
export class Login implements OnInit {

  email = '';
  password = '';
  loading = false;
  error: string | null = null;
  logoutMsg: string | null = null;

  private router = inject(Router);
  private http = inject(HttpClient);
  private appInsights = inject(AppInsightsService); // Added

  ngOnInit() {

    // Track login page view
    this.appInsights.logPageView('Login Page');

    const state = history.state;
    if (state && state.loggedOutMessage) {
      this.logoutMsg = state.loggedOutMessage;
      setTimeout(() => this.logoutMsg = null, 3000);
    }

    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');

    if (token && !this.isTokenExpired(token)) {

      const payload = this.decodeJwt(token);
      const expiryTime = (payload.exp * 1000) - Date.now();

      setTimeout(() => this.handleSessionExpiry(), expiryTime);

      if (userRole === 'Member') {
        this.router.navigate(['/MemberProfile']);
      } else {
        this.router.navigate(['/']);
      }

    } else {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    }
  }

  handleSubmit() {

    this.loading = true;
    this.error = null;

    this.http.post<any>(`${environment.apiUrl}/api/Users/login`, {
      email: this.email,
      password: this.password
    }).subscribe({

      next: (res) => {

        const { token, user } = res;

        localStorage.setItem('jwtToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.userRole);

        const payload = this.decodeJwt(token);
        setTimeout(() => this.handleSessionExpiry(), (payload.exp * 1000) - Date.now());

        // Track successful login
        this.appInsights.trackEvent('User Login Success', { role: user.userRole });

        if (user.userRole === 'Member') {
          this.router.navigate(['/MemberProfile']);
        } else {
          this.router.navigate(['/']);
        }
      },

      error: (err) => {

        this.loading = false;

        // Track login error
        this.appInsights.logException(err);

        if (err.status === 403 && err.error?.message === "Password must be changed on first login") {
          this.router.navigate(['/change-password'], { state: { userId: err.error.userId } });
        } else {
          this.error = 'Invalid email or password. Please try again.';
        }
      }
    });
  }

  private handleSessionExpiry() {

    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');

    // Track session expiry
    this.appInsights.trackEvent('Session Expired');

    alert('Session expired. Please log in again.');
    this.router.navigate(['/login']);
  }

  private decodeJwt(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return { exp: 0 };
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwt(token);
    return (payload.exp * 1000) < Date.now();
  }
}