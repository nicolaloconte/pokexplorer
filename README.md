# Pokéxplorer Beta

## Avvio

1. Estrai lo ZIP interamente (non eseguire i file dall'anteprima dello ZIP).
2. Apri `Pokéxplorer Beta/index.html` in un browser aggiornato.
3. In locale è disponibile la modalità **UTENTE**, senza salvataggio dei progressi. Per il login Discord occorre la pubblicazione su origine web autorizzata e la configurazione OAuth.

## Centro Pokémon — modalità classica ripristinata

Nei villaggi e nelle città, **davanti alla porta sul lato sud del Centro Pokémon**, premi **SU**: appare immediatamente il dialogo dell'infermiera Joy. Non si entra in un dungeon interno. Dopo 2 secondi Joy cura tutti i Pokémon della squadra e riproduce il motivetto `pokeheal.mp3` sovrapposto alla musica, con volume controllato dal cursore MUSICA (0% = silenzio). Il giocatore resta nello stesso villaggio/città e sulla stessa casella.

## Movimento

Corretta l'animazione verso **destra** del protagonista maschile: tre frame realmente orientati a destra, specchiati dalla normale camminata verso sinistra. La scena di lancio della Poké Ball, i frame pesca e i movimenti femminili non sono stati modificati.

## File principali

- `index.html` / `style.css`: schermata di gioco e interfaccia.
- `js/`: logiche, battaglie, salvataggi e interazioni.
- `assets/`: grafica, suoni e sprite in uso.
- `config.js`: configurazione runtime; modificare soltanto se necessario.
- `docs/`: privacy, attribuzioni e relazione tecnica dei fix.

## Test e note

Vedi `docs/RIPRISTINO_CENTRO_POKEMON.md`. Non sono stati eseguiti push, deploy o modifiche a Supabase. Le prove automatizzate non sostituiscono un test completo su dispositivo fisico e con login Discord reale.

## Nuovo: Pokédex Hybrid 1.0 (30 ottobre 2026)

Il gioco include ora il Pokédex di Kanto accessibile dal menu principale e dall'ala sinistra del RotomDex: lista 151 specie, ricerca/filtri, schede, varianti maschio/femmina/shiny **completamente segrete fino alla scoperta**, habitat e diario. I Pokémon nuovi mantengono sesso e brillantezza in squadra, battaglia, evoluzione e checkpoint v2. Le scoperte sopravvivono al Game Over e alla creazione di una nuova run.

**Le tabelle e le funzioni RPC del Pokédex sono già state installate nel progetto Supabase Pokexplorer il 30 ottobre 2026. Non rieseguire gli script SQL sullo stesso progetto.** Leggere **`docs/POKEDEX_HYBRID_INSTALLAZIONE.md`** prima di pubblicare; contiene ordine di migrazione, requisiti, limitazioni e test. Per il dettaglio delle differenze tra questa e la beta originale: `docs/POKEDEX_HYBRID_MODIFICHE.md`.

Il codice e i test locali sono inclusi. Le tabelle cloud sono state installate e controllate; **non** è stato eseguito in questa versione un test end-to-end Discord da due dispositivi, né un deploy GitHub.

## Nuovo: controlli battaglia e continuità degli incontri — versione 1.1 (30 ottobre 2026)

- Durante una battaglia usa **WASD** o **frecce** per selezionare i comandi e **Spazio** per attivarli (equivalente al clic sinistro). **Esc** torna indietro quando consentito.
- Menu principale 2×2: **LOTTA**, **BORSA**, **POKÉMON**, **FUGA**. Se FUGA è vietata, il cursore la salta.
- Da BORSA ci si sposta nell'ala destra, si sceglie la categoria con WASD/Spazio, si scorre la lista, si usa l'oggetto e, se necessario, si seleziona il destinatario dalla squadra. **CHIUDI ZAINO** compare solo nella modalità borsa della battaglia.
- Da POKÉMON ci si sposta nell'ala sinistra; WASD/Spazio navigano la squadra e il menu di azione del Pokémon. **CHIUDI SQUADRA** compare solo quando il menu squadra è stato aperto dai comandi battaglia e la sostituzione non è obbligatoria.
- Per tornare dal sotto-menu delle mosse usa **Esc** o la freccia di ritorno selezionabile con WASD e Spazio.
- Raid consecutivi e allenatori/capopalestra mantengono la stessa arena tra gli avversari; la scena non viene nascosta/rivelata a ogni round.
- Pulizia prudente: rimosse nove immagini HD obsolete del vecchio selettore `data-scene` (circa 20 MB) e un fondale inutilizzato. I fondali attivi `neutral-bg`, le palette palestra, le piattaforme e i fallback sono mantenuti.

**Test:** `node tests/pokedex.test.cjs` e `python tests/battle-keyboard.browser.py` (Playwright Python con Chromium). Vedi `docs/BATTLE_KEYBOARD_RILASCIO_1_1.md`.

### Novità Beta 1.2 (Capsula Abilità)
- Capsula Abilità acquistabile nei PokéMarket per 3.000 Pokécoins; si usa fuori dal combattimento dalla Borsa → Rimedi.
- Abilità normali verificate per specie mediante PokéAPI, senza opzioni nascoste; cambio permanente nel checkpoint.
- Ampliati gli effetti passivi per entrambi i combattenti. Test: `node --test tests/*.test.cjs`.
- Dettagli e limitazioni in `docs/ABILITA_PASSIVE_CAPSULA_1_2.md`.

## Novità Beta 1.3 — Zaino, PokéMarket, NPC e asset ordinati

- Gli oggetti consumabili e le Poké Ball a quantità zero sono nascosti, inclusi i menu di battaglia; gli Oggetti Chiave restano visibili.
- Superpozione in vendita dalla **seconda città (piano 10)**, Iperpozione dalla **quinta città (piano 25)**. I ritrovamenti a terra non cambiano.
- Ritratti di Pescatore e Gentiluomo/Anziano associati ai rispettivi NPC, con fallback per le risorse online mancanti.
- 43 sprite scelti dall'utente più 12 SVG legacy inutilizzati rimossi. Tutti gli sprite conservati si trovano ora sotto `assets/sprites/`.
- I percorsi storici dei checkpoint rimangono supportati. La pesca femminile in direzioni diverse dal basso usa temporaneamente le pose di camminata per compensare i 12 fotogrammi rimossi.
- Test: `node --test tests/*.test.cjs`, `python tests/battle-keyboard.browser.py`, `python tests/release13.browser.py`, `python tests/verify-assets.py`.

Dettagli, differenze e limiti: [`docs/CHANGELOG_1_3_PULIZIA_E_FIX.md`](docs/CHANGELOG_1_3_PULIZIA_E_FIX.md). Nessun push/deploy effettuato.

## Beta 1.4.1 — Correzione overworld/ritratti (31 ottobre 2026)

Gli sprite OW approvati sono **ritratti di dialogo**, non modelli da posizionare sulla mappa. La mappa usa nuovamente i spritesheet overworld originali FireRed/LeafGreen; i vecchi checkpoint che referenziano gli adattamenti 16×32 della Beta 1.4 vengono corretti a runtime. Gli spritesheet di mappa sono online e richiedono connettività. Leggi `docs/FIX_1_4_1_OVERWORLD_E_RITRATTI.md`.

### Aggiornamento Beta 1.5 — Grotta Celeste

Prima dell'ingresso, il Professor Oak fa scegliere al massimo due Pokémon da portare nella Grotta Celeste; gli altri restano al villaggio. Una sconfitta completa comporta la perdita definitiva dei Pokémon selezionati. In caso di cattura di Mewtwo, al ritorno Oak fa depositare uno dei sette Pokémon quando necessario. I Pokémon depositati restano conservati e possono essere ritirati dal laboratorio disponibile nei villaggi. Vedi `docs/FIX_1_5_GROTTA_CELESTE_LABORATORIO_OAK.md` per test e limitazioni.
