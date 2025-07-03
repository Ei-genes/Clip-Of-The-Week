const cron = require('node-cron');
const clipService = require('./clipService');
const votingService = require('./votingService');

class Scheduler {
    constructor() {
        this.jobs = [];
    }

    /**
     * Initialisiert den Scheduler
     * @param {Client} client - Discord Client
     */
    initializeScheduler(client) {
        console.log('📅 Scheduler wird initialisiert...');
        
        // Jeden Sonntag um 0:00 Uhr (Europa/Berlin Zeit) - Voting Start
        const sundayStartJob = cron.schedule('0 0 * * 0', async () => {
            console.log('🗓️ Sonntag 00:00 - Starte automatisches Voting');
            await this.startWeeklyVoting(client);
        }, {
            scheduled: true,
            timezone: process.env.TIMEZONE || 'Europe/Berlin'
        });

        // Jeden Sonntag um 20:00 Uhr (Europa/Berlin Zeit) - Voting Ende
        const sundayEndJob = cron.schedule('0 20 * * 0', async () => {
            console.log('🗓️ Sonntag 20:00 - Beende automatisches Voting');
            await this.endWeeklyVoting(client);
        }, {
            scheduled: true,
            timezone: process.env.TIMEZONE || 'Europe/Berlin'
        });

        this.jobs.push(sundayStartJob);
        this.jobs.push(sundayEndJob);
        console.log('✅ Sonntag-Voting Jobs geplant (00:00 - 20:00 Uhr)');

        // Optional: Teste den Scheduler jeden Tag um 12:00 (nur für Development)
        if (process.env.NODE_ENV === 'development') {
            const testJob = cron.schedule('0 12 * * *', async () => {
                console.log('🧪 Test-Job ausgeführt');
            }, {
                scheduled: true,
                timezone: process.env.TIMEZONE || 'Europe/Berlin'
            });
            
            this.jobs.push(testJob);
            console.log('🧪 Test-Job geplant (12:00 Uhr täglich)');
        }
    }

    /**
     * Startet das wöchentliche Voting
     * @param {Client} client - Discord Client
     */
    async startWeeklyVoting(client) {
        try {
            console.log('🔍 Sammle Clips der letzten Woche...');
            
            // Sammle Clips der letzten Woche (bis Sonntag 00:00)
            const clips = await this.getWeeklyClipsUntilSunday(client);
            
            if (clips.length === 0) {
                console.log('⚠️ Keine Clips für das Voting gefunden');
                await this.sendNoClipsMessage(client);
                return;
            }

            if (clips.length < parseInt(process.env.MIN_CLIPS_FOR_VOTING || 2)) {
                console.log(`⚠️ Nur ${clips.length} Clips gefunden, mindestens ${process.env.MIN_CLIPS_FOR_VOTING || 2} benötigt`);
                await this.sendNotEnoughClipsMessage(client, clips.length);
                return;
            }

            // Starte das Voting
            await votingService.startVoting(client, clips, false);
            
        } catch (error) {
            console.error('Fehler beim automatischen Voting:', error);
            await this.sendErrorMessage(client, error);
        }
    }

    /**
     * Sammelt Clips der letzten Woche bis Sonntag 00:00
     * @param {Client} client - Discord Client
     * @returns {Array} Array von Clips
     */
    async getWeeklyClipsUntilSunday(client) {
        try {
            const channel = await client.channels.fetch(process.env.CLIP_CHANNEL_ID);
            if (!channel) {
                throw new Error(`Clip-Kanal ${process.env.CLIP_CHANNEL_ID} nicht gefunden`);
            }

            // Berechne den Zeitraum: Letzter Sonntag 00:00 bis heute 00:00
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            // Finde den letzten Sonntag
            const lastSunday = new Date(today);
            lastSunday.setDate(today.getDate() - today.getDay() - 7);

            console.log(`📅 Sammle Clips von ${lastSunday.toLocaleDateString()} bis ${today.toLocaleDateString()}`);

            // Sammle Nachrichten aus diesem Zeitraum
            const messages = await this.fetchMessagesFromPeriod(channel, lastSunday, today);
            
            // Filtere Medal.tv Clips
            const clips = clipService.filterMedalClips(messages);
            
            console.log(`📊 ${clips.length} Clips im Zeitraum gefunden`);
            return clips;

        } catch (error) {
            console.error('Fehler beim Sammeln der wöchentlichen Clips:', error);
            throw error;
        }
    }

    /**
     * Sammelt Nachrichten aus einem bestimmten Zeitraum
     * @param {TextChannel} channel - Discord Kanal
     * @param {Date} startDate - Startdatum
     * @param {Date} endDate - Enddatum
     * @returns {Array} Array von Discord Messages
     */
    async fetchMessagesFromPeriod(channel, startDate, endDate) {
        const messages = [];
        let lastMessageId = null;

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            const batch = await channel.messages.fetch(options);
            if (batch.size === 0) break;

            // Filtere Nachrichten im Zeitraum
            const filteredBatch = batch.filter(msg => 
                msg.createdAt >= startDate && msg.createdAt < endDate
            );
            
            messages.push(...filteredBatch.values());

            // Wenn die älteste Nachricht älter als der Startzeitraum ist, stoppen
            const oldestMessage = batch.last();
            if (oldestMessage.createdAt < startDate) break;

            lastMessageId = batch.last().id;
        }

        return messages;
    }

    /**
     * Sendet eine Nachricht wenn keine Clips gefunden wurden
     * @param {Client} client - Discord Client
     */
    async sendNoClipsMessage(client) {
        try {
            const resultChannel = await client.channels.fetch(process.env.RESULT_CHANNEL_ID || process.env.VOTING_CHANNEL_ID);
            if (resultChannel) {
                await resultChannel.send({
                    content: '📭 **Kein Clip of the Week Voting diese Woche**\n\nEs wurden keine Medal.tv Clips der letzten Woche gefunden. Postet mehr Clips für das nächste Voting! 🎬'
                });
            }
        } catch (error) {
            console.error('Fehler beim Senden der "Keine Clips" Nachricht:', error);
        }
    }

    /**
     * Sendet eine Nachricht wenn nicht genügend Clips vorhanden sind
     * @param {Client} client - Discord Client
     * @param {number} clipCount - Anzahl der gefundenen Clips
     */
    async sendNotEnoughClipsMessage(client, clipCount) {
        try {
            const resultChannel = await client.channels.fetch(process.env.RESULT_CHANNEL_ID || process.env.VOTING_CHANNEL_ID);
            if (resultChannel) {
                await resultChannel.send({
                    content: `📊 **Nicht genügend Clips für ein Voting**\n\nNur ${clipCount} Clip(s) gefunden, mindestens ${process.env.MIN_CLIPS_FOR_VOTING || 2} benötigt. Postet mehr Clips für das nächste Voting! 🎬`
                });
            }
        } catch (error) {
            console.error('Fehler beim Senden der "Nicht genügend Clips" Nachricht:', error);
        }
    }

    /**
     * Sendet eine Fehlermeldung
     * @param {Client} client - Discord Client
     * @param {Error} error - Fehler-Objekt
     */
    async sendErrorMessage(client, error) {
        try {
            const resultChannel = await client.channels.fetch(process.env.RESULT_CHANNEL_ID || process.env.VOTING_CHANNEL_ID);
            if (resultChannel) {
                await resultChannel.send({
                    content: `❌ **Fehler beim automatischen Voting**\n\nEin Fehler ist aufgetreten: ${error.message}\n\nBitte kontaktiert einen Administrator.`
                });
            }
        } catch (sendError) {
            console.error('Fehler beim Senden der Fehlermeldung:', sendError);
        }
    }

    /**
     * Stoppt alle geplanten Jobs
     */
    stopAllJobs() {
        console.log('🛑 Stoppe alle geplanten Jobs...');
        this.jobs.forEach(job => {
            job.stop();
        });
        this.jobs = [];
    }

    /**
     * Beendet das wöchentliche Voting
     * @param {Client} client - Discord Client
     */
    async endWeeklyVoting(client) {
        try {
            console.log('🔚 Beende automatisches Voting...');
            
            // Finde aktive Votings
            const activeVotings = votingService.getActiveVotings();
            
            for (const voting of activeVotings) {
                if (!voting.isForced) { // Nur automatische Votings beenden
                    await votingService.endVoting(client, voting.id);
                }
            }
            
        } catch (error) {
            console.error('Fehler beim Beenden des automatischen Votings:', error);
            await this.sendErrorMessage(client, error);
        }
    }

    /**
     * Gibt Informationen über aktive Jobs zurück
     * @returns {Array} Array von Job-Informationen
     */
    getJobStatus() {
        return this.jobs.map((job, index) => ({
            id: index,
            running: job.running,
            lastDate: job.lastDate,
            nextDate: job.nextDate
        }));
    }
}

const scheduler = new Scheduler();

function initializeScheduler(client) {
    scheduler.initializeScheduler(client);
}

module.exports = { 
    initializeScheduler,
    scheduler
}; 