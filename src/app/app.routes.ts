import { Routes } from '@angular/router';

import { authGuard, roleGuard } from './guards/auth-guard';
import { Login } from './pages/login/login';
import { ChangePassword } from './pages/change-password/change-password';
import { LayoutComponent } from './layout/layout'; // Fixed import name
import { Dashboard } from './pages/dashboard/dashboard';
import { UsersComponent } from './pages/users/users';
import { MemberProfileComponent } from './pages/member-profile/member-profile';
import { PaymentsComponent } from './pages/payments/payments';
import { MembersComponent } from './pages/chit-groups/chit-groups';
import { AuctionsComponent } from './pages/auctions/auctions';
import { LiveAuctionComponent } from './pages/auctions/live-auction/live-auction';
import { AdminRequestsComponent } from './pages/admin-requests/admin-requests';
import { ReportsComponent } from './pages/reports/reports';
import { NotificationTemplatesComponent } from './pages/notification-templates/notification-templates';
import { NotificationSettingsComponent } from './pages/notification-settings/notification-settings';
import { JoinGroupComponent } from './pages/join-group/join-group';



export const routes: Routes = [
  // Public Routes
  { path: 'login', component: Login },
  { path: 'change-password', component: ChangePassword },

  // Protected Routes (Wrapped in LayoutComponent)
  {
    path: '',
    component: LayoutComponent, // Fixed component assignment
    canActivate: [authGuard],
    children: [
      { 
        path: '', 
        component: Dashboard, 
        canActivate: [roleGuard(['Admin', 'Agent'])] 
      },
      { 
        path: 'payments', 
        component: PaymentsComponent, 
        canActivate: [roleGuard(['Admin', 'Agent'])] 
      },
      { 
        path: 'reports', 
        component: ReportsComponent, 
        canActivate: [roleGuard(['Admin', 'Agent'])] 
      },
      { 
        path: 'AdminRequestsPage', 
        component: AdminRequestsComponent,
        canActivate: [roleGuard(['Admin', 'Agent'])] 
      },
      { 
        path: 'chit-groups', 
        component: MembersComponent, 
        canActivate: [roleGuard(['Admin', 'Agent'])] 
      },
      { 
        path: 'users', 
        // CHANGE THIS LINE from Users to UsersComponent:
        component: UsersComponent, 
        canActivate: [roleGuard(['Admin'])] 
      },
      { 
        path: 'auctions', 
        component: AuctionsComponent, 
        canActivate: [roleGuard(['Admin', 'Agent','Member'])] 
      },
      { 
        path: 'live-auctions', 
        component: LiveAuctionComponent, 
        canActivate: [roleGuard(['Admin', 'Agent','Member'])] 
      },
      { 
        path: 'MemberProfile', 
        component: MemberProfileComponent, 
        canActivate: [roleGuard(['Member'])] 
      },
            { 
        path: 'join-group', 
        component: JoinGroupComponent, 
        canActivate: [roleGuard(['Member'])] 
      },
      { 
        path: 'notification-settings', 
        component: NotificationSettingsComponent, 
        canActivate: [roleGuard(['Member'])] 
      },
      { 
        path: 'notification-templates', 
        component: NotificationTemplatesComponent, 
        canActivate: [roleGuard(['Admin', 'Agent'])] 
      }
    ]
  },
  
  // Fallback Route
  { path: '**', redirectTo: '' }
];