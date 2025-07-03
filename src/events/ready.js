const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🎮 Bot ist bereit! Eingeloggt als ${client.user.tag}`);
        console.log(`📊 Aktiv in ${client.guilds.cache.size} Server(n)`);
        
        // Set bot status
        client.user.setActivity('Clip of the Week 🏆', { type: 'WATCHING' });
    },
}; 