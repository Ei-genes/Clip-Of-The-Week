const clipService = require('../services/clipService');
const votingService = require('../services/votingService');

module.exports = {
    name: 'forcevoting',
    description: 'Startet manuell ein Clip of the Week Voting',
    usage: 'v!forcevoting [days]',
    
    async execute(message, args) {

        try {
            // Überprüfe Admin-Berechtigung
            if (process.env.ADMIN_ROLE_ID && !message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
                return await message.reply({
                    content: '❌ Du hast keine Berechtigung, diesen Command zu verwenden.',
                    allowedMentions: { repliedUser: false }
                });
            }

            // Überprüfe ob bereits ein Voting aktiv ist
            const activeVotings = votingService.getActiveVotings();
            if (activeVotings.length > 0) {
                return await message.reply({
                    content: '⚠️ Es ist bereits ein Voting aktiv! Warte bis es beendet ist.',
                    allowedMentions: { repliedUser: false }
                });
            }

            const days = parseInt(args[0]) || 7;
            
            const statusMessage = await message.reply({
                content: `🔍 Sammle Medal.tv Clips der letzten ${days} Tage...`,
                allowedMentions: { repliedUser: false }
            });

            // Sammle Clips
            const clips = await this.getClipsFromDays(message.client, days);

            if (clips.length === 0) {
                return await statusMessage.edit({
                    content: `📭 Keine Medal.tv Clips der letzten ${days} Tage gefunden.\n\nStelle sicher, dass Clips mit "https://medal.tv/" beginnen.`
                });
            }

            if (clips.length < parseInt(process.env.MIN_CLIPS_FOR_VOTING || 2)) {
                return await statusMessage.edit({
                    content: `📊 Nur ${clips.length} Clip(s) gefunden, mindestens ${process.env.MIN_CLIPS_FOR_VOTING || 2} benötigt für ein Voting.`
                });
            }

            // Starte das Voting
            await votingService.startVoting(message.client, clips, true);

            await statusMessage.edit({
                content: `✅ **Voting erfolgreich gestartet!**\n\n📊 **${clips.length} Clips** der letzten ${days} Tage wurden gefunden.\n🔥 Stimmt mit **Flammen-Emojis** ab!\n\nÜberprüfe den Voting-Kanal! 🎬`
            });

        } catch (error) {
            console.error('Fehler beim Force-Voting:', error);
            await message.reply({
                content: `❌ **Fehler beim Starten des Votings**\n\n${error.message}`,
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

            console.log(`📅 Sammle Clips der letzten ${days} Tage (seit ${cutoffDate.toLocaleDateString()})`);

            // Sammle Nachrichten
            const messages = await this.fetchMessagesFromDays(channel, cutoffDate);
            
            // Filtere Medal.tv Clips
            const clips = clipService.filterMedalClips(messages);
            
            console.log(`📊 ${clips.length} Clips gefunden`);
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
    }
}; 