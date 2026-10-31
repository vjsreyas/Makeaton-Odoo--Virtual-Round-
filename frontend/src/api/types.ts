export type ContextType = 'platform' | 'business_admin' | 'business_staff' | 'customer';
export type ActiveContextType = ContextType | 'none';

export interface Paged<T> {
  data: T[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
}

export interface ContextInfo {
  type: ContextType;
  business_id: string | null;
  business_name: string | null;
  business_status: 'active' | 'suspended' | null;
}

export interface ActiveContext {
  type: ActiveContextType;
  business_id: string | null;
}

export interface Session {
  access_token: string;
  expires_in: number;
  active_context: ActiveContext;
}

export interface LoginResult extends Session {
  user: UserSummary;
  contexts: ContextInfo[];
}

export interface Me {
  user: UserSummary;
  active_context: ActiveContext;
  role: ActiveContextType;
  permissions: string[];
  business: { id: string; name: string; currency: string; timezone: string } | null;
  contexts: ContextInfo[];
}

export interface RegisterRequest {
  business_slug: string;
  full_name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  user_id: string;
  customer_id: string | null;
  role: 'customer';
}

export interface SwitchContextRequest {
  context?: 'platform';
  business_id?: string;
  type?: 'business_admin' | 'business_staff' | 'customer';
}

export interface JoinBusinessResult {
  customer_id: string | null;
  role: 'customer';
}

export interface ResetPasswordRequest {
  token: string;
  new_password?: string;
}

export interface ResetPasswordResult {
  message: string;
  password_changed: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface PublicBusiness {
  name: string;
  slug: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'business_admin' | 'business_staff';
  is_active: boolean;
  status: 'active' | 'invited' | 'inactive';
  permissions: string[];
  created_at: string;
}

export interface TeamQuery {
  q?: string;
  role?: 'business_admin' | 'business_staff';
  is_active?: boolean;
  sort?: 'created_at' | '-created_at' | 'full_name' | '-full_name' | 'email' | '-email';
  page?: number;
  page_size?: number;
}

export interface TeamCreateRequest {
  full_name: string;
  email: string;
  permissions?: string[];
}

export interface TeamUpdateRequest {
  is_active?: boolean;
  permissions?: string[];
}

export interface PermissionCatalog {
  permissions: { code: string; module: string; action: string }[];
  defaults: string[];
  admin_only: string[];
}

export interface PlatformBusiness {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  timezone: string;
  currency: string;
  legal_name: string | null;
  contact_email: string | null;
  created_at: string;
  admin_count: number;
  staff_count: number;
  customer_count: number;
}

export interface PlatformBusinessQuery {
  q?: string;
  status?: 'active' | 'suspended';
  sort?: 'created_at' | '-created_at' | 'name' | '-name' | 'slug' | '-slug';
  page?: number;
  page_size?: number;
}

export interface PlatformBusinessCreate {
  name: string;
  slug: string;
  admin_full_name: string;
  admin_email: string;
  timezone?: string;
  currency?: string;
}

export interface PlatformBusinessUpdate {
  name?: string;
  legal_name?: string | null;
  contact_email?: string | null;
}
