const { Client, GatewayIntentBits } = require('discord.js');
// const fetch = require('node-fetch');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const { Partials } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages, // <-- this one
    ],
    partials: [Partials.Channel], // Correct way to specify partials
});

require('dotenv').config(); // Add this at the top

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error('Missing TOKEN in .env file');
    process.exit(1);
}
const PREFIX = "!povejmi ";

// const NONCE = '648a3e53a5'; // replace with a valid nonce
let NONCE = 'invalid_nonce';

async function refreshNonce() {
    try {
        const res = await fetch('https://povejmo.si/');
        const html = await res.text();

        const match = html.match(/"nonce"\s*:\s*"([a-zA-Z0-9]+)"/);
        if (match) {
            NONCE = match[1];
            console.log(`[Nonce Updated] New NONCE: ${NONCE}`);
        } else {
            console.warn('[Nonce Error] Could not find nonce in page.');
        }
    } catch (err) {
        console.error('[Nonce Fetch Error]', err);
    }
}

// refresh nonce every 10 minutes
setInterval(refreshNonce, 10 * 60 * 1000);
refreshNonce(); // immediate call at startup


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isDM = message.channel.type === 1 || message.guild === null; // DM Channel
    const isPrefixed = message.content.startsWith(PREFIX);

    if (!isDM && !isPrefixed) return;

    const content = isPrefixed ? message.content.slice(PREFIX.length).trim() : message.content.trim();

    await message.channel.sendTyping();

    const payload = new URLSearchParams();
    payload.append('_ajax_nonce', NONCE);
    payload.append('action', 'get_response');
    payload.append('messages', JSON.stringify([{ role: 'user', content }]));

    try {
        const res = await fetch('https://povejmo.si/wp-admin/admin-ajax.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: payload.toString()
        });

        const json = await res.json();
        if (json.success && json.data && json.data.content) {
            if (json.data.content.length > 3000) {
                return message.channel.send("... cuius rei responsionem mirabilem sane detexi. Hanc marginis exiguitas non caperet.");
            } else {
                message.channel.send(json.data.content);
            }
        } else {
            message.channel.send('API je mrtev kot dodo.');
        }
    } catch (err) {
        console.error(err);
        message.channel.send('Napaka pri pošiljanju zahteve.');
    }
});


client.login(TOKEN);
