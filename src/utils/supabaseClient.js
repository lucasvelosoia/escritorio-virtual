import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || 'https://lwyfypassezmligarsoo.supabase.co').replace(/["']/g, "").trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AwRMJv_F9fO3d0bU_uwG1g_MyhXIpg4').replace(/["']/g, "").trim();

console.log('[Supabase] Connecting to:', url);

export const supabase = createClient(url, key);
