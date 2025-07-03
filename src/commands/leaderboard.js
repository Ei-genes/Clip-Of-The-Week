const { EmbedBuilder } = require('discord.js');
const votingService = require('../services/votingService');

module.exports = {
    name: 'leaderboard',
    description: 'Zeigt das Clip of the Week Leaderboard',
    usage: 'v!leaderboard [top]',

    async execute(message, args) {

        try {
            const topCount = parseInt(args[0]) || 10;
            
            // Lade Leaderboard
            const leaderboard = await votingService.loadLeaderboard();
            
            if (Object.keys(leaderboard).length === 0) {
                return await message.reply({
                    content: '📊 **Leaderboard ist leer**\n\nEs wurden noch keine Votings durchgeführt!',
                    allowedMentions: { repliedUser: false }
                });
            }

            // Konvertiere zu Array und sortiere
            const sortedPlayers = Object.entries(leaderboard)
                .map(([userId, data]) => ({
                    userId,
                    ...data
                }))
                .sort((a, b) => {
                    // Sortiere nach Anzahl Siege, dann nach Gesamt-Stimmen
                    if (b.wins !== a.wins) {
                        return b.wins - a.wins;
                    }
                    return b.totalVotes - a.totalVotes;
                })
                .slice(0, topCount);

            // Erstelle Embed
            const embed = this.createLeaderboardEmbed(sortedPlayers, topCount);

            await message.reply({
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });

        } catch (error) {
            console.error('Fehler beim Laden des Leaderboards:', error);
            await message.reply({
                content: `❌ **Fehler beim Laden des Leaderboards**\n\n${error.message}`,
                allowedMentions: { repliedUser: false }
            });
        }
    },

    /**
     * Erstellt ein Leaderboard-Embed
     * @param {Array} players - Sortierte Spieler-Daten
     * @param {number} topCount - Anzahl der angezeigten Spieler
     * @returns {EmbedBuilder}
     */
    createLeaderboardEmbed(players, topCount) {
        const embed = new EmbedBuilder()
            .setTitle('🏆 Clip of the Week Leaderboard')
            .setDescription(`**Top ${Math.min(topCount, players.length)} Gewinner**`)
            .setColor('#FFD700')
            .setTimestamp();

        let description = '';
        
        players.forEach((player, index) => {
            const position = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const avgVotes = player.totalVotes / player.wins;
            const lastWin = player.lastWin ? new Date(player.lastWin).toLocaleDateString('de-DE') : 'Nie';
            
            description += `${position} **${player.username}**\n`;
            description += `🏆 ${player.wins} Siege | 🔥 ${player.totalVotes} Flammen gesamt\n`;
            description += `📊 ⌀ ${avgVotes.toFixed(1)} Flammen/Sieg | 📅 ${lastWin}\n\n`;
        });

        embed.setDescription(description);
        
        // Füge Footer mit Statistiken hinzu
        const totalWins = players.reduce((sum, player) => sum + player.wins, 0);
        const totalVotes = players.reduce((sum, player) => sum + player.totalVotes, 0);
        
        embed.setFooter({ 
            text: `Gesamt: ${totalWins} Siege • ${totalVotes} Flammen • ${players.length} Spieler` 
        });

        return embed;
    }
}; 