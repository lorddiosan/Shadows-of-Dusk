import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isLiveSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes('your-supabase') &&
  !SUPABASE_URL.includes('placeholder')
);

// Universal storage helper with in-memory fallback for Node/Vitest and browser environments
const inMemoryStore: Record<string, string> = {};
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return inMemoryStore[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    inMemoryStore[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    delete inMemoryStore[key];
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {}
    for (const k in inMemoryStore) delete inMemoryStore[k];
  }
};

// In-Memory & LocalStorage Mock Engine for offline / development / test usage
class MockSupabaseAuth {
  private listeners: Array<(event: string, session: any) => void> = [];
  private storageKey = 'sod_mock_auth_user';

  private getStoredUser() {
    try {
      const d = safeStorage.getItem(this.storageKey);
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  }

  private setStoredUser(u: any) {
    try {
      if (u) {
        safeStorage.setItem(this.storageKey, JSON.stringify(u));
      } else {
        safeStorage.removeItem(this.storageKey);
      }
    } catch {
      // ignore
    }
  }

  private getRegisteredUsers(): Record<string, any> {
    try {
      const d = safeStorage.getItem('sod_mock_registered_users');
      return d ? JSON.parse(d) : {};
    } catch {
      return {};
    }
  }

  private saveRegisteredUser(email: string, user: any) {
    try {
      const all = this.getRegisteredUsers();
      all[email.toLowerCase()] = user;
      safeStorage.setItem('sod_mock_registered_users', JSON.stringify(all));
    } catch {
      // ignore
    }
  }

  async signUp({ email, password, options }: { email: string; password?: string; options?: { data?: any } }) {
    if (!email || !email.includes('@')) {
      return { data: { user: null, session: null }, error: new Error('Invalid email address') };
    }
    const id = 'usr_' + Math.random().toString(36).substring(2, 10);
    const role = options?.data?.role || (email.toLowerCase().includes('admin') ? 'admin' : 'player');
    const user = {
      id,
      email,
      user_metadata: {
        username: options?.data?.username || email.split('@')[0],
        display_name: options?.data?.display_name || email.split('@')[0],
        role
      }
    };
    const session = { access_token: 'mock_jwt_' + id, user };
    this.saveRegisteredUser(email, user);
    this.setStoredUser(user);
    this.notify('SIGNED_IN', session);
    return { data: { user, session }, error: null };
  }

  async signInWithPassword({ email, password }: { email: string; password?: string }) {
    if (!email || !password) {
      return { data: { user: null, session: null }, error: new Error('Missing email or password') };
    }
    const registered = this.getRegisteredUsers()[email.toLowerCase()];
    const role = registered?.user_metadata?.role || (email.toLowerCase().includes('admin') ? 'admin' : 'player');
    const id = registered?.id || 'usr_' + Math.random().toString(36).substring(2, 10);
    const user = {
      id,
      email,
      user_metadata: {
        username: registered?.user_metadata?.username || email.split('@')[0],
        display_name: registered?.user_metadata?.display_name || registered?.user_metadata?.username || email.split('@')[0],
        role
      }
    };
    const session = { access_token: 'mock_jwt_' + id, user };
    this.setStoredUser(user);
    this.notify('SIGNED_IN', session);
    return { data: { user, session }, error: null };
  }

  async signOut() {
    this.setStoredUser(null);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async resetPasswordForEmail(email: string) {
    if (!email || !email.includes('@')) {
      return { error: new Error('Please enter a valid email address') };
    }
    return { data: {}, error: null };
  }

  async signInWithOAuth({ provider, options }: { provider: string; options?: any }) {
    const id = 'usr_oauth_' + Math.random().toString(36).substring(2, 10);
    const user = {
      id,
      email: `commander.${provider}@convergence.war`,
      app_metadata: { provider },
      user_metadata: {
        username: `${provider}_commander`,
        display_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Commander`,
        full_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Commander`,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${provider}`,
        role: 'player'
      }
    };
    const session = { access_token: 'mock_jwt_oauth_' + id, user };
    this.saveRegisteredUser(user.email, user);
    this.setStoredUser(user);
    this.notify('SIGNED_IN', session);
    return { data: { provider, url: null }, error: null };
  }

  async getSession() {
    const user = this.getStoredUser();
    return {
      data: {
        session: user ? { access_token: 'mock_jwt_' + user.id, user } : null
      },
      error: null
    };
  }

  async getUser() {
    const user = this.getStoredUser();
    return { data: { user }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback);
          }
        }
      }
    };
  }

  private notify(event: string, session: any) {
    this.listeners.forEach(l => l(event, session));
  }
}

type RealtimeListener = (payload: { event: string; table: string; old?: any; new?: any }) => void;
const realtimeListeners: RealtimeListener[] = [];

export function broadcastMockRealtimeEvent(payload: { event: string; table: string; old?: any; new?: any }) {
  realtimeListeners.forEach(listener => {
    try {
      listener(payload);
    } catch (e) {
      console.error(e);
    }
  });
}

class MockSupabaseTableQuery {
  private tableName: string;
  private filters: Array<{ col: string; val: any }> = [];
  private action: 'select' | 'update' | 'delete' = 'select';
  private updatePayload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    this.action = 'select';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: any) {
    return this;
  }

  update(updates: any) {
    this.action = 'update';
    this.updatePayload = updates;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  async single() {
    const res = await this.executeSelect();
    return { data: res.data?.[0] || null, error: res.error };
  }

  async insert(record: any) {
    try {
      const list = this.getTableData();
      const newItems = Array.isArray(record) ? record : [record];
      const inserted = newItems.map(item => ({
        id: item.id || 'id_' + Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        ...item
      }));
      list.push(...inserted);
      this.saveTableData(list);
      return { data: inserted, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  private async executeUpdate() {
    try {
      const list = this.getTableData();
      const updatedList = list.map(item => {
        const matches = this.filters.length === 0 || this.filters.every(f => item[f.col] === f.val);
        if (matches) {
          const newItem = { ...item, ...this.updatePayload, updated_at: new Date().toISOString() };
          broadcastMockRealtimeEvent({
            event: 'UPDATE',
            table: this.tableName,
            old: item,
            new: newItem
          });
          return newItem;
        }
        return item;
      });
      this.saveTableData(updatedList);
      return { data: updatedList.filter(item => this.filters.every(f => item[f.col] === f.val)), error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  private async executeDelete() {
    try {
      const list = this.getTableData();
      const remaining = list.filter(item => !this.filters.every(f => item[f.col] === f.val));
      this.saveTableData(remaining);
      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    let res;
    if (this.action === 'update') {
      res = await this.executeUpdate();
    } else if (this.action === 'delete') {
      res = await this.executeDelete();
    } else {
      res = await this.executeSelect();
    }
    return resolve(res);
  }

  private async executeSelect() {
    try {
      let list = this.getTableData();
      if (this.filters.length > 0) {
        list = list.filter(item => this.filters.every(f => item[f.col] === f.val));
      }
      return { data: list, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  private getTableData(): any[] {
    try {
      const key = `sod_mock_table_${this.tableName}`;
      const d = safeStorage.getItem(key);
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  }

  private saveTableData(data: any[]) {
    try {
      const key = `sod_mock_table_${this.tableName}`;
      safeStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

class MockSupabaseChannel {
  private channelName: string;
  private unsubscribeFns: Array<() => void> = [];

  constructor(name: string) {
    this.channelName = name;
  }

  on(event: string, filterConfig: any, callback: Function) {
    const listener = (payload: any) => {
      if (filterConfig.event && filterConfig.event !== '*' && filterConfig.event !== payload.event) return;
      if (filterConfig.table && filterConfig.table !== payload.table) return;
      if (filterConfig.filter) {
        // e.g. "id=eq.q_123"
        const parts = filterConfig.filter.split('=eq.');
        if (parts.length === 2) {
          const col = parts[0];
          const val = parts[1];
          if (payload.new?.[col] !== val) return;
        }
      }
      callback(payload);
    };

    realtimeListeners.push(listener);
    this.unsubscribeFns.push(() => {
      const idx = realtimeListeners.indexOf(listener);
      if (idx >= 0) realtimeListeners.splice(idx, 1);
    });

    return this;
  }

  subscribe(statusCallback?: (status: string) => void) {
    if (statusCallback) statusCallback('SUBSCRIBED');
    return this;
  }

  unsubscribe() {
    this.unsubscribeFns.forEach(fn => fn());
    this.unsubscribeFns = [];
    return Promise.resolve();
  }
}

class MockSupabaseClient {
  auth = new MockSupabaseAuth();

  from(tableName: string) {
    return new MockSupabaseTableQuery(tableName);
  }

  channel(name: string) {
    return new MockSupabaseChannel(name);
  }
}

// Export the active Supabase client (live instance if env is provided, or complete mock simulation)
export const supabase: SupabaseClient = isLiveSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (new MockSupabaseClient() as unknown as SupabaseClient);
