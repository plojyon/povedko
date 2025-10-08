const { Client, GatewayIntentBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const { Partials } = require('discord.js');

require('dotenv').config();

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error('Missing TOKEN in .env file');
    process.exit(1);
}
const PREFIX = process.env.PREFIX + " ";
const SYSTEM_MSG = process.env.SYSTEM_MSG || "";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});


let NONCE = 'invalid_nonce';

async function refreshNonce() {
    try {
        const cheerio = await import('cheerio');
        const res = await fetch('https://povejmo.si/klepet/');
        const html = await res.text();

        const $ = cheerio.load(html);
        const nonce = $('input[name="_wpnonce"]').val();

        if (nonce) {
            if (nonce !== NONCE) {
                NONCE = nonce;
                console.log(`[Nonce Updated] New NONCE: ${NONCE}`);
            }
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

    const isDM = message.channel.type === 1 || message.guild === null;
    const isPrefixed = message.content.startsWith(PREFIX);

    if (!isDM && !isPrefixed) return;

    await message.channel.sendTyping();

    const messages = [];
    if (SYSTEM_MSG.length > 0) {
        messages.push({ role: 'user', content: SYSTEM_MSG });
        messages.push({ role: 'assistant', content: "V redu, bom upošteval tvoje navodilo." });
    }
    const content = isPrefixed ? message.content.slice(PREFIX.length).trim() : message.content.trim();
    messages.push({ role: 'user', content: content });

    const payload = new URLSearchParams();
    payload.append('_ajax_nonce', NONCE);
    payload.append('action', 'get_response');
    payload.append('messages', JSON.stringify(messages));

    try {
        const res = await fetch('https://povejmo.si/api/gams/v1/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: payload.toString()
        });

        const json = await res.json();
        if (json.success && json.data && json.data.content) {
            if (json.data.content.length > 2000) {
                return message.channel.send("Sori, sm zaceu ful razmisljat in je Discord reku da rabim nitro.");
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
