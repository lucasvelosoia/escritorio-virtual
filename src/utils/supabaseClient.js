import { createClient } from '@supabase/supabase-js';

// Fallbacks corrigidos com a chave exata extraída do dashboard
const fallbackUrl = 'https://lwyfypassezmligarsoo.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MDQwOTgsImV4cCI6MjA5MTUyODk3Mn0.nstpufQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const url = (envUrl && !envUrl.includes('SUA_URL')) ? envUrl : fallbackUrl;
const key = (envKey && envKey.length > 50) ? envKey : fallbackKey;

// Limpeza rigorosa
const cleanUrl = url.replace(/["']/g, "").trim();
const cleanKey = key.replace(/["']/g, "").trim();

export const supabase = createClient(cleanUrl, cleanKey);
