import { createClient } from '@supabase/supabase-js';

const url = 'https://lwyfypassezmligarsoo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWZ5cGFzc2V6bWxpZ2Fyc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTgwNTksImV4cCI6MjA5MTIzNDA1OX0.nstpuFQOALGq1zG2eS16cb3tKfTvYl3-rIaYCNuAwLk';
const supabase = createClient(url, key);

const channel = supabase.channel('virtual-office-room', {
    config: {
        presence: { key: 'admin-bot' },
        broadcast: { self: false }
    }
});

channel
    .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('SYNC STATE: ', JSON.stringify(state));
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('JOINED:', key, newPresences.map(p => p.name || 'Unknown'));
    })
    .subscribe((status) => {
        console.log('STATUS:', status);
        if (status === 'SUBSCRIBED') {
            channel.track({ name: 'AdminBot', x: 640, y: 640, fullKey: 'male-01-1' });
            
            // Broadcast move repeatedly
            let toggle = 0;
            setInterval(() => {
                toggle = toggle === 0 ? 1 : 0;
                channel.send({
                    type: 'broadcast',
                    event: 'move',
                    payload: {
                        id: 'admin-bot',
                        name: 'AdminBot',
                        x: 640 + (toggle * 50),
                        y: 640,
                        fullKey: 'male-01-1',
                        dir: toggle ? 'right' : 'left',
                        anim: null
                    }
                });
            }, 1000);
        }
    });

setInterval(() => {
    console.log('Ping check... active channel');
}, 5000);
