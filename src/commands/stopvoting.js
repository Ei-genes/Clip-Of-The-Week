const votingService = require('../services/votingService');

module.exports = {
    name: 'stopvoting',
    description: 'Stoppt das aktuelle Voting sofort',
    usage: 'v!stopvoting',

    async execute(message, args) {

        try {
            // Überprüfe Admin-Berechtigung
            if (process.env.ADMIN_ROLE_ID && !message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
                return await message.reply({
                    content: '❌ Du hast keine Berechtigung, diesen Command zu verwenden.',
                    allowedMentions: { repliedUser: false }
                });
            }

            // Überprüfe ob ein Voting aktiv ist
            const activeVotings = votingService.getActiveVotings();
            
            if (activeVotings.length === 0) {
                return await message.reply({
                    content: '⚠️ Es ist kein Voting aktiv.',
                    allowedMentions: { repliedUser: false }
                });
            }

            // Stoppe alle aktiven Votings
            let stoppedCount = 0;
            
            for (const voting of activeVotings) {
                const success = await votingService.stopVoting(message.client, voting.id);
                if (success) {
                    stoppedCount++;
                }
            }

            if (stoppedCount > 0) {
                await message.reply({
                    content: `✅ **${stoppedCount} Voting(s) erfolgreich gestoppt!**\n\nDie Ergebnisse wurden verkündet und das Leaderboard aktualisiert.`,
                    allowedMentions: { repliedUser: false }
                });
            } else {
                await message.reply({
                    content: '❌ **Fehler beim Stoppen der Votings**\n\nBitte versuche es erneut oder kontaktiere einen Administrator.',
                    allowedMentions: { repliedUser: false }
                });
            }

        } catch (error) {
            console.error('Fehler beim Stop-Voting:', error);
            await message.reply({
                content: `❌ **Fehler beim Stoppen des Votings**\n\n${error.message}`,
                allowedMentions: { repliedUser: false }
            });
        }
    }
}; 