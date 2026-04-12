import { createClient } from '@supabase/supabase-js';

// Fallbacks coletados diretamente do seu dashboard
const supabaseUrl = 'https://lwyfypassezmligarsoo.supabase.co';
const legacyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MDQwOTgsImV4cCI6MjA1OTk4MDA5OH0.nstpufQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk';
const publishableKey = 'sb_publishable_AwRMJv_F9fO3d0bU_uwG1g_MyhXIpg4';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lógica de prioridade: 
// 1. Variável de ambiente (se for válida)
// 2. Publishable Key (formato novo recomendado pelo Supabase)
// 3. Legacy Key (backup)

const url = (envUrl && !envUrl.includes('SUA_URL')) ? envUrl : supabaseUrl;
let key = (envKey && envKey.length > 50) ? envKey : publishableKey;

// Se a chave do ENV for a mesma que estava dando erro, forçamos a Publishable
if (key === legacyKey) {
    key = publishableKey;
}

const cleanUrl = url.replace(/["']/g, "").trim();
const cleanKey = key.replace(/["']/g, "").trim();

export const supabase = createClient(cleanUrl, cleanKey);
