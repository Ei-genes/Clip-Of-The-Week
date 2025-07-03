const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Zeigt alle verfügbaren Commands',
    usage: 'v!help',

    async execute(message, args) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🏆 Clip of the Week Bot - Commands')
                .setDescription('Alle verfügbaren Commands mit dem Prefix `v!`')
                .setColor('#FF4500')
                .setTimestamp();

            embed.addFields(
                {
                    name: '🔥 v!forcevoting [days]',
                    value: 'Startet manuell ein Voting\n**Beispiel:** `v!forcevoting 3`\n**Berechtigung:** Admin',
                    inline: false
                },
                {
                    name: '🛑 v!stopvoting',
                    value: 'Stoppt das aktuelle Voting sofort\n**Berechtigung:** Admin',
                    inline: false
                },
                {
                    name: '📊 v!clipstats [days]',
                    value: 'Zeigt Clip-Statistiken der letzten Tage\n**Beispiel:** `v!clipstats 14`\n**Standard:** 7 Tage',
                    inline: false
                },
                {
                    name: '🏆 v!leaderboard [top]',
                    value: 'Zeigt das Gewinner-Leaderboard\n**Beispiel:** `v!leaderboard 20`\n**Standard:** Top 10',
                    inline: false
                },
                {
                    name: '❓ v!help',
                    value: 'Zeigt diese Hilfe an',
                    inline: false
                }
            );

            embed.addFields(
                {
                    name: '🎬 Wie funktioniert es?',
                    value: '• Poste Medal.tv Links mit `https://medal.tv/...`\n• Jeden Sonntag 0:00-20:00 Uhr automatisches Voting\n• Stimme mit 🔥 Flammen-Emojis ab\n• Mehrere Gewinner bei Gleichstand möglich',
                    inline: false
                }
            );

            embed.setFooter({ text: 'Clip of the Week Bot • v!' });

            await message.reply({
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });

        } catch (error) {
            console.error('Fehler beim Help-Command:', error);
            await message.reply({
                content: '❌ **Fehler beim Laden der Hilfe**\n\nBitte versuche es erneut.',
                allowedMentions: { repliedUser: false }
            });
        }
    }
}; 