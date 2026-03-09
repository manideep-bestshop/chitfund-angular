import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // Adjust path as needed

// --- Types ---
interface GroupAvailability {
  chitGroupId: string;
  groupName: string;
  totalAmount: number;
  monthlyAmount: number;
  durationMonths: number;
  startDate: string;
  status: string;
  currentMembers: number;
}

interface UserRequest {
  requestId: string;
  groupName: string;
  monthlyAmount: number;
  requestDate: string;
  status: string;
}

@Component({
  selector: 'app-join-group',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './join-group.html',
  styleUrls: ['./join-group.css']
})
export class JoinGroupComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_BASE_URL = `${environment.apiUrl}/api/GroupRequests`;

  activeTab: 'available' | 'requests' = 'available';
  showModal = false;
  selectedGroup: GroupAvailability | null = null;
  
  availableGroups: GroupAvailability[] = [];
  myRequests: UserRequest[] = [];
  
  loading = true;
  searchTerm = '';
  userId: string | null = null;

  ngOnInit() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      alert("Please log in to view groups.");
      this.router.navigate(['/login']);
      return;
    }

    try {
      // Native JWT decode to extract userId safely
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.userId = payload.userId || payload.sub;
      
      if (this.userId) {
        this.fetchAvailableGroups();
        this.fetchMyRequests();
      }
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }

  get authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  fetchAvailableGroups() {
    this.loading = true;
    this.http.get<GroupAvailability[]>(`${this.API_BASE_URL}/available?userId=${this.userId}`, this.authHeaders)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (data) => this.availableGroups = data,
        error: (err) => console.error("Error fetching groups:", err)
      });
  }

  fetchMyRequests() {
    if (!this.userId) return;
    this.http.get<UserRequest[]>(`${this.API_BASE_URL}/my-requests?userId=${this.userId}`, this.authHeaders)
      .subscribe({
        next: (data) => this.myRequests = data,
        error: (err) => console.error("Error fetching requests:", err)
      });
  }

  handleConfirmJoin() {
    if (!this.selectedGroup || !this.userId) return;

    const payload = {
      chitGroupId: this.selectedGroup.chitGroupId,
      userId: this.userId
    };

    this.http.post(this.API_BASE_URL, payload, this.authHeaders).subscribe({
      next: () => {
        alert("Request sent successfully!");
        this.showModal = false;
        this.activeTab = 'requests';
        this.fetchMyRequests();
        this.fetchAvailableGroups(); // Refresh to remove the joined group
      },
      error: (err) => {
        const msg = err.error?.message || "Failed to send request";
        alert(msg);
      }
    });
  }

  handleJoinClick(group: GroupAvailability) {
    this.selectedGroup = group;
    this.showModal = true;
  }

  // --- Filter Logic ---
  get filteredGroups() {
    if (!this.searchTerm) return this.availableGroups;
    
    const term = this.searchTerm.toLowerCase();
    return this.availableGroups.filter(group => {
      const nameMatch = group.groupName.toLowerCase().includes(term);
      const amountMatch = group.totalAmount.toString().includes(term);
      const monthlyMatch = group.monthlyAmount.toString().includes(term);
      
      return nameMatch || amountMatch || monthlyMatch;
    });
  }
}