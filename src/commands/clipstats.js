const { EmbedBuilder } = require('discord.js');
const clipService = require('../services/clipService');

module.exports = {
    name: 'clipstats',
    description: 'Zeigt Statistiken über Medal.tv Clips',
    usage: 'v!clipstats [days]',

    async execute(message, args) {

        try {
            const days = parseInt(args[0]) || 7;
            
            const channel = await message.client.channels.fetch(process.env.CLIP_CHANNEL_ID);
            if (!channel) {
                return await message.reply({
                    content: `❌ Clip-Kanal ${process.env.CLIP_CHANNEL_ID} nicht gefunden`,
                    allowedMentions: { repliedUser: false }
                });
            }

            const statusMessage = await message.reply({
                content: `🔍 Analysiere Medal.tv Clips der letzten ${days} Tage...`,
                allowedMentions: { repliedUser: false }
            });

            // Sammle Clips
            const clips = await this.getClipsFromDays(message.client, days);

            // Erstelle Statistiken
            const stats = this.calculateStats(clips, days);

            // Erstelle Embed
            const embed = this.createStatsEmbed(stats, days);

            await statusMessage.edit({
                content: null,
                embeds: [embed]
            });

        } catch (error) {
            console.error('Fehler bei Clip-Statistiken:', error);
            await message.reply({
                content: `❌ **Fehler beim Laden der Statistiken**\n\n${error.message}`,
                allowedMentions: { repliedUser: false }
            });
        }
    },

    /**
     * Sammelt Clips der letzten X Tage
     * @param {Client} client - Discord Client
     * @param {number} days - Anzahl der Tage
     * @returns {Array} Array von Clips
     */
    async getClipsFromDays(client, days) {
        try {
            const channel = await client.channels.fetch(process.env.CLIP_CHANNEL_ID);
            if (!channel) {
                throw new Error(`Clip-Kanal ${process.env.CLIP_CHANNEL_ID} nicht gefunden`);
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Sammle Nachrichten
            const messages = await this.fetchMessagesFromDays(channel, cutoffDate);
            
            // Filtere Medal.tv Clips
            const clips = clipService.filterMedalClips(messages);
            
            return clips;

        } catch (error) {
            console.error('Fehler beim Sammeln der Clips:', error);
            throw error;
        }
    },

    /**
     * Sammelt Nachrichten der letzten X Tage
     * @param {TextChannel} channel - Discord Kanal
     * @param {Date} cutoffDate - Cutoff-Datum
     * @returns {Array} Array von Discord Messages
     */
    async fetchMessagesFromDays(channel, cutoffDate) {
        const messages = [];
        let lastMessageId = null;

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            const batch = await channel.messages.fetch(options);
            if (batch.size === 0) break;

            const filteredBatch = batch.filter(msg => msg.createdAt >= cutoffDate);
            messages.push(...filteredBatch.values());

            // Wenn die älteste Nachricht älter als das Cutoff-Datum ist, stoppen
            const oldestMessage = batch.last();
            if (oldestMessage.createdAt < cutoffDate) break;

            lastMessageId = batch.last().id;
        }

        return messages;
    },

    /**
     * Berechnet Statistiken für die Clips
     * @param {Array} clips - Array von Clips
     * @param {number} days - Anzahl der Tage
     * @returns {Object} Statistik-Objekt
     */
    calculateStats(clips, days) {
        const stats = {
            totalClips: clips.length,
            days: days,
            averagePerDay: clips.length / days,
            userStats: new Map(),
            dailyStats: new Map()
        };

        // Benutzer-Statistiken
        clips.forEach(clip => {
            const userId = clip.author.id;
            const username = clip.author.displayName || clip.author.username;
            
            if (!stats.userStats.has(userId)) {
                stats.userStats.set(userId, {
                    username: username,
                    count: 0,
                    clips: []
                });
            }
            
            const userStat = stats.userStats.get(userId);
            userStat.count++;
            userStat.clips.push(clip);
        });

        // Tägliche Statistiken
        clips.forEach(clip => {
            const dateKey = clip.createdAt.toDateString();
            if (!stats.dailyStats.has(dateKey)) {
                stats.dailyStats.set(dateKey, 0);
            }
            stats.dailyStats.set(dateKey, stats.dailyStats.get(dateKey) + 1);
        });

        // Sortiere Benutzer nach Anzahl der Clips
        stats.topUsers = Array.from(stats.userStats.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return stats;
    },

    /**
     * Erstellt ein Statistik-Embed
     * @param {Object} stats - Statistik-Objekt
     * @param {number} days - Anzahl der Tage
     * @returns {EmbedBuilder}
     */
    createStatsEmbed(stats, days) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Medal.tv Clip Statistiken')
            .setColor('#00D4FF')
            .setTimestamp();

        let description = `**Zeitraum:** Letzte ${days} Tage\n`;
        description += `**Gesamt Clips:** ${stats.totalClips}\n`;
        description += `**Durchschnitt pro Tag:** ${stats.averagePerDay.toFixed(1)}\n\n`;

        if (stats.totalClips === 0) {
            description += '📭 Keine Clips in diesem Zeitraum gefunden.';
        } else {
            description += '**🏆 Top Clip-Poster:**\n';
            
            stats.topUsers.forEach((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                description += `${medal} **${user.username}** - ${user.count} Clip(s)\n`;
            });

            // Voting-Bereitschaft
            const minClips = parseInt(process.env.MIN_CLIPS_FOR_VOTING || 2);
            const readyForVoting = stats.totalClips >= minClips;
            
            description += `\n**🗳️ Voting-Status:**\n`;
            if (readyForVoting) {
                description += `✅ Bereit für Voting (${stats.totalClips}/${minClips} Clips)`;
            } else {
                description += `❌ Nicht bereit für Voting (${stats.totalClips}/${minClips} Clips)`;
            }
        }

        embed.setDescription(description);

        // Füge Thumbnail hinzu (Medal.tv Logo oder ähnliches)
        embed.setFooter({ text: 'Medal.tv Clip Tracker' });

        return embed;
    }
}; 