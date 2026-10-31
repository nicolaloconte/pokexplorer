# Pokéxplorer Beta 1.4.3 — Evento Oak e conferma sfida

## Sprite
- OW-10 Poliziotto: sostituito ritratto con esattamente il PNG inviato il 31 ottobre; nessuna elaborazione.
- Professor Oak: mugshot originale già nel progetto (`assets/sprites/npc/oak-frlg-mugshot.png`) mantenuto nei dialoghi.
- Professor Oak overworld: nuova posa frontale `oak-frlg-down.png` ricavata dall’immagine di riferimento dell’utente; le pose precedenti sono conservate senza alterazioni.
- Lo sprite overworld piccolo e il ritratto non sono intercambiabili.

## Evento piano 75
- 5 passaggi dell’invito di Oak; scelta SÌ/NO tramite pulsanti, WASD, frecce e Spazio.
- NO è reversibile: Oak resta nella mappa e può invitare nuovamente il giocatore.
- Recupero dei vecchi checkpoint in cui un rifiuto aveva erroneamente rimosso Oak.
- Ingresso nella Grotta Celeste in 3 scene; nuovo testo del risveglio di Mewtwo.
- Ricompensa Master Ball introdotta in 3 passaggi, senza cambiare la regola di concessione.
- Testo Oak contestuale alle fasi trial/rematch/complete; epilogo di 2 scene prima del ritorno.
- Nessuna modifica alle condizioni di vittoria, alla cattura, ai limiti della Master Ball, alla geometria della grotta o alla struttura del checkpoint v2.

## Battaglie
- Spazio sulla schermata allenatore `LOTTA!` invoca lo stesso click del mouse e impedisce la doppia attivazione.
- Il cambiamento era stato preparato nella Beta 1.4.2+; ulteriori verifiche incluse in `tests/trainer-intro-space.browser.py`.

## Consegna
- Release completa. Nessun push Git, deploy né migrazione Supabase.

## Risultati di collaudo locale

- `node --test tests/*.test.cjs`: 23 test superati.
- `python tests/trainer-intro-space.browser.py`: desktop 1440×900 e mobile 390×844 superati.
- `python tests/oak-story.browser.py`: desktop 1440×900 e mobile 390×844 superati (rifiuto reversibile, accettazione, arrivo, Master Ball, epilogo, ritorno al piano 75).
- `python tests/battle-keyboard.browser.py`: desktop 1460×900 e mobile 390×844 superati.
- `python tests/market-city-gating.browser.py`: desktop e mobile superati.
- `python tests/release14.browser.py`: desktop e mobile superati.
- `python tests/verify-assets.py`: 79 percorsi dinamici, 193 file grafici, 18 sorgenti verificate.
- Controllo sintattico JavaScript completato sui moduli nella cartella `js`.

Le prove browser utilizzano servizi esterni simulati e non dimostrano il corretto funzionamento di login Discord, Supabase o PokéAPI in produzione.
