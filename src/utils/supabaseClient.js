import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || 'https://lwyfypassezmligarsoo.supabase.co').replace(/["']/g, "").trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MDQwOTgsImV4cCI6MjA5MTUyODk3Mn0.nstpufQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk').replace(/["']/g, "").trim();

console.log('[Supabase] Connecting to:', url);

export const supabase = createClient(url, key);
