import { Component, OnInit, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment';

interface AdminRequest {
  requestId: string;
  chitGroupId: string;
  userId: string;
  memberName: string;
  memberId: string;
  kycStatus: string;
  groupName: string;
  monthlyAmount: number;
  requestDate: string;
  avatar: string;
  status?: string;
}

type ActionType = 'approve' | 'reject' | null;

@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './admin-requests.html',
  styleUrls: ['./admin-requests.css']
})
export class AdminRequestsComponent implements OnInit {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private readonly API_BASE_URL = `${environment.apiUrl}/api/GroupRequests`;

  activeTab: 'pending' | 'history' = 'pending';
  selectedRequest: AdminRequest | null = null;
  actionType: ActionType = null;
  
  requests: AdminRequest[] = [];
  historyList: AdminRequest[] = [];
  loading: boolean = true;

  get authHeaders() {
    const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.loading = true;
    const endpoint = this.activeTab === 'pending' ? 'admin/pending' : 'admin/history';
    
    this.http.get<AdminRequest[]>(`${this.API_BASE_URL}/${endpoint}`, this.authHeaders).subscribe({
      next: (res) => {
        this.zone.run(() => {
          if (this.activeTab === 'pending') this.requests = res;
          else this.historyList = res;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error("Fetch error:", err);
        this.zone.run(() => this.loading = false);
      }
    });
  }

  switchTab(tab: 'pending' | 'history') {
    this.activeTab = tab;
    this.fetchData();
  }

  handleAction(req: AdminRequest, type: ActionType) {
    this.selectedRequest = req;
    this.actionType = type;
  }

  confirmAction() {
    if (!this.selectedRequest || !this.actionType) return;
    
    this.http.post(`${this.API_BASE_URL}/admin/${this.selectedRequest.requestId}/${this.actionType}`, {}, this.authHeaders).subscribe({
      next: () => {
        this.zone.run(() => {
          // Optimistic Update
          this.requests = this.requests.filter(r => r.requestId !== this.selectedRequest?.requestId);
          this.selectedRequest = null;
          this.actionType = null;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        alert(error.error?.message || "Operation failed");
      }
    });
  }

  // UI Helpers
  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
      : name.slice(0, 2).toUpperCase();
  }

  getRandomColor(name: string): string {
    if (!name) return '#6366f1';
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    return colors[name.length % colors.length];
  }
}