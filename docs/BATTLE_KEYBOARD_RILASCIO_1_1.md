# Pokéxplorer Beta 1.1 — Tastiera battaglie, arene continue e pulizia

**Data:** 30 ottobre 2026. Distribuzione completa, sostituisce lo ZIP 1.0.1, nessuna migrazione SQL richiesta.

## Navigazione

| Contesto | W/A/S/D (anche frecce) | Spazio | Esc / Indietro |
| --- | --- | --- | --- |
| Menu lotta 2×2 | Evidenzia LOTTA, BORSA, POKÉMON, FUGA | Esegue scelta | — |
| Mosse | Evidenzia mosse e freccia di ritorno | Attiva mossa / ritorna | Menu lotta |
| Borsa (destra) | Categorie, strumenti, CHIUDI ZAINO | Seleziona / usa / chiudi | Menu lotta |
| Destinatario oggetto | Pokémon e ANNULLA | Conferma Pokémon / annulla | Torna alla borsa |
| Squadra (sinistra) | Pokémon e CHIUDI SQUADRA | Apre azioni / chiude | Menu lotta |
| Menu azioni Pokémon | Azioni disponibili | Stesso effetto del clic | Ritorna alla squadra |
| Finestra di conferma | Naviga CONFERMA / ANNULLA | Attiva | Annulla se consentito |
| Testo narrativo di battaglia | Non sposta il personaggio nel mondo | Avanza il testo | — |

Le azioni disabilitate vengono saltate. Il tasto Spazio non esegue azioni multiple a causa dell'autorepeat. Nei cambi Pokémon obbligati non esiste una via di fuga dalla scelta. **CHIUDI ZAINO e CHIUDI SQUADRA non appaiono durante l'esplorazione normale** e non modificano l'inventario.

## Continuità di raid e palestre

`GameEngine.startBattle(type, keepPlayerOnField=true)` riconosce ora che un'arena è già attiva e **non** applica `battle-preparing` né l'animazione iniziale `battle-revealing`. Il giocatore e il fondale restano visibili. Durante le palestre, i successivi allenatori e i Pokémon del capopalestra sono lanciati con `keepPlayerOnField=true`. La presentazione del capopalestra resta una sovrapposizione e non chiude la scena. Gli avversari continuano ad avere le loro normali animazioni di entrata. La musica cambia all'arrivo del capopalestra senza ricominciare per ogni Pokémon successivo.

## Pulizia e ottimizzazione

Rimosse **nove immagini PNG** in `assets/battle/hd/` (circa **20 MB** non compressi), più `assets/battle/neutral/neutral-field.png`, e il vecchio blocco CSS `#battle-stage[data-scene]` che le richiamava. Verifica: il motore rimuove esplicitamente `stage.dataset.scene`, mentre seleziona sempre `stage.dataset.platformTheme` per usare `assets/battle/neutral-bg/` e le palette attive. I vecchi diorami restano come fallback. Non sono stati eliminati media o documenti di cui non si poteva dimostrare l'inutilizzo.

## File modificati

- `index.html`: pulsante BORSA e pulsanti contestuali nelle due ali, caricato nuovo modulo.
- `js/engine.js`: navigazione, focus, chiusure e continuità delle catene.
- `js/battle-navigation.js` (nuovo): dispatcher keyboard, gestione modali, WASD, Space, Esc.
- `style.css`: stili di focus e di chiusura contestuale, rimozione CSS storico HD.
- `README.md` e `docs/POKEDEX_HYBRID_INSTALLAZIONE.md`: istruzioni e stato cloud aggiornati.
- `tests/battle-keyboard.browser.py` (nuovo): prove interattive browser desktop/mobile.

## Collaudo ripetibile

Con Node.js: `node tests/pokedex.test.cjs` (regressione Pokédex).

Con Python, Playwright e Chromium: `python tests/battle-keyboard.browser.py`. Se Chromium è in un percorso diverso: `POKEX_CHROMIUM=/path/to/chromium python tests/battle-keyboard.browser.py`. Il test crea Pokémon fittizi e non usa credenziali Discord né modifica Supabase. Copre percorsi solo tastiera, conferma oggetti, chiusure, conferme, blocco FUGA, continuità visiva, transizioni palestra e raid.

**Limitazioni:** le prove browser usano fixture per avversari, sprite e API. Una campagna reale fino alla quinta lotta raid, con audio e rete reali, richiede ulteriore test sul sito pubblicato. Nessun deploy Git, push o modifica DB eseguita per questa release.
