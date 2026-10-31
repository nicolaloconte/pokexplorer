# Pokéxplorer Beta 1.4.2 — Correzione sblocco PokéMarket

## Segnalazione
Nello Zaino/negozio del villaggio al 5° dungeon comparivano le Superpozioni e le Iperpozioni nonostante non fossero ancora disponibili.

## Cause confermate
1. Il CSS `#pokemart-overlay .mart-catalogue .btn-nav { display:flex!important }` era più specifico di `.hidden {display:none!important}`, rendendo visibili anche i pulsanti marcati come bloccati dalla logica.
2. I limiti originali `superPotion:10` e `hyperPotion:25` erano stati associati erroneamente alla seconda e quinta **città**. Le città vere e proprie sono ai piani 10, 20, 30, ... (i villaggi ai piani 5, 15, 25, ...).

## Regole corrette
- Pozione: dall'inizio, compreso il villaggio del piano 5.
- Superpozione: dalla **seconda città (piano 20)** in poi.
- Iperpozione: dalla **quinta città (piano 50)** in poi.
- Villaggi ai piani 5, 15, 25 ecc.: mantengono le disponibilità già sbloccate nelle città precedenti. Il piano 5 non sblocca nessuno dei due rimedi avanzati.
- Le regole di generazione degli oggetti trovati a terra restano invariate (Superpozione dal 21, Iperpozione dal 51).

## Modifiche tecniche
- `js/game-data.js`: soglie centralizzate a 20/50; aggiunto `isPokemartItemUnlocked`.
- `js/engine.js`: i controlli di acquisto e rendering condividono la stessa funzione; prodotti non sbloccati ricevono `hidden`, classe `hidden`, `disabled` e `aria-hidden`.
- `style.css`: regola specifica di precedenza CSS per nascondere in modo effettivo i prodotti bloccati.
- `tests/release13.browser.py`: aggiornati i test delle soglie alle città reali.
- `tests/market-city-gating.browser.py`: controllo automatico dell'effettiva visibilità CSS, accessibilità da tastiera, impossibilità d'acquisto e prezzo per i piani 1, 5, 10, 15, 19, 20, 25, 49, 50, 51, su desktop e mobile.

## Verifiche eseguite
- `node --test tests/*.test.cjs`: 23/23 passati.
- `python tests/release13.browser.py`: desktop e mobile passati.
- `python tests/release14.browser.py`: desktop e mobile passati.
- `python tests/market-city-gating.browser.py`: desktop e mobile passati.
- `python tests/verify-assets.py`: superato.
- Sintassi JavaScript controllata.

Nessuna migrazione database, push, deploy o modifica di checkpoint. I servizi esterni non sono coinvolti nei test browser simulati.
