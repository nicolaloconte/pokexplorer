# Pokéxplorer V6 — Restyling scene di lotta e città

Questa versione aggiorna la V5, conservando la progressione Nuzlocke, le palestre, il raid nascosto e l'inventario.

## Modifiche

- **Valigetta starter**: valigetta aperta, tre alloggiamenti con nome/tipo e scheda di anteprima; selezione con tastiera o mouse.
- **Battaglie**: cinque sfondi ambientali originali (prato, foresta, costa, grotta e città), piattaforme con maggiore profondità, Pokémon riallineati e allenatori in ingresso.
- **Invio e richiamo**: lancio delle Poké Ball del giocatore/allenatore, bagliore in evocazione, materializzazione e richiamo animati; gli incontri selvatici hanno una propria entrata.
- **Mosse**: effetto visivo scelto in base alla mossa e/o al tipo. Particelle grafiche dedicate, movimento dell'attaccante e impatto sul bersaglio.
- **Cattura**: lancio ad arco, assorbimento del Pokémon, caduta, da zero a tre oscillazioni in caso di fallimento o tre in caso di successo, sigillatura e rilascio dell'avversario se sfugge. La progressione dei messaggi rimane controllata dal giocatore.
- **Città e villaggi**: quattro varianti di viabilità, edifici, aree decorative e punti di interesse; dodici sprite NPC locali originali con dialoghi differenziati. Gli NPC non vengono generati sulla stessa casella o accanto agli edifici maggiori.
- **Bug corretto**: ripristinato `hpColorState()` che mancava nella versione precedente e causava un errore nella gestione delle barre PS.
- **Codice**: nuove animazioni incapsulate in funzioni distinte e nuovo stylesheet `style-v6.css` isolato per semplificare le successive rifiniture.

## Test e limiti

- Sintassi JavaScript verificata per i tre file.
- Test in Chromium con risposte simulate di PokéAPI: scelta starter, schermata battaglia, colore PS al 40% e 15%, effetti delle mosse, transizioni di cattura e aggiunta del Pokémon catturato alla squadra.
- 30 mappe di città/villaggi (piani 5–150) testate per uscita raggiungibile, assenza di collisioni tra entità e almeno 3 NPC.
- I test automatizzati hanno verificato la logica delle animazioni con tempi abbreviati; il ritmo completo va ancora valutato con una sessione prolungata nel browser reale.
- Gli sprite ambientali e gli effetti aggiunti sono SVG originali ispirati ai classici videogiochi Pokémon; i Pokémon e gli allenatori caricati in runtime dipendono ancora da PokéAPI e da Pokémon Showdown, quindi richiedono una connessione Internet.
