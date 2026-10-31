# Pokéxplorer Beta 1.4 — Task #03–#07

Questa release deriva dalla Beta 1.3.1 senza push, deploy né modifica a Supabase.

## Task #03 · Background menu principale

- Sostituita la texture di battaglia e la sovrapposizione circolare con uno sfondo scuro sfumato indipendente.
- Non sono stati modificati i fondali di combattimento, delle palestre o dei raid.

## Task #04 · Gioco solo in italiano

- Rimossi selettore IT/EN, attributi HTML `data-i18n-*`, logica del cambio lingua e dizionari di traduzione a runtime.
- Conservata la lingua di gioco `it` per PokeAPI, descrizioni e compatibilità di salvataggio.
- Il testo di interfaccia è italiano. Identificativi delle API, nomi dei file, termini tecnici e nomi propri rimangono invariati.
- Quando una descrizione italiana non è disponibile da PokéAPI, viene indicata l'indisponibilità invece di mostrare automaticamente una descrizione inglese.

## Task #05 e #06 · Sprite overworld e ritratti

- 18 ritratti approvati inseriti in `assets/sprites/npc/ritratti/OW-01.png` … `OW-18.png`.
- 18 adattamenti **statici** alla risoluzione 16×32 per la mappa inseriti in `assets/sprites/npc/overworld/`.
- Sorgente unica di abbinamento: `assets/sprites/npc/overworld/MANIFEST_RITRATTI.json` e `js/game-data.js`.
- Include OW-07 e OW-11 sostituiti dalle versioni definitive, OW-10 migliorato e OW-09 Infermiera Joy già nel vecchio gioco.
- Compatibilità con il vecchio formato di checkpoint e vecchi URL remoti degli sprite NPC/allenatori.
- Le versioni 16×32 **non sono spritesheet direzionali animati**: provengono dalle immagini approvate e mantengono una posa ferma. Per animazioni direzionali autentiche servono ulteriori frame disegnati per ciascun personaggio.
- Rimossa la cartella `docs/overworld_catalogo` della Beta 1.3.1, basata su riferimenti remoti obsoleti.

## Task #07 · PokéMarket con dialogo del commesso

- Interazione dal lato sud del PokéMarket, davanti all'edificio, come per l'Infermiera Joy.
- Dialogo con OW-16: «Benvenuto al PokéMarket! Cosa desideri acquistare?».
- Dopo conferma con mouse, Spazio o Invio si apre il negozio; alla chiusura il commesso saluta.
- WASD o frecce selezionano pulsanti nel negozio; Spazio esegue il pulsante selezionato; Esc torna al dialogo di saluto.
- Prezzi e inventario invariati: Superpozioni dalla seconda città (piano 10), Iperpozioni dalla quinta (piano 25), Capsula Abilità a 3.000 Pokécoins.

## Compatibilità e verifiche

- Nessuna nuova migrazione Supabase, nessuna modifica a salvataggi o meccaniche fondamentali.
- 21 test unitari Node superati: 9 Pokédex, 8 abilità, 4 overworld.
- 3 suite browser eseguite su desktop 1460×900 e mobile 390×844: regressione Beta 1.3, tastiera battaglia, interazione Beta 1.4.
- Audit statico dei percorsi grafici superato: 79 percorsi generati, 210 immagini locali.
- Non testato login Discord end-to-end o una partita completa di 80 piani nel sito pubblicato.

## Limitazioni note

I ritratti OW sono pixel art di allenatori; per mostrarli nella mappa, sono state create miniature monofotogramma senza animazioni di movimento direzionali. La posa e la leggibilità variano tra personaggi e andranno rivalutate a dimensione reale. Gli sprite da battaglia dei capipalestra, che hanno classi proprie, rimangono invariati.

Gli asset forniti dall'utente e i riferimenti a personaggi Pokémon possono richiedere verifiche sui diritti di distribuzione prima della pubblicazione pubblica.
