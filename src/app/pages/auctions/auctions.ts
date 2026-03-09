import { Component, OnInit, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import * as XLSX from 'xlsx';
import { environment } from '../../../environments/environment';
// Import the component so it can be used in the template
import { LiveAuctionComponent } from './live-auction/live-auction'; 

interface Auction {
  auctionId: string; chitGroupId: string; installmentId: string;
  auctionDate: string; baseAmount: number; highestBidAmount?: number;
  winnerChitMemberId?: string; status: string; groupName: string;
  installmentNumber: number; winnerName?: string;
}

interface ChitGroup { chitGroupId: string; groupName: string; groupCode: string; }
interface Installment { installmentId: string; installmentNumber: number; amount: number; }

@Component({
  selector: 'app-auctions',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LiveAuctionComponent],
  templateUrl: './auctions.html',
  styleUrls: ['./auctions.css']
})
export class AuctionsComponent implements OnInit {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private readonly BASE_URL = `${environment.apiUrl}/api`;

  // Data
  auctions: Auction[] = [];
  chitGroups: ChitGroup[] = [];
  installments: Installment[] = [];

  // UI State
  loading = true;
  showModal = false;
  editingAuction: Auction | null = null;
  activeAuctionId: string | null = null;
  alert: { type: string; message: string } | null = null;

  // Filters
  searchQuery = "";
  fromDate = "";
  toDate = "";

  // Form
  formData = this.getInitialFormState();

  getInitialFormState() {
    return {
      chitGroupId: '', installmentId: '', 
      auctionDate: new Date().toISOString().slice(0, 16), 
      baseAmount: '', highestBidAmount: '', status: 'Scheduled'
    };
  }

  get isAdminOrAgent() {
    try {
      const role = localStorage.getItem('userRole');
      return role === "Admin" || role === "Agent";
    } catch { return false; }
  }

  get authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    this.fetchAuctions();
    this.fetchChitGroups();
  }

  fetchAuctions() {
    this.loading = true;
    this.http.get<Auction[]>(`${this.BASE_URL}/Auctions`).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.auctions = res;
          this.loading = false;
        });
      },
      error: () => this.zone.run(() => {
        this.alert = { type: 'danger', message: 'Error loading auctions' };
        this.loading = false;
      })
    });
  }

  fetchChitGroups() {
    this.http.get<ChitGroup[]>(`${this.BASE_URL}/ChitGroups`).subscribe(res => this.chitGroups = res);
  }

  handleGroupChange() {
    const groupId = this.formData.chitGroupId;
    this.formData.installmentId = '';
    this.formData.baseAmount = '';
    
    if (!groupId) { this.installments = []; return; }

    this.http.get<Installment[]>(`${this.BASE_URL}/MonthlyInstallments/group/${groupId}`).subscribe({
      next: (data) => {
        this.installments = data;
        const usedIds = this.auctions.filter(a => a.chitGroupId === groupId && a.status !== 'Cancelled').map(a => a.installmentId);
        const available = data.filter(inst => !usedIds.includes(inst.installmentId)).sort((a, b) => a.installmentNumber - b.installmentNumber);

        if (available.length > 0) {
          this.formData.installmentId = available[0].installmentId;
          this.formData.baseAmount = available[0].amount.toString();
        } else {
          this.alert = { type: 'warning', message: 'All installments auctioned.' };
        }
        this.cdr.detectChanges();
      }
    });
  }

  handleShowModal(auction?: Auction) {
    this.alert = null;
    if (auction) {
      this.editingAuction = auction;
      this.formData = {
        chitGroupId: auction.chitGroupId,
        installmentId: auction.installmentId,
        auctionDate: new Date(auction.auctionDate).toISOString().slice(0, 16),
        baseAmount: auction.baseAmount.toString(),
        highestBidAmount: auction.highestBidAmount?.toString() || '',
        status: auction.status
      };
      this.http.get<Installment[]>(`${this.BASE_URL}/MonthlyInstallments/group/${auction.chitGroupId}`).subscribe(res => this.installments = res);
    } else {
      this.editingAuction = null;
      this.formData = this.getInitialFormState();
    }
    this.showModal = true;
  }

  handleSubmit() {
    const payload = this.editingAuction 
      ? { auctionDate: this.formData.auctionDate, highestBidAmount: this.formData.highestBidAmount ? Number(this.formData.highestBidAmount) : null, status: this.formData.status }
      : { chitGroupId: this.formData.chitGroupId, installmentId: this.formData.installmentId, auctionDate: this.formData.auctionDate, baseAmount: Number(this.formData.baseAmount) };

    const request = this.editingAuction
      ? this.http.put(`${this.BASE_URL}/Auctions/${this.editingAuction.auctionId}`, payload)
      : this.http.post(`${this.BASE_URL}/Auctions`, payload);

    request.subscribe({
      next: () => {
        this.zone.run(() => {
          this.alert = { type: 'success', message: 'Operation successful' };
          this.showModal = false;
          this.fetchAuctions();
        });
      },
      error: () => this.zone.run(() => this.alert = { type: 'danger', message: 'Operation failed' })
    });
  }

  handleDelete(id: string) {
    if (!confirm("Delete this auction?")) return;
    this.http.delete(`${this.BASE_URL}/Auctions/${id}`).subscribe({
      next: () => this.zone.run(() => { this.alert = { type: 'success', message: 'Deleted' }; this.fetchAuctions(); })
    });
  }

  handleCloseAuction(id: string) {
    if (!confirm("FORCE CLOSE this auction?")) return;
    this.http.post(`${this.BASE_URL}/Auctions/${id}/close`, {}, this.authHeaders).subscribe({
      next: () => this.zone.run(() => { this.alert = { type: 'success', message: 'Auction closed.' }; this.fetchAuctions(); })
    });
  }

  get filteredAuctions() {
    return this.auctions.filter(a => {
      const matchesSearch = !this.searchQuery || 
        a.groupName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        a.winnerName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        a.status.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const dateOnly = a.auctionDate.slice(0, 10);
      const matchesFrom = !this.fromDate || dateOnly >= this.fromDate;
      const matchesTo = !this.toDate || dateOnly <= this.toDate;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }

  handleExportExcel() {
    const data = this.filteredAuctions.map(a => ({
      "Group": a.groupName, "Installment": a.installmentNumber, "Date": new Date(a.auctionDate).toLocaleString(),
      "Base": a.baseAmount, "Highest": a.highestBidAmount || 0, "Winner": a.winnerName || "N/A", "Status": a.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auctions");
    XLSX.writeFile(workbook, `Auctions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  getStatusConfig(status: string) {
    const s = status.toLowerCase();
    if (s.includes('scheduled') || s.includes('pending')) return { bg: '#facc15', label: 'Scheduled', icon: 'clock' };
    if (s.includes('progress') || s === 'active') return { bg: '#f57004', label: 'In Progress', icon: 'play-circle' };
    if (s === 'completed') return { bg: '#15803d', label: 'Completed', icon: 'check-circle' };
    if (s === 'cancelled') return { bg: '#ef4444', label: 'Cancelled', icon: 'x-circle' };
    return { bg: '#1580ec', label: status, icon: 'play-circle' };
  }

  getInstallmentText() {
    if (!this.formData.installmentId) return "Waiting for Group...";
    const inst = this.installments.find(i => i.installmentId === this.formData.installmentId);
    return inst ? `Installment #${inst.installmentNumber} (₹${inst.amount})` : "Loading...";
  }

  enterLiveMode(id: string) { this.activeAuctionId = id; }

  // New Helper for HTML conditional
  getActiveAuction() {
    return this.auctions.find(a => a.auctionId === this.activeAuctionId);
  }
}