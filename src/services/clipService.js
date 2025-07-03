const { EmbedBuilder } = require('discord.js');

class ClipService {
    constructor() {
        this.medalUrlRegex = /^https:\/\/medal\.tv\/[^\s]+/;
        this.mp4UrlRegex = /https?:\/\/[^\s]+\.mp4/i;
    }

    /**
     * Sammelt alle Medal.tv Clips aus dem angegebenen Kanal der letzten Woche
     * @param {Client} client - Discord Client
     * @param {string} channelId - ID des Clip-Kanals
     * @returns {Array} Array von Clip-Objekten
     */
    async getWeeklyClips(client, channelId) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                throw new Error(`Kanal ${channelId} nicht gefunden`);
            }

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            // Sammle alle Nachrichten der letzten Woche
            const messages = await this.fetchMessagesFromWeek(channel, oneWeekAgo);
            
            // Filtere Medal.tv Clips
            const clips = this.filterMedalClips(messages);
            
            console.log(`📊 ${clips.length} Medal.tv Clips der letzten Woche gefunden`);
            return clips;

        } catch (error) {
            console.error('Fehler beim Sammeln der Clips:', error);
            throw error;
        }
    }

    /**
     * Sammelt alle Nachrichten aus dem Kanal seit dem angegebenen Datum
     * @param {TextChannel} channel - Discord Kanal
     * @param {Date} since - Datum seit wann gesammelt werden soll
     * @returns {Array} Array von Discord Messages
     */
    async fetchMessagesFromWeek(channel, since) {
        const messages = [];
        let lastMessageId = null;
        let totalFetched = 0;

        console.log(`📅 Sammle Nachrichten seit: ${since.toLocaleString()}`);

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            const batch = await channel.messages.fetch(options);
            if (batch.size === 0) {
                console.log(`📭 Keine weiteren Nachrichten gefunden`);
                break;
            }

            totalFetched += batch.size;
            console.log(`📨 Batch geladen: ${batch.size} Nachrichten (Gesamt: ${totalFetched})`);

            const filteredBatch = batch.filter(msg => msg.createdAt >= since);
            messages.push(...filteredBatch.values());

            console.log(`✅ Gefiltert: ${filteredBatch.size} Nachrichten im Zeitraum`);

            // Wenn die älteste Nachricht in diesem Batch älter als eine Woche ist, stoppen
            const oldestMessage = batch.last();
            if (oldestMessage.createdAt < since) {
                console.log(`⏰ Älteste Nachricht erreicht: ${oldestMessage.createdAt.toLocaleString()}`);
                break;
            }

            lastMessageId = batch.last().id;
        }

        console.log(`📊 Gesamt gesammelte Nachrichten: ${messages.length}`);
        return messages;
    }

    /**
     * Filtert Medal.tv Clips und MP4-Dateien aus den Nachrichten
     * @param {Array} messages - Array von Discord Messages
     * @returns {Array} Array von Clip-Objekten
     */
    filterMedalClips(messages) {
        const clips = [];

        for (const message of messages) {
            // Prüfe Medal.tv Links im Text
            if (this.isMedalClip(message.content)) {
                clips.push({
                    id: message.id,
                    url: this.extractMedalUrl(message.content),
                    author: message.author,
                    createdAt: message.createdAt,
                    content: message.content,
                    message: message,
                    type: 'medal'
                });
            }
            // Prüfe MP4-Anhänge
            else if (this.hasMP4Attachment(message)) {
                const mp4Attachment = this.getMP4Attachment(message);
                clips.push({
                    id: message.id,
                    url: mp4Attachment.url,
                    author: message.author,
                    createdAt: message.createdAt,
                    content: message.content || 'MP4 Video',
                    message: message,
                    type: 'mp4',
                    filename: mp4Attachment.name
                });
            }
        }

        return clips.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Überprüft ob eine Nachricht ein Medal.tv Clip oder MP4 ist
     * @param {string} content - Nachrichteninhalt
     * @returns {boolean}
     */
    isMedalClip(content) {
        // Teste sowohl Medal.tv als auch MP4 URLs
        const hasMedal = content.includes('medal.tv') || this.medalUrlRegex.test(content);
        const hasMp4 = this.mp4UrlRegex.test(content);
        const result = hasMedal || hasMp4;
        console.log(`🔍 Checking message: "${content.substring(0, 100)}..." -> Medal.tv: ${hasMedal}, MP4: ${hasMp4}, Result: ${result}`);
        return result;
    }

    /**
     * Extrahiert die Clip-URL aus dem Nachrichteninhalt (Medal.tv oder MP4)
     * @param {string} content - Nachrichteninhalt
     * @returns {string} Clip-URL
     */
    extractMedalUrl(content) {
        // Erst Medal.tv URLs suchen
        const medalRegex = /https:\/\/medal\.tv\/[^\s]+/g;
        const medalMatch = content.match(medalRegex);
        
        if (medalMatch) {
            const url = medalMatch[0];
            console.log(`🔗 Extracted Medal.tv URL from "${content.substring(0, 50)}...": ${url}`);
            return url;
        }
        
        // Dann MP4 URLs suchen
        const mp4Match = content.match(this.mp4UrlRegex);
        if (mp4Match) {
            const url = mp4Match[0];
            console.log(`🔗 Extracted MP4 URL from "${content.substring(0, 50)}...": ${url}`);
            return url;
        }
        
        console.log(`🔗 No URL found in "${content.substring(0, 50)}..."`);
        return null;
    }

    /**
     * Überprüft ob eine Nachricht MP4-Anhänge hat
     * @param {Message} message - Discord Message
     * @returns {boolean}
     */
    hasMP4Attachment(message) {
        if (!message.attachments || message.attachments.size === 0) {
            return false;
        }
        
        const hasMP4 = message.attachments.some(attachment => 
            attachment.name && attachment.name.toLowerCase().endsWith('.mp4')
        );
        
        console.log(`🎬 Checking attachments: ${message.attachments.size} total, MP4 found: ${hasMP4}`);
        return hasMP4;
    }

    /**
     * Holt das erste MP4-Attachment aus einer Nachricht
     * @param {Message} message - Discord Message
     * @returns {Object} Attachment-Objekt
     */
    getMP4Attachment(message) {
        const mp4Attachment = message.attachments.find(attachment => 
            attachment.name && attachment.name.toLowerCase().endsWith('.mp4')
        );
        
        console.log(`🎬 Found MP4 attachment: ${mp4Attachment?.name}`);
        return mp4Attachment;
    }

    /**
     * Erstellt ein Embed für die Clip-Anzeige
     * @param {Object} clip - Clip-Objekt
     * @param {number} index - Position in der Liste
     * @returns {EmbedBuilder}
     */
    createClipEmbed(clip, index) {
        const embed = new EmbedBuilder()
            .setTitle(`🎬 Clip #${index + 1}`)
            .setDescription(`**Von:** ${clip.author.displayName || clip.author.username}\n**Link:** ${clip.url}`)
            .setColor('#FF6B6B')
            .setTimestamp(clip.createdAt)
            .setFooter({ text: 'Medal.tv Clip' });

        if (clip.author.displayAvatarURL()) {
            embed.setThumbnail(clip.author.displayAvatarURL());
        }

        return embed;
    }

    /**
     * Erstellt ein Voting-Embed (ohne Links)
     * @param {Array} clips - Array von Clips
     * @returns {EmbedBuilder}
     */
    createVotingEmbed(clips) {
        const embed = new EmbedBuilder()
            .setTitle('🏆 Clip of the Week - Voting!')
            .setDescription(`🔥 **Das Voting hat gestartet!**\n\nVote für deinen Lieblings-Clip der Woche!\n\n**${clips.length} Clips** stehen zur Auswahl\n\n💥 Reagiere mit 🔥 auf die Clips unten\n⏰ Voting läuft bis 20:00 Uhr`)
            .setColor('#FF4500')
            .setTimestamp()
            .setThumbnail('https://cdn.discordapp.com/emojis/692653841693581362.png'); // Feuer Emoji als Thumbnail
        
        return embed;
    }

    /**
     * Erstellt separate Nachrichten für Clip-Links
     * @param {Array} clips - Array von Clips
     * @returns {Array} Array von Nachrichten-Strings
     */
    createClipMessages(clips) {
        const messages = [];
        
        clips.forEach((clip, index) => {
            const message = `**${index + 1}.** <@${clip.author.id}>\n${clip.url}`;
            messages.push(message);
        });
        
        return messages;
    }
}

module.exports = new ClipService(); 