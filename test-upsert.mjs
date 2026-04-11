import { createClient } from '@supabase/supabase-js';

const url = 'https://lwyfypassezmligarsoo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTgwNTksImV4cCI6MjA5MTIzNDA1OX0.nstpuFQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk';
const supabase = createClient(url, key);

async function test() {
    const { data, error } = await supabase.from('office_layout').upsert({
        id: 'main-office',
        data: [{x: 0, y: 0}]
    }).select();
    
    console.log('Upsert result:', {data, error});
}
test();
