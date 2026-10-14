# Pokéxplorer V7.2 — Fine della beta di Kanto

Versione basata su **Pokéxplorer V7.1**, con il resto della grafica e del gameplay mantenuti.

## Novità

- Intro allenatori: le classi visive residue vengono rimosse a ogni incontro, così non si accumulano vecchie pose; lo sprite avversario occupa un solo box visivo.
- Allenatori sulla mappa: applicato un ritaglio più stretto alla prima posa dei fogli sprite FireRed per limitare il difetto delle immagini adiacenti visibili.
- Red: durante l'introduzione della battaglia compare più in basso, con la parte inferiore ritagliata immediatamente sopra la chat; durante l'inizio dello scontro non è mostrato prematuramente.
- Finale: raggiungendo l'uscita dell'**ottava città (livello 80)**, dopo aver conquistato tutte le **otto medaglie** e sconfitto Giovanni, appare la schermata:
  **«CONGRATULAZIONI! HAI VINTO... O QUASI!»**
- Sotto il titolo appare il messaggio: **«Il gioco è ancora in fase di beta, attualmente stiamo preparando nuovi aggiornamenti!»**
- Pulsanti: **FOTO RICORDO** e **TORNA AL MENÙ PRINCIPALE**.
- Foto Ricordo: cartolina con sei posti squadra (gli slot liberi restano vuoti), i Pokémon presenti con nome/livello/sprite, le otto medaglie di Kanto e la scritta **«INVIA QUESTO SCREEN SU DISCORD A @17nico»**.
- **INDIETRO** dalla foto torna alle congratulazioni, che possono essere riviste o chiuse tornando al menu.
- Il ritorno al menu azzera stato di battaglie, palestra, squadra, medaglie, oggetti e fine avventura; è possibile iniziare una nuova partita.

## Regole di sblocco

La fine **non compare automaticamente dopo Giovanni**: richiede di raggiungere il portale finale del livello 80, possedere le otto medaglie distinte e aver completato i piani palestra 10, 20, 30, 40, 50, 60, 70, 80. L'uscita resta bloccata se mancano le medaglie richieste.

## Verifiche

- `node --check js/engine.js`
- `node --check js/main.js`
- `node --check js/pokemon.js`
- `node tests/regression-v71.cjs` — 200 dungeon + 24 città/villaggi, collisioni, pesca, raid e progressione
- `node tests/regression-v72.cjs` — guard del finale, otto medaglie, foto squadra, ritorno al menu e pulizia introduzione battaglia
- Browser Chromium (test di interazione DOM): Foto Ricordo → Indietro → Menù Principale; nessun errore JavaScript osservato
- Anteprime statiche del layout della vittoria e della foto, anche su viewport ridotta

## Note

La Foto Ricordo è una **schermata da catturare con screenshot** del browser/sistema: il gioco non carica immagini su Discord e non salva una fotografia automaticamente.

Alcune risorse di sprite Pokémon e allenatori restano caricate da fonti esterne. La resa delle immagini remote e il ritaglio degli sprite dei vari allenatori andranno verificati anche nella tua installazione locale con Internet attivo.

Installazione: estrai integralmente lo ZIP in una nuova cartella e apri `Game/index.html`; non combinare a mano file di diverse release.
