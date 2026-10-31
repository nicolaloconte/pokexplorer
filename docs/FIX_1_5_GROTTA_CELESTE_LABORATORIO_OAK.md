# Pokéxplorer Beta 1.5 — Spedizione Grotta Celeste, laboratorio Oak e sprite

## Fonte
Beta 1.4.3 di Pokéxplorer, più le due immagini definitive del Professor Oak fornite dall'utente (tavola overworld e mugshot).

## Comportamento
1. Al piano 75 Oak spiega il rischio e invita il giocatore a entrare nella Grotta Celeste. Il NO resta reversibile.
2. Dopo il SÌ si apre una schermata: il giocatore sceglie **1 o 2 Pokémon** della propria squadra. Deve lasciarne almeno **uno** al villaggio per garantire che la partita possa proseguire in caso di sconfitta. La selezione è confermata esplicitamente.
3. Solo la squadra scelta entra nella grotta. I Pokémon non scelti vengono conservati in memoria, fuori dalle battaglie e al sicuro nel villaggio.
4. All'interno della Grotta un singolo Pokémon esausto **non viene eliminato immediatamente**: può essere recuperato dopo una spedizione conclusa con cattura. La perdita definitiva si applica alla squadra della spedizione **solo quando tutti i suoi membri vengono sconfitti**.
5. Se l'intera spedizione viene sconfitta, ritorno al villaggio, perdita di entrambi (o dell'unico) partecipanti, ripristino dei Pokémon rimasti al sicuro e checkpoint aggiornato. La sconfitta non apre Game Over se ci sono Pokémon rimasti al villaggio.
6. La fase di Mewtwo si conclude soltanto con una **cattura**, non semplicemente con il KO nella seconda battaglia. Dopo un KO senza cattura è possibile riprovare la seconda battaglia.
7. Dopo la cattura di Mewtwo e l'epilogo nella grotta, i partecipanti e i Pokémon rimasti al villaggio vengono riuniti. Con 4 riservisti + 2 partecipanti + Mewtwo = 7, Oak chiede obbligatoriamente quale Pokémon depositare.
8. Il Pokémon scelto va nel **Laboratorio Oak** senza perdere dati (specie, nickname, sesso, shiny, abilità, mosse, livelli, statistiche, PP e HP). La squadra scende a 6. Il laboratorio è accessibile nei villaggi e nelle città tramite il nuovo pulsante della barra sinistra, visibile quando ha almeno un Pokémon custodito. È possibile ritirare Pokémon con uno spazio disponibile e depositarne altri senza lasciare la squadra vuota.
9. Conservata la compatibilità con il checkpoint `version:2`: il nuovo campo opzionale `laboratoryPokemon` è serializzato nel JSON esistente, senza migrazioni SQL. Un vecchio checkpoint che non contiene tale campo viene caricato con laboratorio vuoto.

## Sprite
- `assets/sprites/npc/oak-frlg-up.png`, `oak-frlg-down.png`, `oak-frlg-left.png`, `oak-frlg-right.png`: ritagli ottenuti dalla tavola approvata, con trasparenza e centratura 16×32.
- `assets/sprites/npc/oak-frlg-mugshot.png`: ritratto approvato, ritagliato e privato dello sfondo grigio.
- `assets/sprites/npc/originali-approvati/`: entrambi gli originali, conservati senza modifiche.
- Nessun nuovo sprite generato per Oak. Gli sprite overworld degli altri NPC e i 18 ritratti OW già approvati rimangono invariati.

## Test
- `node --test tests/*.test.cjs` — regressioni Pokédex, abilità, sprite.
- `python tests/celestial-expedition.browser.py` — navigazione WASD/Spazio, selezione con due Pokémon, sconfitta, perdita e checkpoint, vittoria con sette Pokémon, deposito, salvataggio/ripristino, ritiro dal laboratorio, protezione contro la partenza senza riserva e Mewtwo non catturato.
- `python tests/oak-story.browser.py` — invito reversibile, scene della grotta, Master Ball, epilogo.
- `python tests/battle-keyboard.browser.py`, `python tests/market-city-gating.browser.py`, `python tests/release13.browser.py`, `python tests/release14.browser.py`, `python tests/trainer-intro-space.browser.py` — regressioni.
- `python tests/verify-assets.py` — audit file grafici e percorsi costruiti dinamicamente.

## Limiti del collaudo
I browser automatici usano servizi esterni simulati. Il login Discord, la sincronizzazione cloud reale e una partita completa dal piano 1 al piano 75 non sono verificati. Gli sprite di Oak sono conversioni statiche dalla tavola di riferimento, non un nuovo sistema di animazione della camminata. Il gioco continua a salvare fuori dalla grotta e al ritorno: un aggiornamento o una chiusura del browser a spedizione in corso ripristina l'ultimo checkpoint pre-spedizione.

Nessun push, deploy o intervento Supabase effettuato.

## Aggiornamento successivo — Beta 1.5.1
Le quattro pose overworld indicate sopra sono state **sostituite** con il nuovo foglio sprite approvato dall’utente. Fare riferimento a `docs/FIX_1_5_1_SPRITE_OAK.md` per asset e dimensioni effettive. Il mugshot della Beta 1.5 resta invariato.
