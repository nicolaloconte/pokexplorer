# Pokéxplorer V7.1 — Fix collisioni, raid, sprite e bilanciamento

Questa versione parte da **Pokexplorer_V7_stable_cinematics.zip** e conserva la UI approvata nella V7.

## Correzioni

1. **Sprite Red in battaglia:** il giocatore utilizza il *back sprite* autentico della serie FireRed/LeafGreen, caricato come foglio di cinque pose e ritagliato sul primo fotogramma. Se la risorsa esterna non è disponibile, il gioco usa lo sprite locale `assets/trainers/red-back-fallback.svg` (grafica alternativa originale).
2. **Allenatori:** corretti gli ID non esistenti per Fantallenatore/Ranger; ritratti di battaglia con fallback locale, sprite da mappa in stile FireRed per gli allenatori dei percorsi. Rimosse le immagini di fallback sovrapposte sotto i fogli sprite trasparenti: prima potevano apparire artefatti sul retro dei personaggi.
3. **Allineamento:** abbassata la piattaforma del Pokémon avversario e regolata la posizione verticale degli sprite nemici, mantenendo lo sfondo e le piattaforme della V7.
4. **Pesca:** movimento bloccato dall'apertura della conferma fino all'annullamento o all'incontro; annullare sblocca il movimento, confermare lo mantiene bloccato fino alla battaglia.
5. **Villaggi e città:** mappa completamente rivelata all'ingresso; edifici, NPC, aiuole, lampioni e altre decorazioni non sono attraversabili. Centro Pokémon, Pokémarket, case e palestra sono ora attivabili dalla casella adiacente, senza far scomparire lo sprite.
6. **Accessibilità delle città:** corridoi di accesso agli edifici collegati ai viali principali; mantenuta la via d'uscita senza bloccare il cammino.
7. **Raid segreto:** eliminata la singola casella raid obbligatoria. Ogni Poké Ball generata come oggetto ha una probabilità indipendente del **10%** di attivare una trappola raid da cinque battaglie. Le mappe possono avere zero o più trappole; il raid resta indistinguibile da un oggetto fino alla raccolta, e le catture restano disabilitate durante la sequenza.
8. **Esperienza e difficoltà:** ridotta l'esperienza delle vittorie, aumentato progressivamente il costo dei livelli e adattata la progressione degli avversari al numero del dungeon. Resta la quota esperienza (30–50%) per i Pokémon che hanno partecipato.

## Test eseguiti (Node.js)

`node tests/regression-v71.cjs` verifica:
- 200 generazioni di dungeon regolari (1–3 strumenti, 1–4 allenatori, zero raid fissati, obiettivi raggiungibili);
- 24 mappe di villaggi/città (uscita raggiungibile, edifici accessibili da vicino, decorazioni solide, mappa tutta rivelata);
- collisioni e permanenza dei Centro Pokémon;
- conferma/annullamento pesca e blocco del movimento;
- limiti probabilistici dei raid (`0.09` produce un raid, `0.10` no);
- proiezione del livellamento dopo 60 battaglie, senza salto esagerato di livelli.

Sono stati inoltre verificati la sintassi dei tre file JS e il caricamento degli SVG locali come XML.

**Limiti del collaudo:** non è stato possibile eseguire un test di gameplay visivo in Chromium in questa sessione per un blocco dell'ambiente di esecuzione. I controlli sui pixel e gli FPS reali vanno confermati nel tuo browser. Non è stata completata una partita integrale fino all'ottava palestra.

## Fonti per gli sprite esterni
- FireRed decompilation project: https://github.com/pret/pokefirered — sprite Red back e overworld.
- Pokémon Showdown trainer sprites: https://play.pokemonshowdown.com/sprites/trainers/ — ritratti dei capipalestra e degli altri allenatori.

Alcune risorse dipendono dalla connessione Internet; i fallback inclusi nell'archivio coprono Red in battaglia e i ritratti mancanti degli allenatori.
