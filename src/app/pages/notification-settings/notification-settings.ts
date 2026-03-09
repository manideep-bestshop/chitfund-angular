import { Component, Input, OnInit, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface NotificationPreferences {
  MonthlyReminder: boolean;
  OverdueReminder: boolean;
  PaymentReceipt: boolean;
  AuctionStart: boolean;
  AuctionWinner: boolean;
}

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings.html',
  styleUrls: ['./notification-settings.css']
})
export class NotificationSettingsComponent implements OnInit {
  @Input() userId!: string; // Passed from parent (e.g., Profile Page)

  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private readonly API_BASE = `${environment.apiUrl}/api/Users`;

  preferences: NotificationPreferences = {
    MonthlyReminder: true,
    OverdueReminder: true,
    PaymentReceipt: true,
    AuctionStart: true,
    AuctionWinner: true,
  };
  
  isSaving = false;

  get authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    if (this.userId) {
      this.fetchPrefs();
    }
  }

  fetchPrefs() {
    this.http.get<NotificationPreferences>(`${this.API_BASE}/${this.userId}/preferences`, this.authHeaders)
      .subscribe({
        next: (data) => {
          this.zone.run(() => {
            this.preferences = data;
            this.cdr.detectChanges();
          });
        },
        error: (err) => console.error("Failed to load preferences", err)
      });
  }

  handleToggle(key: keyof NotificationPreferences) {
    // 1. Optimistic Update (UI updates immediately)
    const previousValue = this.preferences[key];
    this.preferences[key] = !this.preferences[key];
    
    this.isSaving = true;

    // 2. Sync with Backend
    this.http.patch(`${this.API_BASE}/${this.userId}/preferences`, this.preferences, this.authHeaders)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.isSaving = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            console.error("Failed to save preference", err);
            this.preferences[key] = previousValue; // Rollback on failure
            this.isSaving = false;
            this.cdr.detectChanges();
          });
        }
      });
  }
}