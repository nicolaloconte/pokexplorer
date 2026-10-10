# Pokéxplorer V7.3 — Come giocare e pubblicare

1. Estrai lo ZIP interamente in una nuova cartella.
2. Apri `Game/index.html` in un browser moderno. Consigliato l'uso di un server web, anche statico (ad es. GitHub Pages), perché alcune risorse esterne o funzioni possono subire restrizioni con `file://`.
3. Se hai già pubblicato su `https://nicolaloconte.github.io/pokexplorer/` e il file `index.html` era nella radice del repository, **carica il contenuto della cartella `Game/` nella radice**. Non caricare `Game/` come sottocartella aggiuntiva, a meno di aggiornare l'indirizzo.
4. Verifica che `index.html`, `style-v73.css`, `js/` e `assets/` siano tutti presenti e aggiornati.
5. Attendi la pubblicazione di GitHub Pages, poi forza la ricarica del browser (Ctrl+F5).

Questa versione non implementa ancora salvataggi persistenti/sincronizzati: chiudendo o ricaricando la pagina la partita può ricominciare. Nuzlocke: i Pokémon esausti abbandonano definitivamente la squadra.

## Test (Node.js)

Nella cartella `Game/`:

```sh
node tests/regression-v71.cjs
node tests/regression-v72.cjs
node tests/regression-v73.cjs
```

Le battaglie e la visualizzazione effettiva degli sprite online devono anche essere verificate da browser, perché l'accesso alle risorse esterne varia per rete, browser e cache.
