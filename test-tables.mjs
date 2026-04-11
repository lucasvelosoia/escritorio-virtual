import { createClient } from '@supabase/supabase-js';

const url = 'https://lwyfypassezmligarsoo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTgwNTksImV4cCI6MjA5MTIzNDA1OX0.nstpuFQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk';
const supabase = createClient(url, key);

async function test() {
    console.log('Testing office_layout...');
    const res1 = await supabase.from('office_layout').select('*').limit(1);
    console.log('office_layout:', res1.error || 'OK', res1.data);

    console.log('Testing employees...');
    const res2 = await supabase.from('employees').select('*').limit(1);
    console.log('employees:', res2.error || 'OK', res2.data);
    
    console.log('Testing chat_messages...');
    const res3 = await supabase.from('chat_messages').select('*').limit(1);
    console.log('chat_messages:', res3.error || 'OK', res3.data);
}
test();
