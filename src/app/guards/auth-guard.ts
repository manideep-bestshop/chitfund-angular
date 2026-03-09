import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// 1. Basic Auth Check
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!localStorage.getItem('jwtToken')) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

// 2. Role-based Check (Equivalent to your RoleProtectedRoute)
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const role = localStorage.getItem('userRole');
    const userStr = localStorage.getItem('user');

    if (!userStr || !role) {
      router.navigate(['/login']);
      return false;
    }

    const user = JSON.parse(userStr);
    if (user.forcePasswordChange) {
      router.navigate(['/change-password']);
      return false;
    }

    if (!allowedRoles.includes(role)) {
      router.navigate(['/']); // Redirect unauthorized users
      return false;
    }

    return true;
  };
};