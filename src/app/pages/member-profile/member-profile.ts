import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import * as XLSX from 'xlsx';
import { environment } from '../../../environments/environment'; // <-- IMPORTED ENVIRONMENT

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './member-profile.html',
  styleUrls: ['./member-profile.css']
})

export class MemberProfileComponent implements OnInit {
  private http = inject(HttpClient);

  loading = true;
  activeTab = 'active-groups';
  alertMsg: { type: string, message: string } | null = null;

  // Modals Visibility
  showEditModal = false;
  showPayModal = false;
  showSupportModal = false;

  // Data States
  stats: any = null;
  activeGroups: any[] = [];
  paymentHistory: any[] = [];
  profile: any = {
    fullName: '', email: '', phoneNumber: '', address: '', aadharNumber: '', panNumber: ''
  };

  // Form States
  editFormData = { fullName: '', phoneNumber: '', address: '', aadharNumber: '', panNumber: '' };

  ngOnInit() {
    this.fetchAllData();
  }

  fetchAllData() {
    this.fetchProfile();
    this.fetchStats();
    this.fetchActiveGroups();
    this.fetchPaymentHistory();
  }

  getInitialsAvatar(name: string) {
    const safeName = name || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=0D8ABC&color=fff`;
  }

  fetchProfile() {
    this.http.get<any>(`${environment.apiUrl}/api/Users/profile`).subscribe({
      next: (data) => {
        this.profile = {
          fullName: data.fullName || data.FullName || '',
          email: data.email || data.Email || '',
          phoneNumber: data.phoneNumber || data.PhoneNumber || '',
          address: data.address || data.Address || '',
          aadharNumber: data.aadharNumber || data.AadharNumber || '',
          panNumber: data.panNumber || data.PanNumber || ''
        };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  fetchStats() {
    this.http.get<any>(`${environment.apiUrl}/api/Users/financial-stats`).subscribe(data => this.stats = data);
  }

  fetchActiveGroups() {
    this.http.get<any[]>(`${environment.apiUrl}/api/Users/active-groups`).subscribe(data => {
      // Normalize data to use camelCase consistently
      this.activeGroups = data.map(g => ({
        groupId: g.groupId || g.GroupId,
        groupName: g.groupName || g.GroupName,
        totalValue: g.totalValue || g.TotalValue,
        monthlyAmount: g.monthlyAmount || g.MonthlyAmount,
        status: g.status || g.Status
      }));
    });
  }

  fetchPaymentHistory() {
    this.http.get<any[]>(`${environment.apiUrl}/api/Users/payment-history`).subscribe(data => {
      // Normalize data to use camelCase consistently
      this.paymentHistory = data.map(p => ({
        paymentDate: p.paymentDate || p.PaymentDate,
        groupName: p.groupName || p.GroupName,
        amount: p.amount || p.Amount,
        status: p.status || p.Status,
        paymentMethod: p.paymentMethod || p.PaymentMethod
      }));
    });
  }

  handleEditClick() {
    this.editFormData = { ...this.profile };
    this.showEditModal = true;
  }

  submitProfileEdit() {
    this.http.put(`${environment.apiUrl}/api/Users/profile`, this.editFormData).subscribe({
      next: () => {
        this.alertMsg = { type: 'success', message: 'Profile updated!' };
        this.showEditModal = false;
        this.fetchProfile();
      },
      error: () => this.alertMsg = { type: 'danger', message: 'Update failed.' }
    });
  }

  handleDownloadReport() {
    if (this.paymentHistory.length === 0) return;
    const excelData = this.paymentHistory.map(p => ({
      "Date": new Date(p.paymentDate || p.PaymentDate).toLocaleDateString(),
      "Group": p.groupName || p.GroupName,
      "Amount (₹)": p.amount ?? p.Amount,
      "Status": p.status || p.Status
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `ChitFund_Statement_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}