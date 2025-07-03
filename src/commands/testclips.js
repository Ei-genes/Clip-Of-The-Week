const clipService = require('../services/clipService');

module.exports = {
    name: 'testclips',
    description: 'Testet die Clip-Erkennung (Debug)',
    usage: 'v!testclips [days]',

    async execute(message, args) {
        try {
            // Überprüfe Admin-Berechtigung
            if (process.env.ADMIN_ROLE_ID && !message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
                return await message.reply({
                    content: '❌ Du hast keine Berechtigung, diesen Command zu verwenden.',
                    allowedMentions: { repliedUser: false }
                });
            }

            const days = parseInt(args[0]) || 7;
            
            const statusMessage = await message.reply({
                content: `🔍 **DEBUG:** Teste Clip-Erkennung der letzten ${days} Tage...\n\n*Schaue in die Konsole für Details!*`,
                allowedMentions: { repliedUser: false }
            });

            const channel = await message.client.channels.fetch(process.env.CLIP_CHANNEL_ID);
            if (!channel) {
                return await statusMessage.edit({
                    content: `❌ Clip-Kanal ${process.env.CLIP_CHANNEL_ID} nicht gefunden`
                });
            }

            console.log(`\n🧪 === DEBUG: Teste Clip-Erkennung ===`);
            console.log(`📍 Kanal: ${channel.name} (${channel.id})`);
            console.log(`📅 Zeitraum: Letzte ${days} Tage`);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Sammle Nachrichten mit Debug-Info
            const messages = await this.fetchMessagesFromDays(channel, cutoffDate);
            
            // Teste jede Nachricht
            console.log(`\n🔍 === Teste ${messages.length} Nachrichten ===`);
            let foundClips = 0;
            
            for (const msg of messages.slice(0, 20)) { // Nur erste 20 für Debug
                console.log(`\n📝 Nachricht von ${msg.author.username}:`);
                console.log(`   Content: "${msg.content}"`);
                console.log(`   Datum: ${msg.createdAt.toLocaleString()}`);
                
                const isMedal = clipService.isMedalClip(msg.content);
                if (isMedal) {
                    foundClips++;
                    const url = clipService.extractMedalUrl(msg.content);
                    console.log(`   ✅ MEDAL CLIP GEFUNDEN: ${url}`);
                } else {
                    console.log(`   ❌ Kein Medal.tv Clip`);
                }
            }

            // Filtere Medal.tv Clips
            const clips = clipService.filterMedalClips(messages);
            
            console.log(`\n📊 === ERGEBNIS ===`);
            console.log(`Nachrichten gesamt: ${messages.length}`);
            console.log(`Medal.tv Clips gefunden: ${clips.length}`);
            console.log(`===================\n`);

            await statusMessage.edit({
                content: `🧪 **DEBUG Ergebnis:**\n\n📨 **${messages.length}** Nachrichten der letzten ${days} Tage gefunden\n🎬 **${clips.length}** Medal.tv Clips erkannt\n\n*Details in der Konsole!*`
            });

        } catch (error) {
            console.error('Fehler beim Test-Command:', error);
            await message.reply({
                content: `❌ **Fehler beim Testen**\n\n${error.message}`,
                allowedMentions: { repliedUser: false }
            });
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