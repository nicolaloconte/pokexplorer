# Pokéxplorer V7.1

Per giocare: estrai l'intera cartella `Game` e apri `Game/index.html` nel browser. Mantieni le sottocartelle `assets`, `js` e i fogli CSS insieme al file HTML. Il gioco recupera dati Pokémon, mosse e alcuni sprite tramite servizi online: una connessione Internet è consigliata.

Puoi leggere il changelog in `CHANGELOG_V7_1.md`. Per eseguire i test automatici della generazione delle mappe, della pesca, dei raid e del bilanciamento, installa Node.js ed esegui nella cartella `Game`:

```
node tests/regression-v71.cjs
```

La release V7.1 ha un riequilibrio significativo dell'esperienza; è preferibile iniziare una nuova partita per giudicare la progressione, perché la V7 non comprende un sistema di salvataggio persistente compatibile con queste modifiche.
