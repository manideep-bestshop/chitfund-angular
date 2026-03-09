import { Component, OnInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface User {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadharNumber?: string;
  panNumber?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
  userRole: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef); // <-- Injected to force instant UI updates
  private API_BASE_URL = environment.apiUrl;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  users: User[] = [];
  allUsers: User[] = [];
  loading = true;
  showModal = false;
  editingUser: User | null = null;
  
  searchQuery = '';
  filterRole = 'All';
  filterStatus = 'All';
  
  errors: { [key: string]: string } = {};
  modalError: string | null = null;
  alert: { type: string; message: string } | null = null;

  // --- Bulk Action States ---
  selectedUserIds = new Set<string>();
  isProcessingBulk = false;
  isImporting = false;
  showBulkDropdown = false;

  formData: any = {
    username: '', email: '', password: '', firstName: '', lastName: '',
    phoneNumber: '', address: '', city: '', state: '', pincode: '',
    aadharNumber: '', panNumber: '', userRole: 'Member'
  };

  ngOnInit() {
    this.fetchUsers();
  }

  handleSearchKey(e: KeyboardEvent) {
    if (e.key === 'Enter') this.fetchUsers();
  }

  onFilterChange() {
    this.applyFilters(this.allUsers);
  }

  applyFilters(data: User[]) {
    let filtered = data;
    if (this.filterRole !== 'All') filtered = filtered.filter(u => u.userRole === this.filterRole);
    if (this.filterStatus === 'Active') filtered = filtered.filter(u => u.isActive === true);
    else if (this.filterStatus === 'Inactive') filtered = filtered.filter(u => u.isActive === false);
    
    this.users = filtered;
    this.selectedUserIds.clear(); 
  }

  fetchUsers() {
    this.loading = true;
    
    // Create a timestamp to trick the browser into treating this as a brand new request
    const timestamp = new Date().getTime(); 

    const url = this.searchQuery.trim()
      ? `${this.API_BASE_URL}/api/Users/search?query=${this.searchQuery}&t=${timestamp}`
      : `${this.API_BASE_URL}/api/Users?t=${timestamp}`; // <-- Added timestamp here
    
    this.http.get<User[]>(url).subscribe({
      next: (data) => {
        this.allUsers = data;
        this.applyFilters(data);
        this.loading = false;
        this.cdr.detectChanges(); // <-- FORCE UI UPDATE INSTANTLY
      },
      error: () => {
        this.alert = { type: 'danger', message: 'Error fetching users' };
        this.loading = false;
        this.cdr.detectChanges(); // <-- FORCE UI UPDATE INSTANTLY
      }
    });
  }

  // Sanitizes input on the fly
  onInputChange(field: string, value: string) {
    let finalValue = value;
    if (field === 'phoneNumber') finalValue = value.replace(/\D/g, '').slice(0, 15);
    else if (field === 'pincode') finalValue = value.replace(/\D/g, '').slice(0, 6);
    else if (field === 'aadharNumber') finalValue = value.replace(/\D/g, '').slice(0, 12);
    else if (field === 'panNumber') finalValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    
    this.formData[field] = finalValue;
    if (this.errors[field]) this.errors[field] = '';
    if (this.modalError) this.modalError = null;
  }

  validateForm() {
    const newErrors: { [key: string]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/; 

    if (!this.formData.username.trim()) newErrors['username'] = "Username is required.";
    if (!this.formData.firstName.trim()) newErrors['firstName'] = "First Name is required.";
    if (!this.formData.lastName.trim()) newErrors['lastName'] = "Last Name is required.";
    if (!this.formData.email.trim()) newErrors['email'] = "Email is required.";
    else if (!emailRegex.test(this.formData.email)) newErrors['email'] = "Invalid email.";
    
    if (this.formData.phoneNumber && this.formData.phoneNumber.length < 10) newErrors['phoneNumber'] = "Phone min 10 digits.";
    if (this.formData.pincode && this.formData.pincode.length !== 6) newErrors['pincode'] = "Pincode must be 6 digits.";
    if (this.formData.aadharNumber && this.formData.aadharNumber.length !== 12) newErrors['aadharNumber'] = "Aadhar must be 12 digits.";
    if (this.formData.panNumber && !panRegex.test(this.formData.panNumber)) newErrors['panNumber'] = "Invalid PAN format.";

    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  handleShowModal(user?: User) {
    this.errors = {};
    this.modalError = null;
    if (user) {
      this.editingUser = user;
      this.formData = { 
        ...user, password: '', phoneNumber: user.phoneNumber || '', 
        address: user.address || '', city: user.city || '', state: user.state || '', 
        pincode: user.pincode || '', aadharNumber: user.aadharNumber || '', panNumber: user.panNumber || '' 
      };
    } else {
      this.editingUser = null;
      this.formData = { username: '', email: '', password: '', firstName: '', lastName: '', phoneNumber: '', address: '', city: '', state: '', pincode: '', aadharNumber: '', panNumber: '', userRole: 'Member' };
    }
    this.showModal = true;
  }

  handleCloseModal() {
    this.showModal = false;
    this.editingUser = null;
  }

  handleSubmit() {
    if (!this.validateForm()) return;
    
    const method = this.editingUser ? 'put' : 'post';
    const url = this.editingUser ? `${this.API_BASE_URL}/api/Users/${this.editingUser.userId}` : `${this.API_BASE_URL}/api/Users`;
    const payload = { ...this.formData };
    if (!this.editingUser) payload.password = ""; 

    this.http.request(method, url, { body: payload }).subscribe({
      next: () => {
        this.alert = { type: 'success', message: this.editingUser ? 'User updated' : 'User created' };
        this.handleCloseModal();
        this.fetchUsers();
      },
      error: (err) => {
        this.modalError = err.error?.message || err.error?.title || "An unexpected error occurred.";
      }
    });
  }

  // --- Individual Actions ---
  handleToggle(userId: string) {
    this.http.put(`${this.API_BASE_URL}/api/Users/ToggleUser/${userId}`, {}).subscribe({
      next: () => {
        this.alert = { type: 'success', message: 'User status updated' };
        this.fetchUsers();
      },
      error: () => this.alert = { type: 'danger', message: 'Error toggling status' }
    });
  }

  handleHardDelete(user: User) {
    if (user.isActive) {
        this.alert = { type: 'warning', message: '⚠️ Denied: Deactivate user first.' };
        return;
    }
    if (!window.confirm(`PERMANENTLY delete ${user.username}?`)) return;
    
    this.http.delete(`${this.API_BASE_URL}/api/Users/hard/${user.userId}`).subscribe({
      next: () => {
        this.alert = { type: 'success', message: 'User deleted' };
        this.fetchUsers();
      },
      error: () => this.alert = { type: 'danger', message: 'Error deleting user' }
    });
  }

  handleResetPassword(user: User) {
      this.http.put(`${this.API_BASE_URL}/api/Users/${user.userId}/reset-password`, {}).subscribe({
        next: () => this.alert = { type: 'success', message: 'Password reset. Email sent.' },
        error: () => this.alert = { type: 'danger', message: 'Error resetting password' }
      });
  }

  // --- BULK LOGIC ---
  get isAllSelected() {
    return this.selectedUserIds.size === this.users.length && this.users.length > 0;
  }

  toggleSelectAll() {
    if (this.isAllSelected) {
        this.selectedUserIds.clear();
    } else {
        this.users.forEach(u => this.selectedUserIds.add(u.userId));
    }
  }

  toggleSelectUser(userId: string) {
    if (this.selectedUserIds.has(userId)) {
        this.selectedUserIds.delete(userId);
    } else {
        this.selectedUserIds.add(userId);
    }
  }

  async handleBulkToggleStatus() {
    if (this.selectedUserIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to toggle the status of ${this.selectedUserIds.size} users?`)) return;

    this.isProcessingBulk = true;
    this.alert = null;
    let successCount = 0;
    
    const ids = Array.from(this.selectedUserIds);
    for (const userId of ids) {
        try {
            await firstValueFrom(this.http.put(`${this.API_BASE_URL}/api/Users/ToggleUser/${userId}`, {}));
            successCount++;
        } catch (err) { console.error(`Failed to toggle ${userId}`, err); }
    }

    this.isProcessingBulk = false;
    this.selectedUserIds.clear();
    this.showBulkDropdown = false;
    this.alert = { type: 'success', message: `Successfully updated status for ${successCount} users.` };
    this.fetchUsers();
  }

  async handleBulkDelete() {
    if (this.selectedUserIds.size === 0) return;
    if (!window.confirm(`⚠️ PERMANENTLY delete ${this.selectedUserIds.size} selected users?\n\nNote: Active users or users tied to ChitGroups will be skipped.`)) return;

    this.isProcessingBulk = true;
    this.alert = null;
    let successCount = 0;
    let failCount = 0;
    
    const ids = Array.from(this.selectedUserIds);
    for (const userId of ids) {
        try {
            await firstValueFrom(this.http.delete(`${this.API_BASE_URL}/api/Users/hard/${userId}`));
            successCount++;
        } catch (err) { failCount++; }
    }

    this.isProcessingBulk = false;
    this.selectedUserIds.clear();
    this.showBulkDropdown = false;

    if (failCount === 0) {
        this.alert = { type: 'success', message: `Successfully deleted ${successCount} users.` };
    } else {
        this.alert = { type: 'warning', message: `Deleted ${successCount} users. ${failCount} failed (likely active or in a group).` };
    }
    this.fetchUsers();
  }

  handleBulkImport(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    this.isImporting = true;
    this.alert = null;

    this.http.post<any>(`${this.API_BASE_URL}/api/Users/bulk-import`, formData).subscribe({
      next: (result) => {
        // Extract metrics (handles different common backend naming conventions)
        const successCount = result.successCount || 0;
        const failedCount = result.failureCount || result.failedCount || (result.errors ? result.errors.length : 0);

        // Customize the alert based on if any rows failed
        if (failedCount > 0) {
            this.alert = { 
                type: 'warning', 
                message: `Import complete: ${successCount} users added successfully, ${failedCount} rows failed.` 
            };
        } else {
            this.alert = { 
                type: 'success', 
                message: `Successfully imported all ${successCount} users.` 
            };
        }

        this.isImporting = false;
        if (this.fileInput) this.fileInput.nativeElement.value = '';
        
        // Force the UI to show the alert message instantly
        this.cdr.detectChanges();
        
        // Fetch the fresh list of users from the database
        this.fetchUsers();
      },
      error: (err) => {
        // Handle 400 Bad Request text responses from your .NET backend
        let errorMessage = "Error during bulk import.";
        if (typeof err.error === 'string') errorMessage = err.error;
        else if (err.error?.message) errorMessage = err.error.message;

        this.alert = { type: 'danger', message: errorMessage };
        this.isImporting = false;
        if (this.fileInput) this.fileInput.nativeElement.value = '';
        
        // Force the UI to show the error instantly
        this.cdr.detectChanges();
      }
    });
  }

  // --- UI Helpers ---
  getInitials(f: string, l: string) {
    return `${f?.charAt(0) || ''}${l?.charAt(0) || ''}`.toUpperCase();
  }

  getRandomColor(name: string) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return colors[(name?.length || 0) % colors.length];
  }
}