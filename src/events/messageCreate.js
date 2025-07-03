const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignoriere Bot-Nachrichten
        if (message.author.bot) return;

        const prefix = process.env.BOT_PREFIX || 'v!';
        
        // Überprüfe ob die Nachricht mit dem Prefix beginnt
        if (!message.content.startsWith(prefix)) return;

        // Extrahiere Command und Argumente
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Finde den Command
        const command = message.client.commands.get(commandName);
        
        if (!command) return;

        try {
            // Führe den Command aus
            await command.execute(message, args);
        } catch (error) {
            console.error(`Fehler beim Ausführen des Commands ${commandName}:`, error);
            
            try {
                await message.reply({
                    content: '❌ Es gab einen Fehler beim Ausführen dieses Commands!',
                    allowedMentions: { repliedUser: false }
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    },
}; 