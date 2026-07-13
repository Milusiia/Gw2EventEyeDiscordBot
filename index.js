require('dotenv').config();
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hejoo!'));
app.listen(process.env.PORT || 3000, () => console.log('Serwer WWW gotowy.'));

const schedule = require('./schedule');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('clientReady', () => {
   console.log('Hejo');
});

client.login(process.env.DISCORD_TOKEN);

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        message.reply('pong!')
    }

    if (message.content.toLowerCase() === '!eventeye') {
        message.reply('Siemka!')
    }

    if (message.content === '!help') {
        return message.reply('Dostępne komendy:\n`**!eventy** [minuty] [kategoria]` - pokazuje eventy w najbliższym czasie, można opcjonalnie ustawić zakres czasu oraz kategorie.\n`**!przypomnij** [Nazwa] [minuty_przed]` - ustawia przypomnienie na konkretny event.\n`**!kategorie**` - wypisuje wszystkie kategorie eventów');    }

    if (message.content.toLowerCase() === '!dawid') {
        const timeInterval = 60;

        const now = new Date();
        const currentHour = (now.getUTCHours() + 2) % 24;
        const currentMinute = now.getUTCMinutes();
        const currentTime = (currentHour * 60) + currentMinute;

        let answer = ` 🚗 **Dawid** 🚗:\n\n`;
        let found = false;

        for (const boss of schedule) {
            const eventNameLower = boss.event.toLowerCase();
            const mapNameLower = boss.map.toLowerCase();

            const isConvergence = eventNameLower.includes('convergence');
            const isTheDesolation = mapNameLower === 'the desolation';
            const isAuricBasin = mapNameLower === 'auric basin';
            const isAnomaly = eventNameLower.includes('anomaly');

            if (!isConvergence && !isTheDesolation && !isAuricBasin && !isAnomaly) {
                continue;
            }

            for (const time of boss.time) {
                const eventTimeSplit = time.split(':');
                const eventTimeUTC = parseInt(eventTimeSplit[0]) * 60 + parseInt(eventTimeSplit[1]);
                const eventTime = (eventTimeUTC + 120) % 1440;

                if (eventTime >= currentTime && eventTime <= currentTime + timeInterval) {
                    const displayHour = Math.floor(eventTime / 60) % 24;
                    const displayMinute = eventTime % 60;
                    const formattedMinute = displayMinute < 10 ? '0' + displayMinute : displayMinute;

                    let dlcIcon = "⬜";
                    const dlc = boss.dlc ? boss.dlc.toLowerCase() : 'core';
                    if (dlc === 'core') dlcIcon = "🟥 ***Anomaly***" ;
                    if (dlc === 'hot') dlcIcon = "🟩 ***Auric Basin***";
                    if (dlc === 'pof') dlcIcon = "🟨 ***The Desolation***";
                    if (dlc === 'soto') dlcIcon = "🟦 ***Convergence***";

                    answer += `${dlcIcon} **${boss.event}** o **${displayHour}:${formattedMinute}** na mapie *${boss.map}* (WP: \`${boss.waypoint}\`)\n\n`;
                    found = true;
                }
            }
        }

        if (!found) {
            answer = `W ciągu najbliższych godziny nie zaczyna się żaden z Twoich ulubionych eventów.`;
            return message.reply(answer);
        }

        if (answer.length <= 1900) {
            message.reply(answer);
        } else {
            const lines = answer.split('\n');
            let currentChunk = "";

            for (const line of lines) {
                if ((currentChunk + line).length > 1900) {
                    await message.channel.send(currentChunk);
                    currentChunk = "";
                }
                currentChunk += line + '\n';
            }

            if (currentChunk.trim().length > 0) {
                await message.channel.send(currentChunk);
            }
        }
    }

    if (message.content === '!kategorie') {
        const answer = `**Dostępne kategorie filtrów dla komendy \`!eventy\`:**\n\n` +
            `🔴 **worldboss** - Klasyczni World Bossowie z podstawowej wersji gry (Core)\n` +
            `⚪ **core** - Wszystkie eventy i bossowie z podstawki (Core Game)\n` +
            `🟣 **lws1** - Living World Season 1 (np. Twisted Marionette, Battle for LA)\n` +
            `🟣 **lws2** - Living World Season 2 (Dry Top Sandstorm)\n` +
            `🟢 **hot** - Heart of Thorns (Meta eventy na mapach HoT)\n` +
            `🟣 **lws3** - Living World Season 3 (Eventy w Lake Doric)\n` +
            `🟡 **pof** - Path of Fire (Meta eventy i Piñata)\n` +
            `🟣 **lws4** - Living World Season 4 (np. Death-Branded Shatterer, Palawadan)\n` +
            `🟣 **ibs** - The Icebrood Saga (np. Drakkar, Metal Concert, Dragonstorm)\n` +
            `🔵 **eod** - End of Dragons (Meta eventy w Canthie)\n` +
            `🟠 **soto** - Secrets of the Obscure (np. Convergences, Amnytas)\n` +
            `🟤 **jw** - Janthir Wilds (np. Decima & Greer, Mount Balrior)\n\n` +
            `*Przykład użycia:* \`!eventy 60 hot\` lub \`!eventy worldboss\``;

        return message.reply(answer);
    }

    if (message.content.startsWith('!przypomnij')) {
        const args = message.content.split(' ');
        const minutesBefore = parseInt(args[args.length - 1]);
        const lookingEvent = args.slice(1, -1).join(' ');
        console.log(`Szukamy bossa: ${lookingEvent}, przypomnienie: ${minutesBefore} min przed.`);

        if (!lookingEvent || isNaN(minutesBefore)) {
            return message.reply('Użyj formatu: !przypomnij Nazwa Eventu 5 (gdzie 5 to minuty przed startem).');
        }

        const now = new Date();
        const currentHour = (now.getUTCHours() + 2) % 24;
        const currentMinute = now.getUTCMinutes();
        const currentTime = (currentHour * 60) + currentMinute;

        let foundBoss = null;
        let targetEventTime = null;
        let realEventHour = 0;
        let realEventMinute = 0;

        for (const boss of schedule) {
            if (boss.event.toLowerCase().includes(lookingEvent.toLowerCase())) {
                for (const timeStr of boss.time) {
                    const eventTimeSplit = timeStr.split(':');
                    const eventTimeUTC = parseInt(eventTimeSplit[0]) * 60 + parseInt(eventTimeSplit[1]);

                    const eventTime = eventTimeUTC + 120;

                    if (eventTime > currentTime) {
                        foundBoss = boss;
                        targetEventTime = eventTime;

                        realEventHour = Math.floor(eventTime / 60) % 24;
                        realEventMinute = eventTime % 60;
                        break;
                    }
                }
            }
            if (foundBoss) break;
        }

        if (!foundBoss) {
            return message.reply(`Nie znaleziono w bazie eventu pasującego do nazwy: ${lookingEvent}.`);
        }

        const timeWait = targetEventTime - currentTime - minutesBefore;

        if (timeWait < 0) {
            return message.reply(`Ten event zaczyna się za zbyt krótki czas, aby można było ustawić przypomnienie o ${minutesBefore} minut wcześniej!`);
        }

        const timeBase = timeWait * 60 * 1000;
        const currentSecondsMilliseconds = (now.getSeconds() * 1000) + now.getMilliseconds();
        const time = timeBase - currentSecondsMilliseconds;

        message.reply(`Przypomnienie ustawione. Zawołam Cię ${minutesBefore} minut przed rozpoczęciem **${lookingEvent}**.`);

        setTimeout(() => {
            message.reply(`Hej ${message.author}! **${lookingEvent}** zaczyna się za ${minutesBefore} minut! Szykuj się!`);
        }, time);
    }

    if (message.content.startsWith('!eventy')) {
        const args = message.content.split(' ');
        let timeInterval = 30;
        let selectedFilter = null;

        if (args[1]) {
            const parsedMin = parseInt(args[1]);
            if (isNaN(parsedMin)) {
                selectedFilter = args[1].toLowerCase();
                timeInterval = 120;
            } else {
                // Sytuacja: !eventy 60
                timeInterval = parsedMin;
                if (args[2]) {
                    selectedFilter = args[2].toLowerCase();
                }
            }
        }

        const now = new Date();
        const currentHour = (now.getUTCHours() + 2) % 24;
        const currentMinute = now.getUTCMinutes();
        const currentTime = (currentHour * 60) + currentMinute;

        let header = `Eventy zaczynające się w ciągu najbliższych ${timeInterval} minut`;
        if (selectedFilter) {
            header += ` (Filtr: **${selectedFilter.toUpperCase()}**)`;
        }
        let answer = `${header}\n`;
        let found = false;


        for (const boss of schedule) {
            if (selectedFilter) {
                if (!boss.dlc || boss.dlc.toLowerCase() !== selectedFilter) continue;
            }

            for (const time of boss.time) {
                const eventTimeSplit = time.split(':');
                const eventTimeUTC = parseInt(eventTimeSplit[0]) * 60 + parseInt(eventTimeSplit[1]);

                const eventTime = (eventTimeUTC + 120) % 1440;

                if (eventTime >= currentTime && eventTime <= currentTime + timeInterval) {
                    const displayHour = Math.floor(eventTime / 60) % 24;
                    const displayMinute = eventTime % 60;
                    const formattedMinute = displayMinute < 10 ? '0' + displayMinute : displayMinute;

                    let dlcIcon = "⚪"; // Domyślny dla Core
                    const dlc = boss.dlc ? boss.dlc.toLowerCase() : 'core';

                    if (dlc === 'core') dlcIcon = "⚪";      // Core Game - biały
                    if (dlc === 'worldboss') dlcIcon = "🔴"; // World Bosses - czerwony
                    if (dlc === 'hot') dlcIcon = "🟢";       // Heart of Thorns - zielony
                    if (dlc === 'pof') dlcIcon = "🟡";       // Path of Fire - żółty
                    if (dlc === 'eod') dlcIcon = "🔵";       // End of Dragons - niebieski
                    if (dlc === 'soto') dlcIcon = "🟠";      // Secrets of the Obscure - pomarańczowy
                    if (dlc === 'jw') dlcIcon = "🟤";   // Janthir Wilds - brązowy
                    if (dlc === 'lws1' || dlc === 'lws2' || dlc === 'lws3' || dlc === 'lws4' || dlc === 'ibs') dlcIcon = "🟣"; // Living World / IBS - fioletowy

                    answer += `${dlcIcon} **${boss.event}** o **${displayHour}:${formattedMinute}** na mapie *${boss.map}* (WP: \`${boss.waypoint}\`)\n`;
                    found = true;
                }
            }
        }

        if (!found) {
            answer = `W ciągu najbliższych ${timeInterval} minut nie zaczyna się żaden event spełniający kryteria.`;
            return message.reply(answer);
        }

        if (answer.length <= 1900) {
            message.reply(answer);
        } else {
            // Jeśli jest dłuższy, dzielimy go na linijki i wysyłamy paczkami
            const lines = answer.split('\n');
            let currentChunk = "";

            for (const line of lines) {
                // Jeśli dodanie kolejnej linijki przekroczy bezpieczny limit, wysyłamy to co mamy
                if ((currentChunk + line).length > 1900) {
                    await message.channel.send(currentChunk);
                    currentChunk = ""; // czyścimy paczkę dla kolejnych linii
                }
                currentChunk += line + '\n';
            }

            // Wysyłamy ostatnią, pozostałą część tekstu
            if (currentChunk.trim().length > 0) {
                await message.channel.send(currentChunk);
            }
        }
    }
});