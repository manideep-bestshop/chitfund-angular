import { Component, OnInit, inject, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { filter, Subscription } from 'rxjs';

interface ChitGroup {
  chitGroupId: string; groupName: string; groupCode: string; totalAmount: number; monthlyAmount: number;
  durationMonths: number; commissionPercentage: number; startDate: string; endDate: string; status: string;
  description?: string; memberCount: number; completedInstallments: number; isArchived: boolean;
}

interface Member {
  chitMemberId: string; chitGroupId: string; userId: string; joinDate: string; isActive: boolean;
  userName: string; groupName: string; userPhoneNumber?: string; userEmail?: string;
  isactive?: boolean; 
}

interface UserOption { userId: string; firstName: string; lastName: string; email: string; }

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chit-groups.html',
  styleUrls: ['./chit-groups.css']
})
export class MembersComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone); 
  private readonly API_BASE = `${environment.apiUrl}/api`;
  private routerSub!: Subscription;

  viewMode: 'list' | 'detail' = 'list';
  loading = true;
  searchTerm = '';
  pendingCount = 0;
  showInactiveMembers = true;
  showInactiveGroups = true;

  groups: ChitGroup[] = [];
  members: Member[] = [];
  availableUsers: UserOption[] = [];
  selectedGroup: ChitGroup | null = null;
  editingGroup: ChitGroup | null = null;
  groupToDelete: string | null = null;
  alert: { type: string; message: string } | null = null;
  groupErrors: Record<string, string> = {};

  showGroupModal = false;
  showMemberModal = false;
  showDeleteGroupModal = false;

  groupFormData = {
    groupName: '', groupCode: '', totalAmount: '', monthlyAmount: '',
    durationMonths: '', commissionPercentage: '', startDate: '', description: ''
  };
  memberFormData = { userId: '' };

  get authHeaders() {
    const token = localStorage.getItem("jwtToken");
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    // SOLUTION: Force a refresh every time the navigation ends on this route
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.refreshAllData();
    });

    // Initial load call
    this.refreshAllData();

    const state = history.state;
    if (state && state.openCreateModal) {
      this.openCreateGroupModal();
    }
  }

  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  refreshAllData() {
    this.zone.run(() => {
      this.loading = true;
      this.viewMode = 'list';
      this.fetchGroups();
      this.fetchPendingCount();
      this.fetchUsers();
    });
  }

  fetchGroups() {
    this.http.get<ChitGroup[]>(`${this.API_BASE}/ChitGroups`, this.authHeaders).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.groups = res;
          this.loading = false;
          this.cdr.detectChanges(); // Final push for UI update
        });
      },
      error: () => this.zone.run(() => this.loading = false)
    });
  }

  fetchGroupMembers(groupId: string) {
    this.http.get<Member[]>(`${this.API_BASE}/chitmembers/group/${groupId}`, this.authHeaders).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.members = res;
          this.cdr.detectChanges();
        });
      }
    });
  }

  fetchUsers() {
    this.http.get<UserOption[]>(`${this.API_BASE}/Users`, this.authHeaders).subscribe({
      next: (res) => this.zone.run(() => {
        this.availableUsers = res;
        this.cdr.detectChanges();
      })
    });
  }

  fetchPendingCount() {
    this.http.get<any[]>(`${this.API_BASE}/GroupRequests/admin/pending`, this.authHeaders).subscribe({
      next: (res) => this.zone.run(() => {
        this.pendingCount = res.length;
        this.cdr.detectChanges();
      })
    });
  }
  
  handleGroupSubmit() {
    if (!this.validateGroupForm()) return;

    const payload = { 
      ...this.groupFormData, 
      totalAmount: Number(this.groupFormData.totalAmount), 
      monthlyAmount: Number(this.groupFormData.monthlyAmount),
      durationMonths: Number(this.groupFormData.durationMonths), 
      commissionPercentage: Number(this.groupFormData.commissionPercentage)
    };

    if (this.editingGroup) {
      this.http.put(`${this.API_BASE}/ChitGroups/${this.editingGroup.chitGroupId}`, payload, this.authHeaders).subscribe({
        next: () => {
          this.zone.run(() => {
            this.alert = { type: 'success', message: 'Group updated successfully!' };
            this.showGroupModal = false;
            this.fetchGroups();
          });
        }
      });
    } else {
      const token = localStorage.getItem("jwtToken");
      const decoded = JSON.parse(atob(token!.split(".")[1]));
      this.http.post(`${this.API_BASE}/ChitGroups`, { createChitGroupDto: payload, creatorId: decoded.userId }, this.authHeaders).subscribe({
        next: () => {
          this.zone.run(() => {
            this.alert = { type: 'success', message: 'Group created successfully!' };
            this.showGroupModal = false;
            this.fetchGroups();
          });
        }
      });
    }
  }

  handleCardClick(group: ChitGroup) {
    this.selectedGroup = group;
    this.viewMode = 'detail';
    this.searchTerm = '';
    this.fetchGroupMembers(group.chitGroupId);
  }

  validateGroupForm() {
    const errors: Record<string, string> = {};
    const total = Number(this.groupFormData.totalAmount);
    const monthly = Number(this.groupFormData.monthlyAmount);
    const duration = Number(this.groupFormData.durationMonths);
    const commission = Number(this.groupFormData.commissionPercentage);

    if (!this.groupFormData.groupName.trim()) errors['groupName'] = 'Group name is required';
    if (!this.groupFormData.groupCode.trim()) errors['groupCode'] = 'Group code is required';
    if (total <= 0) errors['totalAmount'] = 'Total amount must be greater than 0';
    if (monthly <= 0) errors['monthlyAmount'] = 'Monthly amount must be greater than 0';
    if (duration <= 0) errors['durationMonths'] = 'Duration must be greater than 0';
    if (commission < 0 || commission > 100) errors['commissionPercentage'] = 'Commission must be 0-100';

    if (monthly > 0 && duration > 0 && total !== (monthly * duration)) {
      errors['totalAmount'] = `Total must equal Monthly × Duration (${monthly * duration})`;
    }

    if (!this.groupFormData.startDate) errors['startDate'] = 'Start date is required';

    this.groupErrors = errors;
    return Object.keys(errors).length === 0;
  }

  openEditGroupModal(event: Event, group: ChitGroup) {
    event.stopPropagation();
    this.editingGroup = group;
    this.groupFormData = {
      groupName: group.groupName, groupCode: group.groupCode,
      totalAmount: group.totalAmount.toString(), monthlyAmount: group.monthlyAmount.toString(),
      durationMonths: group.durationMonths.toString(), commissionPercentage: group.commissionPercentage.toString(),
      startDate: group.startDate.split('T')[0], description: group.description || ''
    };
    this.showGroupModal = true;
  }

  openCreateGroupModal() {
    this.editingGroup = null;
    this.groupFormData = {
      groupName: '', groupCode: '', totalAmount: '', monthlyAmount: '',
      durationMonths: '', commissionPercentage: '', startDate: '', description: ''
    };
    this.showGroupModal = true;
  }

  toggleGroupDeactivation(event: Event, group: ChitGroup) {
    event.stopPropagation();
    const newStatus = group.status === 'Active' ? 'Suspended' : 'Active';
    this.http.patch(`${this.API_BASE}/ChitGroups/${group.chitGroupId}/status`, JSON.stringify(newStatus), {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem("jwtToken")}` })
    }).subscribe(() => this.zone.run(() => this.fetchGroups()));
  }

  confirmDeleteGroup() {
    if (!this.groupToDelete) return;
    this.http.delete(`${this.API_BASE}/ChitGroups/${this.groupToDelete}`, this.authHeaders).subscribe({
      next: () => {
        this.zone.run(() => {
          this.alert = { type: 'success', message: 'Group deleted.' };
          this.showDeleteGroupModal = false;
          this.fetchGroups();
        });
      }
    });
  }

  toggleMemberStatus(memberId: string) {
    this.http.put(`${this.API_BASE}/chitmembers/${memberId}/toggle-status`, {}, this.authHeaders)
      .subscribe(() => this.zone.run(() => this.fetchGroupMembers(this.selectedGroup!.chitGroupId)));
  }

  handleDeleteMember(memberId: string) {
    if (!window.confirm("Remove this member from the group?")) return;
    this.http.delete(`${this.API_BASE}/chitmembers/${memberId}`, this.authHeaders).subscribe({
      next: () => {
        this.zone.run(() => {
          this.alert = { type: 'success', message: 'Member removed successfully.' };
          this.fetchGroupMembers(this.selectedGroup!.chitGroupId);
        });
      }
    });
  }

  handleAddMember() {
    this.http.post(`${this.API_BASE}/chitmembers`, { chitGroupId: this.selectedGroup?.chitGroupId, userId: this.memberFormData.userId }, this.authHeaders)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.alert = { type: 'success', message: 'Member enrolled!' };
            this.showMemberModal = false;
            this.fetchGroupMembers(this.selectedGroup!.chitGroupId);
          });
        }
      });
  }

  getProgress(start: string, duration: number) {
    if (!start) return { percentage: 0, elapsed: 0 };
    const startDate = new Date(start);
    const today = new Date();
    let months = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
    const elapsed = Math.max(0, Math.min(months, duration));
    const percentage = Math.round((elapsed / duration) * 100);
    return { percentage, elapsed };
  }

  get displayedGroups() {
    return this.groups.filter(g => {
      const matchesSearch = g.groupName.toLowerCase().includes(this.searchTerm.toLowerCase()) || g.groupCode.toLowerCase().includes(this.searchTerm.toLowerCase());
      const isInactive = g.status === 'Cancelled' || g.status === 'Suspended';
      return matchesSearch && (this.showInactiveGroups || !isInactive);
    });
  }

  get displayedMembers() {
    return this.members.filter(m => {
      const matchesSearch = m.userName?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const statusValue = m.isActive !== undefined ? m.isActive : m.isactive;
      return matchesSearch && (this.showInactiveMembers || statusValue !== false);
    });
  }

  getStatusVariant(status: string) {
    switch (status) {
      case 'Active': return 'primary';
      case 'Suspended': return 'warning';
      case 'Cancelled': return 'danger';
      case 'Completed': return 'success';
      default: return 'secondary';
    }
  }

  navigateRequests() { this.router.navigate(['/AdminRequestsPage']); }
}