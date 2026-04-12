import { createClient } from '@supabase/supabase-js';

// Fallbacks seguros para garantir que o sistema não quebre sem variáveis de ambiente
const fallbackUrl = 'https://lwyfypassezmligarsoo.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTgwNTksImV4cCI6MjA5MTIzNDA1OX0.nstpuFQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const url = (envUrl && !envUrl.includes('SUA_URL')) ? envUrl : fallbackUrl;
const key = (envKey && envKey.length > 50) ? envKey : fallbackKey;

// Limpeza de aspas e espaços
const cleanUrl = url.replace(/["']/g, "").trim();
const cleanKey = key.replace(/["']/g, "").trim();

export const supabase = createClient(cleanUrl, cleanKey);
