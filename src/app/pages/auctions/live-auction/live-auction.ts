import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Component as NgComponent } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../../environments/environment';

interface BidLog {
  amount: number;
  bidderName: string;
  time: string;
}

@NgComponent({
  selector: 'app-live-auction',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './live-auction.html',
  styleUrls: ['./live-auction.css']
})
export class LiveAuctionComponent implements OnInit, OnDestroy {
  @Input() auctionId!: string;
  @Input() initialAmount: number = 0;
  @Input() groupName: string = '';
  @Input() chitGroupId: string = '';
  @Output() onClose = new EventEmitter<void>();

  @ViewChild('historyEnd') historyEndRef!: ElementRef;

  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private pollingInterval: any;

  currentBid: number = 0;
  bidAmount: string = '';
  bidHistory: BidLog[] = [];
  errorMsg: string = '';
  loading: boolean = false;
  myMemberId: string | null = null;
  auctionClosed: boolean = false;

  get myName(): string {
    const stored = localStorage.getItem('user');
    if (!stored) return 'Guest';
    try {
      const p = JSON.parse(stored);
      return p.username || p.firstName || 'Member';
    } catch { return 'Member'; }
  }

  get isAdmin(): boolean {
    const role = localStorage.getItem('userRole');
    return role?.toLowerCase() === 'admin';
  }

  ngOnInit() {
    this.currentBid = this.initialAmount;
    this.fetchMemberId();
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  private get authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  fetchMemberId() {
    this.http.get<any>(`${environment.apiUrl}/api/ChitMembers/my-id/${this.chitGroupId}`, this.authHeaders)
      .subscribe({
        next: (data) => this.myMemberId = data.chitMemberId,
        error: () => {
          if (!this.isAdmin) this.errorMsg = '⛔ You are not a member of this group.';
        }
      });
  }

  startPolling() {
    this.zone.runOutsideAngular(() => {
      this.pollingInterval = setInterval(() => {
        this.http.get<any>(`${environment.apiUrl}/api/Auctions/${this.auctionId}`, this.authHeaders)
          .subscribe((data) => {
            this.zone.run(() => {
              const serverHigh = data.highestBidAmount ?? data.HighestBidAmount;
              const serverBase = data.baseAmount ?? data.BaseAmount;
              const status = data.status ?? data.Status;
              const bids = data.bids ?? data.Bids ?? [];

              this.currentBid = Number(serverHigh ?? serverBase);
              if (status === 'Completed' || status === 'Closed') this.auctionClosed = true;

              if (Array.isArray(bids)) {
                this.bidHistory = bids.map((b: any) => ({
                  amount: b.amount ?? b.Amount,
                  bidderName: b.bidderName ?? b.BidderName ?? 'Unknown',
                  time: b.bidTime ? new Date(b.bidTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
                })).sort((a, b) => b.amount - a.amount);
              }
              this.cdr.detectChanges();
            });
          });
      }, 2000);
    });
  }

  handlePlaceBid(customAmount?: number) {
  if (this.auctionClosed) return;

  // 1. STRICT SECURITY CHECK: Prevent Admin/Agent from bidding
  // and ensure the user has a valid Member ID for this specific group.
  if (this.isAdmin || !this.myMemberId) {
    this.errorMsg = "⛔ Access Denied: Only group members can place bids.";
    setTimeout(() => this.errorMsg = '', 3000);
    return;
  }

  const amount = customAmount || Number(this.bidAmount);

  if (!amount || amount <= this.currentBid) {
    this.errorMsg = `Bid must be > ₹${this.currentBid}`;
    setTimeout(() => this.errorMsg = '', 3000);
    return;
  }

  this.loading = true;
  this.http.post(`${environment.apiUrl}/api/Auctions/placebid`, {
    auctionId: this.auctionId,
    chitMemberId: this.myMemberId, // This ID is specific to the member's relation to this group
    amount
  }, this.authHeaders).subscribe({
    next: () => {
      this.zone.run(() => {
        this.currentBid = amount;
        this.bidAmount = '';
        this.loading = false;
        this.errorMsg = '';
      });
    },
    error: (err: any) => {
      this.zone.run(() => {
        this.errorMsg = err.error?.message || 'Bid failed';
        this.loading = false;
      });
    }
  });
}

  quickBid(increment: number) {
    this.handlePlaceBid(this.currentBid + increment);
  }

  handleCloseAuction() {
    if (!confirm('Close auction and declare winner?')) return;
    this.http.post(`${environment.apiUrl}/api/Auctions/${this.auctionId}/close`, {}, this.authHeaders)
      .subscribe(() => this.zone.run(() => this.auctionClosed = true));
  }

  close() {
    this.onClose.emit();
  }
}