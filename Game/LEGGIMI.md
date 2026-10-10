# Pokéxplorer — Revisione combattimenti, palestre e Rotomdex

## Avvio
1. Estrarre interamente lo ZIP senza spostare i file dalla cartella `Game`.
2. Aprire `Game/index.html` con un browser moderno e con una connessione Internet attiva.
3. Conservare tutte le cartelle `js/` e `assets/`, inclusa `assets/items/`.

**Servizi esterni:** i dati delle specie, il learnset e i metadati delle mosse provengono da PokéAPI. Le immagini dei Pokémon e alcuni allenatori sono collegate ai rispettivi servizi esterni. Alberi, case, medaglie, strumenti e sfondo locale sono inclusi nello ZIP. I metadati delle mosse sono memorizzati temporaneamente nella sessione per ridurre richieste ripetute.

## Principali modifiche
- **Città / palestre:** ogni livello 10/20/30 ecc. è una città. L'uscita resta sigillata finché non vengono sconfitti tre allenatori, il capopalestra e **tutti** i Pokémon della sua squadra. L'uscita si sblocca solamente dopo la medaglia del piano in corso.
- **KO e cambio Pokémon:** quando un compagno va KO, se sono presenti Pokémon sani la battaglia resta attiva e compare la selezione obbligatoria nella barra sinistra. Il cambio volontario chiede conferma, mostra il richiamo e il nuovo lancio della Poké Ball e consuma un turno; il cambio imposto da KO non consuma un ulteriore turno.
- **Tipo / doppio tipo:** tutti i moltiplicatori di tipo, resistenze (0,5×), vulnerabilità (2×), immunità (0×), bonus STAB (1,5×) e combinazioni tra tipi sono gestiti dal medesimo sistema per giocatore e avversario. La tabella adotta l'impostazione FireRed/LeafGreen e supporta anche tipi più moderni restituiti da PokéAPI.
- **Combattimento:** colpi critici, controllo precisione, priorità/velocità, differenza tra attacchi fisici e speciali, modifiche statistiche, PP, scelta delle mosse del rivale e principali stati alterati; effetti di stato periodici basilari per veleno, scottature e Parassiseme.
- **Mosse delle specie:** apprendimento ai livelli indicati nei learnset `firered-leafgreen` forniti da PokéAPI, anziché assegnare *Morso* o *Iper Raggio* a tutte le specie a livelli fissi. Charmander parte con Graffio e Ruggito e apprende Braciere quando previsto. Menù per sostituire una delle quattro mosse o rinunciare.
- **Progressione EXP:** ricompense EXP e soglie aumentate/abbassate rispettivamente per permettere una crescita più rapida. Statistiche ricalcolate al cambio di livello, evoluzioni principali e diverse evoluzioni per livello di prima generazione.
- **Menù:** una plancia comandi appare **sotto il Rotomdex**, con LOTTA / POKÉMON / BORSA / FUGA. La fuga è disabilitata per allenatori, palestre e raid. Scelta Pokémon dalla barra sinistra; borsa interattiva a destra con conferma. Sprite dei tre strumenti inclusi localmente. Grafica dei sei slot con sfondi per tipo.
- **Presentazione:** sequenza incontri con entrambi gli allenatori, lancio di Poké Ball, ingresso in campo, animazione dei colpi, KO e richiamo; interfaccia di lotta su scenario GBA originale. Occhi Rotomdex con sguardi periodici, battiti di palpebre e occhiolino.
- **Dungeon:** conservato il generatore a zone raggiungibili con 1 raid nascosto, 1–3 oggetti e 1–4 allenatori per percorso; notifica della raccolta e nebbia sulle zone inesplorate. Grafica di villaggi/città e mappa di Kanto sfocata come nella versione precedente.

## Test effettuati
- Sintassi JavaScript di `pokemon.js`, `engine.js` e `main.js` (Node.js).
- Test browser Chromium headless con risposte simulate a PokéAPI: immunità e superefficacia, mosse iniziali e apprendimento di Braciere, uscita città bloccata prima della medaglia, scelta Pokémon dopo KO, switch manuale, borsa, tre sfidanti della palestra e squadra completa di Brock (Geodude, Onix), medaglia e uscita sbloccata.
- 100 nuove mappe di dungeon controllate con visita BFS: oggetti, allenatori, raid e uscita raggiungibili.

## Limiti attuali
- Il sistema usa informazioni autentiche di apprendimento delle mosse, ma **non riproduce ancora alla lettera ogni effetto unico di tutte le mosse Pokémon** (meteo, multi-colpo, mosse in due turni, trappole, sostituti, ecc.). Le proprietà principali delle mosse vengono lette dalla PokéAPI e diversi effetti secondari sono semplificati.
- Il bilanciamento di tutte le otto palestre, le evoluzioni particolari tramite pietre/scambio e le sessioni lunghe sono ancora da collaudare sul campo.
- Non è presente un salvataggio persistente. Una connessione Internet è necessaria per caricare Pokémon e learnset nella configurazione attuale.
- Sprite ambientali originali ispirati ai giochi Pokémon: non è una copia integrale del sistema di battaglia dei titoli Nintendo.
