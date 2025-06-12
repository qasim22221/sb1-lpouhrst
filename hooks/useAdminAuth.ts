import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Record<string, any>;
  is_active: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  role?: AdminRole;
  created_at: string;
}

export function useAdminAuth() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing admin session
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      setError(null);
      
      // For demo purposes, we'll simulate admin authentication
      // In production, this would check for valid admin session tokens
      const adminSession = localStorage.getItem('admin_session');
      
      if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        
        // Verify session is still valid (check expiry, etc.)
        if (sessionData.expires_at && new Date(sessionData.expires_at) > new Date()) {
          setAdmin(sessionData.admin);
        } else {
          // Session expired
          localStorage.removeItem('admin_session');
          setAdmin(null);
        }
      }
    } catch (err: any) {
      console.error('Admin session check error:', err);
      setError('Failed to verify admin session');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // For demo purposes, we'll use hardcoded admin credentials
      // In production, this would authenticate against the admin_users table
      const demoAdmins = [
        {
          username: 'admin',
          password: 'admin123',
          admin: {
            id: '1',
            email: 'admin@referralhub.com',
            username: 'admin',
            first_name: 'System',
            last_name: 'Administrator',
            is_active: true,
            role: {
              id: '1',
              name: 'super_admin',
              display_name: 'Super Administrator',
              description: 'Full system access',
              permissions: {
                users: { view: true, create: true, edit: true, delete: true, manage_balances: true },
                finances: { view: true, approve_withdrawals: true, adjust_balances: true, view_reports: true },
                system: { view_settings: true, edit_settings: true, view_logs: true, manage_admins: true },
                analytics: { view_all: true, export_data: true },
                notifications: { create: true, manage: true }
              },
              is_active: true
            },
            created_at: new Date().toISOString()
          }
        },
        {
          username: 'subadmin',
          password: 'subadmin123',
          admin: {
            id: '2',
            email: 'subadmin@referralhub.com',
            username: 'subadmin',
            first_name: 'Sub',
            last_name: 'Administrator',
            is_active: true,
            role: {
              id: '3',
              name: 'sub_admin',
              display_name: 'Sub Administrator',
              description: 'Limited access',
              permissions: {
                users: { view: true, create: false, edit: true, delete: false, manage_balances: false },
                finances: { view: true, approve_withdrawals: false, adjust_balances: false, view_reports: true },
                system: { view_settings: true, edit_settings: false, view_logs: false, manage_admins: false },
                analytics: { view_all: false, export_data: false },
                notifications: { create: false, manage: false }
              },
              is_active: true
            },
            created_at: new Date().toISOString()
          }
        }
      ];

      const adminCredentials = demoAdmins.find(
        a => a.username === username && a.password === password
      );

      if (!adminCredentials) {
        throw new Error('Invalid admin credentials');
      }

      // Create session
      const sessionData = {
        admin: adminCredentials.admin,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString()
      };

      localStorage.setItem('admin_session', JSON.stringify(sessionData));
      setAdmin(adminCredentials.admin);

      // In production, you would also:
      // 1. Create a session record in admin_sessions table
      // 2. Log the login activity
      // 3. Update last_login_at timestamp

    } catch (err: any) {
      setError(err.message || 'Admin login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      
      // Remove local session
      localStorage.removeItem('admin_session');
      setAdmin(null);

      // In production, you would also:
      // 1. Invalidate the session in admin_sessions table
      // 2. Log the logout activity

    } catch (err: any) {
      setError(err.message || 'Admin logout failed');
      throw err;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin?.role?.permissions) return false;

    const parts = permission.split('.');
    let current = admin.role.permissions;

    for (const part of parts) {
      if (current[part] === undefined) return false;
      current = current[part];
    }

    return current === true;
  };

  return {
    admin,
    loading,
    error,
    signIn,
    signOut,
    hasPermission,
    refetchAdmin: checkAdminSession,
  };
}