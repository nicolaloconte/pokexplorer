# Modifiche software — Pokédex Hybrid 1.0

**Baseline:** ZIP `Pokexplorer.zip` caricato il 30 ottobre 2026, con Centro Pokémon classico, animazioni già corrette e checkpoint v2. Il gioco esistente è stato mantenuto. Nessun deploy / push automatico.

| File | Cambiamento |
|---|---|
| `index.html` | Nuovi pulsanti menu e ala sinistra, overlay schermata Pokédex con elenco, ricerca, filtri, quattro schede e notifiche. Inclusione ordinata dei nuovi JS. |
| `style.css` | Stile Hybrid blu notte, bordo Rotom rosso, tipografia, sprite, griglie varianti e media queries mobile. |
| `js/pokedex-core.js` **NUOVO** | Motore collezione per account, sesso/shiny, scoperta irreversibile, merge, coda offline e RPC Supabase. |
| `js/pokedex-ui.js` **NUOVO** | Navigazione interattiva, popolamento schede con PokéAPI e filtri, protezione dalla rivelazione di varianti sconosciute. |
| `js/pokemon.js` | Generazione sesso/shiny al momento della creazione, sprite coerenti e ereditarietà dei tratti nelle evoluzioni. |
| `js/game-services.js` | Lettura del rapporto di genere `gender_rate` dai metadati specie di PokéAPI. |
| `js/engine.js` | Hook su starter, incontro, cattura, scambio, evoluzioni; visualizzazione sesso/shiny nella squadra e nei pannelli battaglia; blocco input dietro overlay. |
| `js/checkpoints.js` | Campi `gender`/`isShiny` opzionali nel checkpoint v2, ripristino compatibile con vecchi salvataggi e import conservativo specie. |
| `js/main.js` | Collegamento del Pokédex all'identificativo Auth Supabase verificato o alla modalità ospite, bootstrap cloud. |
| `sql/001_pokedex_hybrid.sql` **NUOVO** | Collezione persistente in due tabelle, RLS, trigger, API RPC. Deve essere **applicato al progetto Supabase** prima di testare la sincronizzazione. |
| `sql/002_account_checkpoints_if_missing.sql` **NUOVO** | Schema compatibile della tabella checkpoint se è assente nell'istanza database. |
| `tests/pokedex.test.cjs` **NUOVO** | Nove test automatici del modello, persistenza, offline, isolamento per UUID e vecchi checkpoint. |

## Proprietà di prodotto confermate

1. Kanto #001–#151, progresso per specie (visto/catturato) separato dalla raccolta varianti.
2. Varianti realmente scoperte maschio/femmina/genderless, normali/shiny: **nessuno spoiler** per le altre.
3. Probabilità shiny iniziale 1/4096 al momento della creazione del Pokémon. Il sesso segue il dato `gender_rate` di PokéAPI dove disponibile.
4. Evoluzioni conservano sesso e shiny. I checkpoint v2 conservano questi attributi su nuove partite.
5. Il Pokédex non dipende dal checkpoint di una singola partita: Game Over e nuova run non lo azzerano.
6. Supabase Auth con Discord: stesso account su più dispositivi, RLS per proprietario, merge monotono; modalità Utente temporanea.
7. Filtro per nome/numero, stato e tipo, visualizzazione su desktop e mobile.

## Note aperte non bloccanti

- Per gli sprite differenziati si usano le chiavi PokéAPI (`front_female`, `front_shiny_female`, ecc.) con fallback al corrispondente sprite standard dove non forniti.
- La lista in inglese dei nomi delle 151 specie è incorporata nel frontend per poter nascondere i nomi delle specie non scoperte senza chiamate remote di massa. Gli altri testi UI sono in italiano/inglese.
- L'habitat dipende dai metadati standard della specie di PokéAPI; non si inventano mappe interne del gioco né si mostrano località future.
- Prima del go-live occorrono prova OAuth Discord e cloud reale, recupero della base dati esistente, test su dispositivi e verifica sicurezza completa.
