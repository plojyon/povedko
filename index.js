const { Client, GatewayIntentBits } = require('discord.js');
// const fetch = require('node-fetch');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

require('dotenv').config(); // Add this at the top

const TOKEN = process.env.DISCORD_TOKEN;
const NONCE = '648a3e53a5'; // replace with a valid nonce
const PREFIX = "!povejmi ";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const content = message.content.slice(PREFIX.length).trim();

    const payload = new URLSearchParams();
    payload.append('_ajax_nonce', NONCE);
    payload.append('action', 'get_response');
    payload.append('messages', JSON.stringify([{ role: 'user', content: content }]));

    try {
        const res = await fetch('https://povejmo.si/wp-admin/admin-ajax.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: payload.toString()
        });

        const json = await res.json();
        if (json.success && json.data && json.data.content) {
            message.channel.send(json.data.content);
        } else {
            message.channel.send('Napaka pri pridobivanju odgovora.');
        }
    } catch (err) {
        console.error(err);
        message.channel.send('Napaka pri pošiljanju zahteve.');
    }
});

client.login(TOKEN);
