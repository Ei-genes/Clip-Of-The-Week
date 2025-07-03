const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initializeScheduler } = require('./services/scheduler');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Commands Collection
client.commands = new Collection();

// Initialize bot
async function initializeBot() {
    try {
        // Load commands and events
        await loadCommands(client);
        await loadEvents(client);
        
        // Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
        
        console.log('🤖 Clip of the Week Bot ist online!');
        
        // Initialize scheduler after login
        initializeScheduler(client);
        
    } catch (error) {
        console.error('Fehler beim Starten des Bots:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('Bot wird beendet...');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Start the bot
initializeBot(); 