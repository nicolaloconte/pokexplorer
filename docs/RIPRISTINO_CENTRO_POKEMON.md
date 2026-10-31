# Pokéxplorer Beta — Centro Pokémon ripristinato e movimento a destra

**Obiettivo:** ritorno al comportamento classico: interazione diretta con l'infermiera Joy dall'ingresso esterno del Centro Pokémon. Nessuna stanza/dungeon interno.

## Cosa è stato modificato

- **`js/engine.js`**: eliminati `buildPokemonCenterMap`, `enterPokemonCenter`, `leavePokemonCenter`, `moveInsidePokemonCenter` e tutta la gestione del cambio di mappa. Aggiunto `openPokemonCenterDialog()`: si attiva soltanto quando il giocatore è in `(2,3)` e preme **SU** verso il Centro Pokémon in `(2,2)` nei villaggi/città. La conversazione usa l'overlay NPC esistente e il ritratto di Joy. Posizione, piano, mappa e UI rimangono invariati.
- **Cura reale**: conservato il ripristino di PS, PP e status tramite `healAll()`, con il messaggio iniziale, due secondi di attesa e messaggio finale. Il motivetto `pokeheal.mp3` rimane su un canale indipendente ma segue il gestore generale del volume (`0%` = muto).
- **Dialoghi**: puliti i listener del click alla chiusura per evitare che un click vecchio chiuda la successiva conversazione.
- **`js/checkpoints.js`**: il ripristino cancella eventuali timer di cura senza riferirsi al dungeon eliminato. Nessun cambiamento ai campi salvati.
- **`style.css`**: rimossi gli stili dell'interno e delle sue decorazioni. Mantenuti stile del dialogo Joy, scala overworld esterna, battaglie, CSS guard del PokéMarket e il resto della UI.
- **`assets/red/walk/right-{0,1,2}.png`**: sostituite le tre pose sbagliate con la camminata laterale realmente rivolta verso destra (mirror senza interpolation dei frame `left`). Riposo, passo 1 e passo 2 sono distinti, tutti orientati correttamente.
- Eliminati gli asset **non più usati** dell'interno e dell'infermiera overworld (il ritratto Joy da conversazione resta presente).

## Verifiche eseguite

- **4/4** test browser del nuovo comportamento, su 360×740, 390×844 e 1280×800, con protagonista maschile e femminile: interazione diretta, dialogo Joy, mappa e posizione invariati, nessun interno.
- Cura dopo **2000 ms**, verifica che il volume 0% silenzi il motivetto e che il volume 50% lo ripristini, senza intervenire sulla musica di sottofondo.
- Seconda interazione e annullamento del dialogo: niente cure tardive né dialoghi bloccati.
- **3/3** nuove pose verso destra speculari alle corrispondenti pose verso sinistra, con canvas PNG 32×32 e movimento direzionale verificato nel browser.
- **2/2** test browser di regressione a 390 e 1280 px: PokéMarket, palestra, 8 medaglie PNG e collisione con un albero.
- **5/5 frame lancio Poké Ball** verificati bit-per-bit invariati rispetto allo ZIP precedente.
- JavaScript sintatticamente valido; ZIP verificato con `testzip()` e riferimenti locali dei file HTML/CSS controllati.

## Limiti

Non sono stati testati account Discord reali, backend Supabase, salvataggi cloud dal vivo, lunghi gameplay completi o device fisici. Nessun commit, push o deploy effettuato.
