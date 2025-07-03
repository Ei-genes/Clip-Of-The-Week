// Dieses Event wird nicht mehr benötigt, da wir keine Slash Commands verwenden
// Es kann gelöscht werden oder bleibt als Platzhalter für zukünftige Erweiterungen

const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Placeholder - keine Slash Commands mehr
        return;
    },
}; 