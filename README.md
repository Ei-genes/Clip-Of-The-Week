# 🏆 Clip of the Week Discord Bot

Ein Discord Bot für automatische **Medal.tv Clip of the Week** Votings mit sauberer Dateistruktur und umfassenden Features.

## ✨ Features

- **🔄 Automatisches Voting**: Jeden Sonntag von 0:00 bis 20:00 Uhr
- **🎬 Medal.tv Integration**: Erkennt automatisch Links die mit `@https://medal.tv/` beginnen
- **🔥 Flammen-Voting**: Nutzer stimmen mit Flammen-Emojis (🔥) ab
- **🏆 Leaderboard-System**: Persistente Gewinner-Statistiken
- **📊 Statistiken**: Detaillierte Clip-Statistiken und Leaderboards
- **⚡ Force-Voting**: Manuelles Starten von Votings durch Admins
- **🛑 Stop-Voting**: Manuelles Beenden von Votings durch Admins
- **🕐 Zeitbasiert**: Clips vom Sonntag zählen für das nächste Voting
- **🤝 Gleichstand-Behandlung**: Mehrere Gewinner bei gleicher Stimmenzahl

## 📁 Dateistruktur

```
Clip of the Week/
├── package.json
├── env.template
├── README.md
└── src/
    ├── index.js                 # Hauptdatei
    ├── commands/
    │   ├── forcevoting.js       # Manuelles Voting starten
    │   ├── stopvoting.js        # Manuelles Voting beenden
    │   ├── clipstats.js         # Clip-Statistiken
    │   └── leaderboard.js       # Gewinner-Leaderboard
    ├── events/
    │   ├── ready.js             # Bot Ready Event
    │   └── interactionCreate.js # Slash Command Handler
    ├── handlers/
    │   ├── commandHandler.js    # Command Loader
    │   └── eventHandler.js      # Event Loader
    └── services/
        ├── clipService.js       # Clip-Sammlung und -Verwaltung
        ├── votingService.js     # Voting-System
        └── scheduler.js         # Automatische Votings
```

## 🚀 Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Discord Bot erstellen

1. Gehe zu [Discord Developer Portal](https://discord.com/developers/applications)
2. Erstelle eine neue Application
3. Gehe zu "Bot" und erstelle einen Bot
4. Kopiere den **Bot Token**
5. Gehe zu "OAuth2" > "URL Generator"
6. Wähle **bot** (keine applications.commands nötig)
7. Wähle folgende Bot Permissions:
   - Send Messages
   - Add Reactions
   - Read Message History
   - View Channels

### 3. Umgebungsvariablen konfigurieren

1. Kopiere `env.template` zu `.env`
2. Fülle alle Werte aus:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here

# Channel Configuration
CLIP_CHANNEL_ID=1210695651189334162
VOTING_CHANNEL_ID=1390301967850541178
RESULT_CHANNEL_ID=1390048847996129360

# Bot Configuration
BOT_PREFIX=v!
ADMIN_ROLE_ID=your_admin_role_id_here

# Voting Configuration
VOTING_START_HOUR=0
VOTING_END_HOUR=20
MIN_CLIPS_FOR_VOTING=2

# Timezone
TIMEZONE=Europe/Berlin

# Database (für Leaderboard)
DATABASE_PATH=./data/leaderboard.json
```

### 4. Bot starten

```bash
# Produktiv
npm start

# Development (mit Auto-Reload)
npm run dev
```

## 🎮 Commands

### `v!forcevoting [days]`
- **Beschreibung**: Startet manuell ein Voting
- **Parameter**: `days` (optional) - Anzahl der Tage zurück (Standard: 7)
- **Berechtigung**: Admin Role
- **Beispiel**: `v!forcevoting 3`

### `v!stopvoting`
- **Beschreibung**: Stoppt das aktuelle Voting sofort
- **Parameter**: Keine
- **Berechtigung**: Admin Role
- **Beispiel**: `v!stopvoting`

### `v!clipstats [days]`
- **Beschreibung**: Zeigt Clip-Statistiken
- **Parameter**: `days` (optional) - Anzahl der Tage zurück (Standard: 7)
- **Berechtigung**: Alle Nutzer
- **Beispiel**: `v!clipstats 14`

### `v!leaderboard [top]`
- **Beschreibung**: Zeigt das Gewinner-Leaderboard
- **Parameter**: `top` (optional) - Anzahl der Top-Spieler (Standard: 10)
- **Berechtigung**: Alle Nutzer
- **Beispiel**: `v!leaderboard 20`

### `v!help`
- **Beschreibung**: Zeigt alle verfügbaren Commands
- **Parameter**: Keine
- **Berechtigung**: Alle Nutzer
- **Beispiel**: `v!help`

## 🔧 Konfiguration

### Clip-Format
Der Bot erkennt automatisch Medal.tv Links die so beginnen:
```
https://medal.tv/games/valorant/clips/abcd1234
```

### Voting-Zeitplan
- **Automatisch**: Jeden Sonntag von 0:00 bis 20:00 Uhr (Europa/Berlin)
- **Dauer**: 20 Stunden (konfigurierbar)
- **Clips**: Letzte 7 Tage (bis Sonntag 00:00)

### Voting-Regeln
- Mindestens 2 Clips erforderlich (konfigurierbar)
- Unbegrenzte Anzahl Clips pro Voting
- Clips vom Sonntag zählen für das nächste Voting
- Abstimmung per Flammen-Emoji (🔥)
- Mehrere Gewinner bei Gleichstand möglich

## 🛠️ Development

### Ordnerstruktur erweitern
```bash
# Neue Commands hinzufügen
src/commands/newcommand.js

# Neue Events hinzufügen
src/events/newevent.js

# Neue Services hinzufügen
src/services/newservice.js
```

### Logging
Der Bot loggt alle wichtigen Aktivitäten:
- Clip-Sammlung
- Voting-Start/Ende
- Fehler und Warnungen
- Scheduler-Aktivitäten

### Error Handling
- Umfassende Fehlerbehandlung
- Graceful Shutdown
- Automatische Wiederherstellung

## 📊 Features im Detail

### Automatisches Voting
- Läuft jeden Sonntag von 0:00 bis 20:00 Uhr
- Sammelt Clips der letzten Woche
- Erstellt automatisch Voting-Nachricht + separate Clip-Links
- Fügt Flammen-Reaktionen hinzu
- Verkündet Gewinner nach 20h

### Clip-Erkennung
- Regex-basierte Erkennung: `^https://medal\.tv/[^\s]+`
- Automatische URL-Extraktion
- Duplikat-Vermeidung
- Zeitbasierte Filterung

### Voting-System
- Flammen-basierte Abstimmung (🔥)
- Automatische Stimmauszählung
- Mehrere Gewinner bei Gleichstand
- Detaillierte Ergebnisse
- Persistentes Leaderboard-System

### Leaderboard-System
- Speichert alle Gewinner persistent
- Zeigt Siege, Gesamt-Flammen und Durchschnitt
- Sortierung nach Siegen, dann nach Gesamt-Stimmen
- Letztes Gewinn-Datum wird gespeichert

## 🔒 Sicherheit

- Admin-Berechtigung für Force-Voting
- Eingabe-Validierung
- Rate-Limiting durch Discord
- Sichere Token-Verwaltung

## 🐛 Troubleshooting

### Bot startet nicht
- Überprüfe `.env` Datei
- Stelle sicher, dass alle Tokens korrekt sind
- Überprüfe Bot-Berechtigungen

### Keine Clips gefunden
- Stelle sicher, dass Clips mit `@https://medal.tv/` beginnen
- Überprüfe Kanal-ID in `.env`
- Teste mit `/clipstats`

### Voting startet nicht
- Überprüfe Voting-Kanal-ID
- Stelle sicher, dass genügend Clips vorhanden sind
- Überprüfe Bot-Berechtigungen im Voting-Kanal

## 📝 Lizenz

MIT License - Siehe LICENSE Datei für Details.

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

---

**Viel Spaß mit dem Clip of the Week Bot! 🎬🏆** 