# Pokéxplorer V7.3 — Beta Test Fix & Balance

Base: V7.2 Finale Kanto. Conservati il Rotomdex, le palestre, le otto medaglie, i raid sulle Poké Ball, la regola Nuzlocke, la Foto Ricordo e le collisioni cittadine.

## Difficoltà iniziale
- Dall'1 al 5: selvatici di livello 2–3; allenatori di livello 4–5.
- I primi incontri attingono a un gruppo di specie meno impegnative: Rattata, Pidgey, Caterpie, Weedle, Meowth, Jigglypuff.
- Gastly escluso nei primi cinque livelli; incontrabile soltanto dal livello 6 (dopo il primo villaggio).
- Dal livello 6 aumenta il livello degli avversari in modo più graduale; abbassata anche la probabilità di incontro casuale nell'erba.
- Lo starter rimane al livello 5.

## Esperienza e statistiche
- Esperienza ispirata alla curva scalata dei giochi Pokémon: dipende dall'esperienza base della specie sconfitta, dal suo livello e dal livello del Pokémon premiato.
- Un Pokémon molto più debole riceve più esperienza rispetto a un Pokémon già forte che sconfigge lo stesso avversario.
- Maggiorazione negli scontri con allenatori e palestre. I partecipanti subentrati hanno una quota ridotta, anch'essa calcolata sui rispettivi livelli.
- Modificati i punti esperienza necessari al passaggio di livello, per una progressione più equa.
- Attacco, Difesa, Attacco Speciale e Difesa Speciale continuano a derivare dalle statistiche della specie e del livello. Le modifiche di stadio di mosse come Ruggito, Fulmisguardo, Colpocoda, Ricciolscudo incidono realmente sui danni, anche in assenza di PokéAPI.
- Paralisi: penalità reale alla Velocità ed eventuale blocco del turno. Scottatura: penalità sull'attacco fisico e danni di turno. Gestione continuata di sonno, gelo, veleno, Leech Seed ecc.
- Piccoli indicatori di stadio (+/-) e condizione sotto le barre PS di entrambi i Pokémon. Gli effetti temporanei si azzerano a fine scontro.

## Sprite, cattura, interfaccia
- Direzione visiva di Red sulla mappa adeguata al movimento (su, giù, sinistra, destra) e navigazione D-pad con veri pulsanti accessibili.
- Per i fogli FireRed degli allenatori/NPC viene ritagliato il **singolo primo fotogramma**, anziché mostrare pose adiacenti; se la rete non carica il PNG viene mostrato un singolo sprite locale alternativo.
- Red in introduzione emerge dal bordo inferiore del campo ed è ritagliato dalla barra dialoghi.
- La Poké Ball di cattura viaggia verso il centro **effettivo** dello sprite nemico, si illumina, si posa sulla piattaforma nemica e si scuote nell'attesa.
- Menu delle due ali della stessa larghezza sul desktop, squadra in elenco con sprite ingranditi, livello/nome più leggibili e barre PS dai dati reali (verde/giallo/rosso).
- Responsive: su tablet e telefoni il Rotomdex compare per primo e i pannelli sono sotto, senza occludere campo di gioco e controlli.
- Lo scorrimento browser non intercetta i tasti freccia durante l'esplorazione.

## Pokémarket, inventario, Radar
- Limiti: **10 Pozioni, 10 Elisir, 20 Poké Ball, 1 Canna da Pesca**; raggiunto il limite, gli acquisti vengono rifiutati senza addebito.
- Pokémarket: Elisir **400** Pokécoins; ricarica Radar Scan **2.000** Pokécoins; confermati i prezzi preesistenti degli altri strumenti.
- Radar Scan: **3 utilizzi gratuiti per nuova partita**. Il credito è visibile nel menu sinistro; le ricariche del negozio incrementano il contatore.
- Il Radar non consuma una scansione se tutta la mappa è già stata rivelata.

## Verifiche
- Test `node tests/regression-v73.cjs` (55 asserzioni sul bilanciamento, effetti, esperienza, zaino, radar, cattura, UI).
- Test mantenuti e ripassati: `node tests/regression-v71.cjs` (200 dungeon, 24 città/villaggi), `node tests/regression-v72.cjs` (otto medaglie, finale, Foto Ricordo, intro).
- Eseguiti anche test browser Chromium a viewport 390 × 844, 820 × 1000 e 1440 × 900, con dati Pokémon simulati: layout, schede stato, pulsanti D-pad, Radar Scan, negozio e limiti zaino, nessuna eccezione JS rilevata.

### Limitazioni note
- Le risorse esterne (PokéAPI, sprite FireRed/Showdown e font) possono richiedere Internet e dipendono dalla disponibilità delle origini. Per gli sprite di mappa esiste un fallback locale; per Red è incluso un fallback locale di battaglia.
- I test non sostituiscono una partita completa fino al livello 80 né una prova degli FPS sull'hardware dei giocatori.
- La disponibilità degli asset originali e il loro utilizzo su un sito pubblico restano soggetti ai diritti dei relativi titolari.
