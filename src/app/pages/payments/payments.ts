import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import * as XLSX from 'xlsx';
import { environment } from '../../../environments/environment';

interface Payment {
  paymentId: string;
  chitMemberId: string;
  chitGroupId: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference?: string;
  status: string;
  memberName: string;
  groupName: string;
  installmentNumber: number;
  isDeleted: boolean;
}

interface AuditLog {
  auditLogId: number | string;
  action: string;       
  username: string;      
  userRole: string;      
  timestamp: string;     
  details: string;       
}

interface GroupOption { chitGroupId: string; groupName: string; }
interface MemberOption { chitMemberId: string; userId: string; userName: string; }
interface InstallmentOption { installmentId: string; installmentNumber: number; amount: number; chitGroupId: string; }

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.css']
})
export class PaymentsComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private zone = inject(NgZone); // <-- 1. INJECT NGZONE

  private readonly API_BASE_URL = `${environment.apiUrl}/api/MemberPayments`;
  private readonly GROUPS_API_URL = `${environment.apiUrl}/api/ChitGroups`;
  private readonly MEMBERS_API_URL = `${environment.apiUrl}/api/ChitMembers`;
  private readonly INSTALLMENTS_API_URL = `${environment.apiUrl}/api/MonthlyInstallments`; 
  private readonly AUDIT_LOGS_API_URL = `${environment.apiUrl}/api/AuditLogs`;

  // Data
  payments: Payment[] = [];
  groups: GroupOption[] = [];
  members: MemberOption[] = [];
  installments: InstallmentOption[] = [];

  // UI State
  loading = true;
  submitting = false;
  showModal = false;
  showDeleteModal = false;
  showHistoryModal = false;
  
  // Feedback
  pageError: string | null = null;
  formError: string | null = null;
  alert: { type: string; message: string } | null = null;
  
  // Actions
  isEditMode = false;
  editingPaymentId: string | null = null;
  deletingPaymentId: string | null = null;

  // History Data
  auditLogs: AuditLog[] = [];
  historyLoading = false;
  historyContext: {member: string, group: string} | null = null;

  // Filters
  filters = { groupName: '', memberName: '', status: '', startDate: '', endDate: '' };

  // Form
  formData = this.getInitialFormState();

  getInitialFormState() {
    return {
      chitGroupId: '', chitMemberId: '', installmentId: '', amount: '',
      paymentDate: new Date().toISOString().split('T')[0], 
      paymentMethod: 'Cash', transactionReference: '', remarks: '', status: 'Completed'
    };
  }

  get authHeaders() {
    const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  ngOnInit() {
    const state = history.state;
    if (state && state.openRecordPaymentModal) {
      this.handleOpenRecordPaymentModal();
    }
    this.fetchPayments();
    this.fetchGroups();
  }

  fetchPayments() {
    this.loading = true;
    this.http.get<Payment[]>(this.API_BASE_URL, this.authHeaders).subscribe({
      next: (res) => {
        this.zone.run(() => { // <-- 2. WRAP IN ZONE.RUN
          this.payments = res;
          this.loading = false;
        });
      },
      error: (err) => {
        this.zone.run(() => { // <-- 2. WRAP IN ZONE.RUN
          this.pageError = err.status === 401 ? 'Unauthorized. Please login again.' : 'Failed to load payments.';
          this.loading = false;
        });
      }
    });
  }

  fetchGroups() {
    this.http.get<GroupOption[]>(`${this.GROUPS_API_URL}/active`, this.authHeaders).subscribe({
      next: (res) => {
        this.zone.run(() => { // <-- 3. WRAP IN ZONE.RUN
          this.groups = res;
        });
      },
      error: (err) => console.error(err)
    });
  }

  handleViewHistory(currentPayment: Payment) {
    this.showHistoryModal = true; 
    this.historyLoading = true; 
    this.auditLogs = []; 
    this.historyContext = { member: currentPayment.memberName, group: currentPayment.groupName };

    this.http.get<any[]>(this.AUDIT_LOGS_API_URL, this.authHeaders).subscribe({
      next: (res) => {
        const targetIds = this.payments.filter(p => p.chitMemberId === currentPayment.chitMemberId).map(p => p.paymentId.toLowerCase());
        
        const logs = (res || []).map(log => {
            const rawDetails = log.details || log.Details || "";
            const action = log.action || log.Action || "Unknown";
            const oldVal = log.oldValues || log.OldValues;
            const newVal = log.newValues || log.NewValues;
            
            let finalDetails = rawDetails;
            if (!finalDetails) {
                if (action.includes('INSERT') || action.includes('Created')) finalDetails = newVal || "Record created";
                else if (action.includes('DELETE')) finalDetails = oldVal ? `Deleted: ${oldVal}` : "Record deleted";
                else if (oldVal && newVal) finalDetails = `Changed: ${oldVal} -> ${newVal}`;
                else finalDetails = "Details updated";
            }

            return {
                auditLogId: log.auditLogId || log.AuditLogId || Math.random(),
                action: action,
                username: log.username || log.Username || log?.user?.username || "System",
                userRole: log.userRole || log.UserRole || "Admin",
                timestamp: log.timestamp || log.Timestamp || new Date().toISOString(),
                details: String(finalDetails),
                recordId: String(log.recordId || log.RecordId || "").toLowerCase()
            };
        }).filter(log => targetIds.includes(log.recordId) || log.details.toLowerCase().includes(currentPayment.memberName.toLowerCase()));

        this.auditLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.pageError = "Failed to load history.";
        this.historyLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getNextPayableInstallmentNumber(memberId: string): number {
    if (!memberId) return 1;
    const memberPayments = this.payments.filter(p => p.chitMemberId === memberId && p.status !== 'Failed' && p.status !== 'Refunded');
    return memberPayments.length === 0 ? 1 : Math.max(...memberPayments.map(p => p.installmentNumber)) + 1;
  }

  handleOpenRecordPaymentModal() {
    this.pageError = null; this.formError = null; this.isEditMode = false; this.editingPaymentId = null;
    this.formData = this.getInitialFormState(); this.showModal = true;
  }

  handleGroupChange(groupId: string) {
    this.formError = null; 
    this.formData.chitGroupId = groupId;
    this.formData.chitMemberId = ''; 
    this.formData.installmentId = ''; 
    this.formData.amount = '';
    
    if (!groupId) { 
        this.members = []; 
        this.installments = []; 
        this.cdr.detectChanges();
        return; 
    }
    
    // Fetch members and installments in parallel
    Promise.all([
        this.http.get<MemberOption[]>(`${this.MEMBERS_API_URL}/group/${groupId}`, this.authHeaders).toPromise(),
        this.http.get<InstallmentOption[]>(`${this.INSTALLMENTS_API_URL}/group/${groupId}`, this.authHeaders).toPromise()
    ]).then(([memRes, instRes]) => {
        this.members = memRes || []; 
        this.installments = instRes || [];
        this.cdr.detectChanges(); // UI Update added here
    }).catch(() => {
        this.formError = "Could not load group details.";
        this.cdr.detectChanges(); // UI Update added here
    });
  }

  handleMemberChange(memberId: string) {
    this.formData.chitMemberId = memberId;
    const nextNum = this.getNextPayableInstallmentNumber(memberId);
    const nextInst = this.installments.find(i => i.installmentNumber === nextNum);
    
    this.formData.installmentId = nextInst?.installmentId || '';
    this.formData.amount = nextInst?.amount.toString() || '';
  }

  async handleEditPayment(payment: Payment) {
    this.isEditMode = true; this.editingPaymentId = payment.paymentId; this.formError = null; this.alert = null;
    const group = this.groups.find(g => g.groupName === payment.groupName);
    
    if(group) {
        await this.handleGroupChange(group.chitGroupId);
        this.formData = {
            chitGroupId: group.chitGroupId, 
            chitMemberId: payment.chitMemberId, 
            installmentId: payment.installmentId,
            amount: payment.amount.toString(), 
            paymentDate: payment.paymentDate.split('T')[0], 
            paymentMethod: payment.paymentMethod,
            transactionReference: payment.transactionReference || '', 
            remarks: '', 
            status: payment.status
        };
        this.showModal = true;
    } else { 
        this.alert = {type: 'danger', message: 'Group data mismatch. Please refresh.'}; 
    }
  }

  handleSubmit() {
    this.submitting = true; this.alert = null; this.formError = null;
    if (!this.formData.chitMemberId || !this.formData.installmentId || !this.formData.amount) {
        this.formError = "Please select a Member."; this.submitting = false; return;
    }
    
    const payload = {
      chitMemberId: this.formData.chitMemberId, installmentId: this.formData.installmentId, amount: parseFloat(this.formData.amount),
      paymentDate: this.formData.paymentDate, paymentMethod: this.formData.paymentMethod, transactionReference: this.formData.transactionReference,
      remarks: this.formData.remarks, status: this.formData.status
    };

    const request = this.isEditMode && this.editingPaymentId 
        ? this.http.put(`${this.API_BASE_URL}/${this.editingPaymentId}`, payload, this.authHeaders)
        : this.http.post(this.API_BASE_URL, payload, this.authHeaders);

    request.subscribe({
        next: () => {
            this.alert = { type: 'success', message: this.isEditMode ? 'Payment updated successfully!' : 'Payment recorded successfully!' };
            this.showModal = false; 
            this.formData = this.getInitialFormState(); 
            this.isEditMode = false; 
            this.cdr.detectChanges(); // UI Update added here
            this.fetchPayments();
        },
        error: (err) => {
            this.formError = err.error?.message || "Failed to save.";
            this.submitting = false;
            this.cdr.detectChanges(); // UI Update added here
        },
        complete: () => {
            this.submitting = false;
            this.cdr.detectChanges(); // UI Update added here
        }
    });
  }

  handleDeleteClick(paymentId: string) { 
      this.deletingPaymentId = paymentId; 
      this.showDeleteModal = true; 
  }

  confirmDelete() {
    if (!this.deletingPaymentId) return;
    this.http.delete(`${this.API_BASE_URL}/${this.deletingPaymentId}`, this.authHeaders).subscribe({
        next: () => {
            this.alert = { type: 'success', message: 'Payment record deleted successfully.' };
            this.showDeleteModal = false;
            this.deletingPaymentId = null;
            this.cdr.detectChanges(); // UI Update added here
            this.fetchPayments();
        },
        error: (err) => {
            this.alert = { type: 'danger', message: err.error?.message || 'Failed to delete payment.' };
            this.showDeleteModal = false;
            this.deletingPaymentId = null;
            this.cdr.detectChanges(); // UI Update added here
        }
    });
  }

  // --- Filtering & Export ---
  get processedPayments() {
    return this.payments.filter(p => {
      const pDate = new Date(p.paymentDate);
      const start = this.filters.startDate ? new Date(this.filters.startDate) : null;
      const end = this.filters.endDate ? new Date(this.filters.endDate) : null;

      return (!this.filters.groupName || p.groupName === this.filters.groupName) &&
             (!this.filters.memberName || p.memberName === this.filters.memberName) &&
             (!this.filters.status || p.status === this.filters.status) &&
             (!start || pDate >= start) &&
             (!end || pDate <= end);
    });
  }

  clearFilters() {
      this.filters = { groupName: '', memberName: '', status: '', startDate: '', endDate: '' };
  }

  get uniqueGroups() { return Array.from(new Set(this.payments.map(p => p.groupName))).sort(); }
  get uniqueMembers() { return Array.from(new Set(this.payments.map(p => p.memberName))).sort(); }
  
  get totalCollected() { return this.processedPayments.reduce((acc, p) => acc + (p.status === 'Completed' ? p.amount : 0), 0); }
  get totalPending() { return this.processedPayments.reduce((acc, p) => acc + (p.status === 'Pending' ? p.amount : 0), 0); }

  handleExportToExcel() {
    const data = this.processedPayments.map(p => ({
        "Member": p.memberName, "Group": p.groupName, "Installment": p.installmentNumber, "Amount": p.amount,
        "Date": new Date(p.paymentDate).toLocaleDateString(), "Method": p.paymentMethod, "Ref": p.transactionReference || '-', "Status": p.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, `Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  getStatusConfig(status: string) {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return { bgColor: '#15803d', label: 'Paid', icon: 'check-circle' };
    if (s === 'pending') return { bgColor: '#ffd900', label: 'Pending', icon: 'clock' };
    if (s === 'failed') return { bgColor: '#ef4444', label: 'Failed', icon: 'x-circle' };
    return { bgColor: '#6ee7b7', label: status, icon: '' };
  }

  getInitials(name: string) {
      return (name || '?').substring(0, 2).toUpperCase();
  }
}