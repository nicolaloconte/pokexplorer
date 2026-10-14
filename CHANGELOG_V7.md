# Pokéxplorer V7 — Stabilizzazione interfaccia e cinematiche

## Modifiche

1. **Valigetta iniziale:** le tre sfere ora utilizzano un unico SVG locale per ciascuna Poké Ball, con aspect ratio fisso 1:1; eliminate le tre metà CSS soggette a disallineamento. Rimangono la selezione e l'anteprima dei tre starter.
2. **Piattaforme:** corrette le quote verticali di Pokémon e allenatori nella scena lotta senza cambiare i fondali V6 che erano stati approvati.
3. **Animazioni:** lancio, evocazione, richiamo e cattura impiegano la Web Animations API, con coordinate calcolate prima della scena e interpolazione su `transform`/`opacity` al posto di animare `left` e `top` a ogni frame. Le preferenze `prefers-reduced-motion` sono rispettate.
4. **Red e allenatori:** Red in combattimento usa la posa `red-gen3.png`; restano gli sprite Gen 3 dedicati alle classi allenatore e ai capipalestra. Introdotto il preload per ridurre le attese di caricamento nel mezzo di un'introduzione.
5. **Pulsanti:** pulsanti LOTTA, FUGA e mosse interamente hit-testabili, inclusi i bordi interni. Corrette le interferenze tra gli eventi globali di avanzamento testo e il menu.
6. **Conferme:** il pannello conferma resta ma non oscura più tutto il campo. Conservati i comandi Conferma/Annulla per uso oggetti e cambio Pokémon.
7. **Abitanti delle città:** la selezione delle apparizioni ora usa 16 fogli sprite nominati di FireRed/LeafGreen dal progetto pret/pokefirered, mostrando il primo fotogramma dell'overworld, senza generazione grafica casuale. Le posizioni continuano a rispettare gli ostacoli/edifici. Il protagonista sulla mappa usa il foglio `red_normal.png` della stessa fonte.
8. **Codice:** aggiunte funzioni riutilizzabili `playMotion`, `battleSpritePosition` e `preloadBattleTrainers`; regole grafiche V7 isolate in `style-v7.css`.

## Verifiche eseguite

- Node.js `--check` per tutti i file JavaScript, senza errori.
- Browser Chromium headless + Playwright: scelta starter, interazione con la valigetta, ingresso in battaglia, animazioni delle mosse e cattura riuscita.
- Hit test in cinque punti interni di **entrambi** i pulsanti LOTTA e FUGA, più clic reale su LOTTA e clic reale su FUGA: esito positivo.
- Selezione delle mosse e ritorno al menu: esito positivo.
- Conferme senza oscuramento e clic su Conferma/Annulla: esito positivo.
- Cambio Pokémon in battaglia seguito da fuga da un incontro selvatico: verifiche funzionali superate (test con dati fittizi e mosse avversarie controllate).
- **100 mappe generate**: 80 percorsi e 20 città/villaggi; tutti gli elementi obbligatori raggiungibili, quantità oggetti/allenatori/raid entro i limiti, almeno tre sprite NPC distinti per città.
- Nessun errore JavaScript durante le prove principali.

## Limiti e dipendenze

- I test automatici del browser usano risposte **simulate di PokéAPI e delle immagini esterne**: non equivalgono al completamento di una partita dal primo all'ultimo livello, né a test prestazionali su un PC Windows reale.
- Gli sprite ufficiali dell'overworld sono richiesti a `raw.githubusercontent.com/pret/pokefirered/...`; quelli delle sfide a `play.pokemonshowdown.com/sprites/trainers/`. **Internet necessario** per caricare tali immagini. Quando la sorgente online non è disponibile, la mappa usa le illustrazioni locali precedenti come fallback. I Pokémon e le mosse usano già PokéAPI.
- Le immagini Pokémon sono proprietà dei rispettivi titolari: l'integrazione di immagini di giochi commerciali in una distribuzione pubblica richiede attenzione ai relativi diritti. Il progetto pret/pokefirered è usato come riferimento per gli sprite di Rosso Fuoco/Verde Foglia; Showdown include anche sprite di autori terzi, da attribuire secondo le indicazioni della sua directory.
- Questa build non rappresenta un benchmark misurato degli FPS; rende le animazioni più adatte al compositing GPU, ma la fluidità effettiva dipende da dispositivo/browser.
