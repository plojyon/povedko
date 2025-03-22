const { Client, GatewayIntentBits } = require('discord.js');
// const fetch = require('node-fetch');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

require('dotenv').config(); // Add this at the top

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error('Missing TOKEN in .env file');
    process.exit(1);
}
const NONCE = '648a3e53a5'; // replace with a valid nonce
const PREFIX = "!povejmi ";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const content = message.content.slice(PREFIX.length).trim();

    await message.channel.sendTyping(); // Show typing indicator

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
            if (json.data.content.length > 3000) {
                return message.channel.send("... cuius rei responsionem mirabilem sane detexi. Hanc marginis exiguitas non caperet.");
            }
            else {
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
