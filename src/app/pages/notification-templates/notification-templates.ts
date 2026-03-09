import { Component, OnInit, inject, ViewChild, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment';

interface NotificationTemplate {
  templateId: string;
  templateName: string;
  messageContent: string;
  availableVariables: string;
}

@Component({
  selector: 'app-notification-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './notification-templates.html',
  styleUrls: ['./notification-templates.css']
})
export class NotificationTemplatesComponent implements OnInit {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private readonly API_BASE = `${environment.apiUrl}/api/NotificationTemplates`;

  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  templates: NotificationTemplate[] = [];
  groupedTemplates: Record<string, NotificationTemplate[]> = {};
  categories = ['Payments & Reminders', 'Auctions', 'Groups & Requests', 'Members', 'Other'];
  activeCategory = 'Payments & Reminders';

  loading = true;
  showModal = false;
  isSaving = false;
  editingTemplate: NotificationTemplate | null = null;
  editedContent = "";
  alert: { type: string; message: string } | null = null;

  get authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  ngOnInit() {
    this.fetchTemplates();
  }

  fetchTemplates() {
    this.loading = true;
    this.http.get<NotificationTemplate[]>(this.API_BASE, this.authHeaders).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.templates = data;
          this.groupTemplates();
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => this.zone.run(() => {
        this.alert = { type: 'danger', message: 'Error loading templates.' };
        this.loading = false;
      })
    });
  }

  private groupTemplates() {
    const grouped: Record<string, NotificationTemplate[]> = {};
    this.templates.forEach(t => {
      const cat = this.getCategory(t.templateName);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    this.groupedTemplates = grouped;
  }

  private getCategory(name: string): string {
    if (name.includes('Payment') || name.includes('Reminder')) return 'Payments & Reminders';
    if (name.includes('Auction')) return 'Auctions';
    if (name.includes('Request') || name.includes('Group')) return 'Groups & Requests';
    if (name.includes('Member')) return 'Members';
    return 'Other';
  }

  handleEditClick(template: NotificationTemplate) {
    this.editingTemplate = template;
    this.editedContent = template.messageContent;
    this.showModal = true;
  }

  insertVariable(variable: string) {
    const textarea = this.textareaRef.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tag = `{${variable.trim().replace(/[{}]/g, '')}}`;

    this.editedContent = 
      this.editedContent.substring(0, start) + tag + this.editedContent.substring(end);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  }

  handleSave() {
    if (!this.editingTemplate) return;
    this.isSaving = true;

    this.http.put(`${this.API_BASE}/${this.editingTemplate.templateId}`, 
      { messageContent: this.editedContent }, this.authHeaders).subscribe({
        next: () => {
          this.zone.run(() => {
            this.alert = { type: 'success', message: `${this.editingTemplate?.templateName} updated!` };
            this.showModal = false;
            this.fetchTemplates();
            this.isSaving = false;
          });
        },
        error: () => this.zone.run(() => {
          this.alert = { type: 'danger', message: 'Failed to update template.' };
          this.isSaving = false;
        })
      });
  }

  formatName(name: string) {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  getAvailableVars() {
    return this.editingTemplate?.availableVariables.split(',') || [];
  }
}