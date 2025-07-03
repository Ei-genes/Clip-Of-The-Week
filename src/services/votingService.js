const { EmbedBuilder } = require('discord.js');
const clipService = require('./clipService');

class VotingService {
    constructor() {
        this.activeVotings = new Map(); // Speichert aktive Votings
    }

    /**
     * Startet ein neues Voting
     * @param {Client} client - Discord Client
     * @param {Array} clips - Array von Clips
     * @param {boolean} isForced - Ob das Voting manuell gestartet wurde
     * @returns {Object} Voting-Objekt
     */
    async startVoting(client, clips, isForced = false) {
        try {
            if (clips.length < parseInt(process.env.MIN_CLIPS_FOR_VOTING || 2)) {
                throw new Error(`Mindestens ${process.env.MIN_CLIPS_FOR_VOTING || 2} Clips benötigt für ein Voting`);
            }

            const votingChannelId = process.env.VOTING_CHANNEL_ID;
            const votingChannel = await client.channels.fetch(votingChannelId);
            
            if (!votingChannel) {
                throw new Error(`Voting-Kanal ${votingChannelId} nicht gefunden`);
            }

            // Alle Clips verwenden (keine Limitierung mehr)
            const votingClips = clips;
            
            const embed = clipService.createVotingEmbed(votingClips);
            
            if (isForced) {
                embed.setFooter({ text: 'Manuell gestartetes Voting' });
            }

            const votingMessage = await votingChannel.send({ embeds: [embed] });

            // Sende separate Nachrichten für Clip-Links mit 1 Sekunde Verzögerung
            const clipMessages = clipService.createClipMessages(votingClips);
            const clipMessageObjects = [];
            
            for (let i = 0; i < clipMessages.length; i++) {
                const clipMessage = clipMessages[i];
                const msg = await votingChannel.send({ content: clipMessage });
                await msg.react('🔥');
                clipMessageObjects.push(msg);
                
                // Warte 1 Sekunde vor dem nächsten Clip (außer beim letzten)
                if (i < clipMessages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Speichere das Voting
            const endHour = parseInt(process.env.VOTING_END_HOUR || 20);
            const endTime = new Date();
            endTime.setHours(endHour, 0, 0, 0);
            
            // Wenn es bereits nach der Endzeit ist, setze auf nächsten Tag
            if (endTime <= new Date()) {
                endTime.setDate(endTime.getDate() + 1);
            }
            
            const voting = {
                id: votingMessage.id,
                clips: votingClips,
                startTime: new Date(),
                endTime: endTime,
                channelId: votingChannelId,
                messageId: votingMessage.id,
                clipMessages: clipMessageObjects,
                isActive: true,
                isForced
            };

            this.activeVotings.set(votingMessage.id, voting);

            console.log(`🗳️ Voting gestartet mit ${votingClips.length} Clips`);
            
            // Plane das Ende des Votings
            const timeUntilEnd = endTime.getTime() - Date.now();
            setTimeout(() => {
                this.endVoting(client, votingMessage.id);
            }, timeUntilEnd);

            return voting;

        } catch (error) {
            console.error('Fehler beim Starten des Votings:', error);
            throw error;
        }
    }

    /**
     * Beendet ein Voting und verkündet den Gewinner
     * @param {Client} client - Discord Client
     * @param {string} votingId - ID des Votings
     */
    async endVoting(client, votingId) {
        try {
            const voting = this.activeVotings.get(votingId);
            if (!voting || !voting.isActive) {
                console.log(`Voting ${votingId} nicht gefunden oder bereits beendet`);
                return;
            }

            const channel = await client.channels.fetch(voting.channelId);
            const message = await channel.messages.fetch(voting.messageId);

            if (!message) {
                console.error(`Voting-Nachricht ${voting.messageId} nicht gefunden`);
                return;
            }

            // Sammle die Stimmen
            const results = await this.countVotes(voting.clipMessages, voting.clips);
            
            // Erstelle Ergebnis-Embed (ohne Links)
            const resultEmbed = this.createResultEmbed(results, voting.clips);
            
            // Bestimme Ziel-Kanal für Ergebnisse
            const resultChannelId = process.env.RESULT_CHANNEL_ID;
            let targetChannel = channel; // Standard: Voting-Kanal
            
            if (resultChannelId && resultChannelId !== voting.channelId) {
                try {
                    const resultChannel = await client.channels.fetch(resultChannelId);
                    if (resultChannel) {
                        targetChannel = resultChannel;
                        console.log('📊 Verwende separaten Ergebnis-Kanal');
                    }
                } catch (error) {
                    console.error('Fehler beim Abrufen des Ergebnis-Kanals:', error);
                }
            }
            
            // Sende Ergebnis-Embed
            await targetChannel.send({ embeds: [resultEmbed] });
            
            // Sende Gewinner-Links als separate Nachrichten
            if (results.winners.length > 0) {
                for (const winner of results.winners) {
                    await targetChannel.send({
                        content: `🏆 **Clip of the Week Gewinner:** <@${winner.clip.author.id}>\n${winner.clip.url}`
                    });
                }
            }

            // Speichere Gewinner im Leaderboard
            if (results.winners.length > 0) {
                await this.saveWinners(results.winners);
            }

            // Lösche alle Voting-Nachrichten aus dem Voting-Kanal
            try {
                console.log('🧹 Lösche Voting-Nachrichten...');
                
                // Lösche das Voting-Embed
                await message.delete();
                
                // Lösche alle Clip-Nachrichten
                for (const clipMessage of voting.clipMessages) {
                    try {
                        await clipMessage.delete();
                    } catch (error) {
                        console.error('Fehler beim Löschen einer Clip-Nachricht:', error);
                    }
                }
                
                console.log('✅ Voting-Nachrichten gelöscht');
            } catch (error) {
                console.error('Fehler beim Löschen der Voting-Nachrichten:', error);
            }

            // Markiere Voting als beendet
            voting.isActive = false;
            this.activeVotings.set(votingId, voting);

            const winnerNames = results.winners.map(w => w.clip.author.username).join(', ');
            console.log(`🏆 Voting beendet. Gewinner: ${winnerNames || 'Niemand'}`);

        } catch (error) {
            console.error('Fehler beim Beenden des Votings:', error);
        }
    }

    /**
     * Zählt die Stimmen eines Votings
     * @param {Array} clipMessages - Array von Clip-Nachrichten
     * @param {Array} clips - Array von Clips
     * @returns {Object} Voting-Ergebnisse
     */
    async countVotes(clipMessages, clips) {
        const votes = [];

        for (let i = 0; i < clips.length; i++) {
            const clipMessage = clipMessages[i];
            const reaction = clipMessage.reactions.cache.get('🔥');
            
            if (reaction) {
                // Subtrahiere 1 für die Bot-Reaktion
                const voteCount = reaction.count - 1;
                votes.push({
                    clip: clips[i],
                    votes: Math.max(0, voteCount)
                });
            } else {
                votes.push({
                    clip: clips[i],
                    votes: 0
                });
            }
        }

        // Sortiere nach Stimmen (höchste zuerst)
        votes.sort((a, b) => b.votes - a.votes);

        // Finde alle Gewinner (bei Gleichstand)
        const maxVotes = votes[0]?.votes || 0;
        const winners = votes.filter(vote => vote.votes === maxVotes && vote.votes > 0);

        return {
            votes,
            winners: winners.length > 0 ? winners : [],
            totalVotes: votes.reduce((sum, vote) => sum + vote.votes, 0)
        };
    }

    /**
     * Erstellt ein Gewinner-Embed (nur Gewinner, keine Details)
     * @param {Object} results - Voting-Ergebnisse
     * @param {Array} clips - Array von Clips
     * @returns {EmbedBuilder}
     */
    createResultEmbed(results, clips) {
        const embed = new EmbedBuilder()
            .setTitle('🏆 Clip of the Week - Gewinner!')
            .setColor('#FFD700')
            .setTimestamp();

        let description = '';

        if (results.winners.length > 0) {
            if (results.winners.length === 1) {
                description += `**🥇 Gewinner: ${results.winners[0].clip.author.displayName || results.winners[0].clip.author.username}**\n`;
                description += `🔥 ${results.winners[0].votes} Flammen`;
                embed.setThumbnail(results.winners[0].clip.author.displayAvatarURL());
            } else {
                description += `**🥇 Gewinner (Gleichstand):**\n`;
                results.winners.forEach(winner => {
                    description += `• ${winner.clip.author.displayName || winner.clip.author.username} - 🔥 ${winner.votes} Flammen\n`;
                });
            }
        } else {
            description += '**Kein Gewinner - keine Stimmen abgegeben**';
        }

        embed.setDescription(description);

        return embed;
    }

    /**
     * Überprüft ob ein Voting aktiv ist
     * @param {string} votingId - ID des Votings
     * @returns {boolean}
     */
    isVotingActive(votingId) {
        const voting = this.activeVotings.get(votingId);
        return voting && voting.isActive;
    }

    /**
     * Gibt alle aktiven Votings zurück
     * @returns {Array} Array von aktiven Votings
     */
    getActiveVotings() {
        return Array.from(this.activeVotings.values()).filter(voting => voting.isActive);
    }

    /**
     * Speichert Gewinner im Leaderboard
     * @param {Array} winners - Array von Gewinnern
     */
    async saveWinners(winners) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const dbPath = process.env.DATABASE_PATH || './data/leaderboard.json';
            const dbDir = path.dirname(dbPath);
            
            // Erstelle Ordner falls nicht vorhanden
            await fs.mkdir(dbDir, { recursive: true });
            
            let leaderboard = {};
            
            // Lade existierende Daten
            try {
                const data = await fs.readFile(dbPath, 'utf8');
                leaderboard = JSON.parse(data);
            } catch (error) {
                // Datei existiert nicht, erstelle neue
                leaderboard = {};
            }
            
            // Aktualisiere Leaderboard
            winners.forEach(winner => {
                const userId = winner.clip.author.id;
                const username = winner.clip.author.displayName || winner.clip.author.username;
                
                if (!leaderboard[userId]) {
                    leaderboard[userId] = {
                        username: username,
                        wins: 0,
                        totalVotes: 0,
                        lastWin: null
                    };
                }
                
                leaderboard[userId].wins += 1;
                leaderboard[userId].totalVotes += winner.votes;
                leaderboard[userId].lastWin = new Date().toISOString();
                leaderboard[userId].username = username; // Update username
            });
            
            // Speichere Daten
            await fs.writeFile(dbPath, JSON.stringify(leaderboard, null, 2));
            
        } catch (error) {
            console.error('Fehler beim Speichern der Gewinner:', error);
        }
    }

    /**
     * Lädt das Leaderboard
     * @returns {Object} Leaderboard-Daten
     */
    async loadLeaderboard() {
        const fs = require('fs').promises;
        
        try {
            const dbPath = process.env.DATABASE_PATH || './data/leaderboard.json';
            const data = await fs.readFile(dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    /**
     * Stoppt ein aktives Voting
     * @param {Client} client - Discord Client
     * @param {string} votingId - ID des Votings
     */
    async stopVoting(client, votingId) {
        try {
            const voting = this.activeVotings.get(votingId);
            if (!voting || !voting.isActive) {
                return false;
            }

            // Beende das Voting sofort
            await this.endVoting(client, votingId);
            return true;

        } catch (error) {
            console.error('Fehler beim Stoppen des Votings:', error);
            return false;
        }
    }
}

module.exports = new VotingService(); 