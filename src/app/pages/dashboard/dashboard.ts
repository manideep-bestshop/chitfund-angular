import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router'; // <-- CRITICAL IMPORT ADDED
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment'; // <-- IMPORTED ENVIRONMENT

// --- Interfaces ---
interface DashboardStats {
  totalUsers: number;
  totalChitGroups: number;
  activeChitGroups: number;
  totalMembers: number;
  totalPayments: number;
  pendingPayments: number;
  totalAuctions: number;
  completedAuctions: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  activity_Time: string;
  status: string;
}

interface WhatsAppAnalytics {
  messageType: string;
  totalSent: number;
  deliveredCount: number;
  readCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // ADDED RouterModule to fix the crashing "View All" button!
  imports: [CommonModule, RouterModule, LucideAngularModule], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private zone = inject(NgZone); // Ensures instant rendering

  loading = true;
  pendingRequestCount = 0;
  recentActivities: RecentActivity[] = [];
  whatsappStats: WhatsAppAnalytics[] = [];
  stats: DashboardStats = {
    totalUsers: 0, totalChitGroups: 0, activeChitGroups: 0, totalMembers: 0,
    totalPayments: 0, pendingPayments: 0, totalAuctions: 0, completedAuctions: 0
  };

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` };
    this.loading = true;

    forkJoin({
     stats: this.http.get<DashboardStats>(`${environment.apiUrl}/api/Reports/dashboard-metrics`, { headers }).pipe(
        catchError(err => { console.error('Stats API Failed', err); return of(this.stats); })
      ),
      activities: this.http.get<RecentActivity[]>(`${environment.apiUrl}/api/Reports/recent-activities`, { headers }).pipe(
        catchError(err => { console.error('Activities API Failed', err); return of([]); })
      ),
      pending: this.http.get<any[]>(`${environment.apiUrl}/api/GroupRequests/admin/pending`, { headers }).pipe(
        catchError(err => { console.error('Pending API Failed', err); return of([]); })
      ),
      whatsapp: this.http.get<WhatsAppAnalytics[]>(`${environment.apiUrl}/api/WhatsApp/whatsapp-analytics`, { headers }).pipe(
        catchError(err => { console.error('WhatsApp API Failed', err); return of([]); })
      )
    })
    .pipe(
      finalize(() => {
        // Guaranteed to turn off the spinner
        this.zone.run(() => { this.loading = false; });
      })
    )
    .subscribe(res => {
      // Guaranteed to update the HTML instantly
      this.zone.run(() => {
        this.stats = res.stats;
        this.recentActivities = res.activities;
        this.pendingRequestCount = Array.isArray(res.pending) ? res.pending.length : 0;
        this.whatsappStats = res.whatsapp;
      });
    });
  }

  // --- Analytics Logic ---
  get totalWA() { return this.whatsappStats.reduce((acc, curr) => acc + (curr.totalSent || 0), 0); }
  get totalDelivered() { return this.whatsappStats.reduce((acc, curr) => acc + (curr.deliveredCount || 0), 0); }
  get totalRead() { return this.whatsappStats.reduce((acc, curr) => acc + (curr.readCount || 0), 0); }
  
  get readRate() { return this.totalWA > 0 ? Math.round((this.totalRead / this.totalWA) * 100) : 0; }
  get deliveryRate() { return this.totalWA > 0 ? Math.round((this.totalDelivered / this.totalWA) * 100) : 0; }

  // --- Navigation Handlers ---
  handleCreateGroup() { this.router.navigate(['/members'], { state: { openCreateModal: true } }); }
  handlePayment() { this.router.navigate(['/payments'], { state: { openRecordPaymentModal: true } }); }
  handleAuction() { this.router.navigate(['/auctions'], { state: { openScheduleAuctionModal: true } }); }

  // --- Visual Helpers ---
  getStatusConfig(status: string) {
    const s = (status || '').toLowerCase();
    if (s.includes('active')) return { bg: '#1580ec', icon: 'activity' };
    if (s.includes('complete')) return { bg: '#15803d', icon: 'check-circle' };
    if (s.includes('progress')) return { bg: '#f57004', icon: 'play-circle' };
    if (s.includes('pending')) return { bg: '#facc15', icon: 'clock' };
    return { bg: '#1580ec', icon: 'activity' }; 
  }
}