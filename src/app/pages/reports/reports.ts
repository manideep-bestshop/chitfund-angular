import { Component, OnInit, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

// --- Interfaces ---
interface ReportData { 
  totalChitGroups: number; activeChitGroups: number; totalMembers: number; 
  totalPayments: number; totalAmount: number; pendingPayments: number; 
  completedAuctions: number; totalCommission: number; 
}
interface TopChitGroup { groupName: string; status: string; totalAmount: number; memberCount: number; }
interface RecentActivity { id: string; type: string; description: string; activity_Time: string; status: string; }
interface FinancialReport { 
  totalCollectedAmount: number; 
  totalCommission: number; 
  pendingPaymentsCount: number; 
  totalPayments: number; 
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [DecimalPipe],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private readonly API_BASE = `${environment.apiUrl}/api/Reports`;

  selectedReportType: 'Summary' | 'Financial' = 'Summary';
  activeReportType: 'Summary' | 'Financial' = 'Summary';
  dateRange = { startDate: '', endDate: '' };
  
  summary: ReportData | null = null;
  topGroups: TopChitGroup[] = [];
  recentActivities: RecentActivity[] = [];
  financial: FinancialReport | null = null;

  loading = false;
  error = '';

  get authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return { 
      headers: new HttpHeaders({ 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }) 
    };
  }

  ngOnInit() {
    this.loadDefaultSummary();
  }

  loadDefaultSummary() {
    this.zone.run(() => {
      this.loading = true;
      this.error = '';
      this.activeReportType = 'Summary';
      this.cdr.detectChanges();
    });

    forkJoin({
      summary: this.http.get<any>(`${this.API_BASE}/dashboard-metrics`, this.authHeaders),
      top: this.http.get<any[]>(`${this.API_BASE}/top-groups`, this.authHeaders),
      recent: this.http.get<any[]>(`${this.API_BASE}/recent-activities`, this.authHeaders)
    }).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.summary = this.mapSummary(res.summary);
          this.topGroups = res.top || [];
          this.recentActivities = res.recent || [];
          this.loading = false;
          this.cdr.detectChanges(); // Force UI update
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error("API Error:", err);
          this.error = err.status === 401 
            ? "Unauthorized: Please login again." 
            : "Failed to load dashboard data.";
          this.loading = false;
          this.cdr.detectChanges(); // Critical fix for the "stuck loading" bug
        });
      }
    });
  }

  handleGenerate() {
    // Exact React Validation
    if (!this.dateRange.startDate || !this.dateRange.endDate) { 
      this.zone.run(() => {
        this.error = 'Please select start and end date'; 
        this.cdr.detectChanges();
      });
      return; 
    }
    
    this.zone.run(() => {
      this.error = '';
      this.activeReportType = this.selectedReportType;
      this.loading = true;
      this.cdr.detectChanges();
    });

    if (this.selectedReportType === 'Summary') {
      this.financial = null;
      const payload = { 
        startDate: this.dateRange.startDate, 
        endDate: this.dateRange.endDate, 
        reportType: 'Summary' 
      };

      this.http.post<any>(`${this.API_BASE}/generate`, payload, this.authHeaders).subscribe({
        next: (res) => {
          this.zone.run(() => {
            this.summary = this.mapSummary(res);
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            console.error("Generate Error:", err);
            this.error = "Failed to generate report. Check dates or connection.";
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.summary = null;
      this.http.get<any>(`${this.API_BASE}/financial-report?startDate=${this.dateRange.startDate}&endDate=${this.dateRange.endDate}`, this.authHeaders).subscribe({
        next: (res) => {
          this.zone.run(() => {
            this.financial = this.mapFinancial(res);
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            console.error("Financial Error:", err);
            this.error = "Failed to load financial data.";
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  // Exact React Export Implementation
  handleExport() {
    let csv = "data:text/csv;charset=utf-8,";
    const date = new Date().toLocaleDateString();

    if (this.activeReportType === 'Summary' && this.summary) {
      csv += `Summary Report (${date})\n\nMetric,Value\n`;
      csv += `Total Groups,${this.summary.totalChitGroups}\nActive Groups,${this.summary.activeChitGroups}\nTotal Members,${this.summary.totalMembers}\n`;
      csv += `Total Amount,${this.summary.totalAmount}\nPending Payments,${this.summary.pendingPayments}\nTotal Commission,${this.summary.totalCommission}\n\n`;
      
      csv += "Top Performing Groups\nGroup Name,Members,Total Amount,Status\n";
      this.topGroups.forEach(g => csv += `${g.groupName},${g.memberCount},${g.totalAmount},${g.status}\n`);
      
      csv += "\nRecent Activities\nType,Description,Date,Status\n";
      this.recentActivities.forEach(a => {
           const d = a.activity_Time ? a.activity_Time.split('T')[0] : '-';
           csv += `${a.type},"${a.description.replace(/"/g, '""')}",${d},${a.status}\n`;
      });
    } else if (this.activeReportType === 'Financial' && this.financial) {
      csv += `Financial Report (${date})\n\nMetric,Value\n`;
      csv += `Total Collected,${this.financial.totalCollectedAmount}\nTotal Commission,${this.financial.totalCommission}\n`;
      csv += `Pending Payments,${this.financial.pendingPaymentsCount}\nTotal Transactions,${this.financial.totalPayments}\n`;
    } else {
      alert("No data to export"); 
      return;
    }

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Report_${this.activeReportType}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  handlePrint() { window.print(); }

  // --- SAFE MAPPERS (Fixes blank values) ---
  mapSummary(data: any): ReportData {
    if (!data) return { totalChitGroups: 0, activeChitGroups: 0, totalMembers: 0, totalPayments: 0, totalAmount: 0, pendingPayments: 0, completedAuctions: 0, totalCommission: 0 };
    const d = Array.isArray(data) ? data[0] : data; // Fallback if API returns array
    return {
      totalChitGroups: d.totalChitGroups ?? d.TotalChitGroups ?? 0,
      activeChitGroups: d.activeChitGroups ?? d.ActiveChitGroups ?? 0,
      totalMembers: d.totalMembers ?? d.TotalMembers ?? 0,
      totalPayments: d.totalPayments ?? d.TotalPayments ?? 0,
      totalAmount: d.totalAmount ?? d.TotalAmount ?? 0,
      pendingPayments: d.pendingPayments ?? d.PendingPayments ?? 0,
      completedAuctions: d.completedAuctions ?? d.CompletedAuctions ?? 0,
      totalCommission: d.totalCommission ?? d.TotalCommission ?? 0
    };
  }

  mapFinancial(data: any): FinancialReport {
    if (!data) return { totalCollectedAmount: 0, totalCommission: 0, pendingPaymentsCount: 0, totalPayments: 0 };
    const d = Array.isArray(data) ? data[0] : data; // Fixes blank financial data if API returns an array
    return {
      totalCollectedAmount: d.totalCollectedAmount ?? d.TotalCollectedAmount ?? 0,
      totalCommission: d.totalCommission ?? d.TotalCommission ?? 0,
      pendingPaymentsCount: d.pendingPaymentsCount ?? d.PendingPaymentsCount ?? 0,
      totalPayments: d.totalPayments ?? d.TotalPayments ?? 0
    };
  }

  getStatusBadgeClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('active') || s.includes('complete')) return 'bg-success';
    if (s.includes('progress')) return 'bg-primary';
    if (s.includes('pending') || s.includes('suspended')) return 'bg-warning text-dark';
    return 'bg-secondary';
  }
}