import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { authInterceptor } from './interceptors/auth-interceptor'; 
import { routes } from './app.routes';

import { 
  LucideAngularModule, 
  Search, Plus, Edit2, Trash2, Power, Key, 
  MapPin, Phone, Filter, Upload, FileText, Download, CheckCircle, Info,
  Hexagon, AlertCircle, Mail, Lock, LogIn, Menu, ChevronLeft, UserCircle, 
  LayoutDashboard, Users, Layers, Gavel, CreditCard, BarChart3, LogOut, UserPlus, Bell,
  IndianRupee, Send, Check, Eye, MessageSquare, ChevronRight, Activity, PlayCircle, Clock,
  TrendingUp, History, Calendar, XCircle, CheckSquare,
  MoreVertical, ArrowLeft, User // Added these for Chit Groups & Details
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), 
    importProvidersFrom(
      LucideAngularModule.pick({ 
        Search, Plus, Edit2, Trash2, Power, Key, MapPin, Phone, Filter, Upload, FileText, Download, CheckCircle, Info,
        Hexagon, AlertCircle, Mail, Lock, LogIn, Menu, ChevronLeft, UserCircle, 
        LayoutDashboard, Users, Layers, Gavel, CreditCard, BarChart3, LogOut, UserPlus, Bell,
        IndianRupee, Send, Check, Eye, MessageSquare, ChevronRight, Activity, PlayCircle, Clock,
        TrendingUp, History, Calendar, XCircle, CheckSquare,
        MoreVertical, ArrowLeft, User
      })
    )
  ]
};