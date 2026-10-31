# Pokéxplorer Beta 1.5.1 — Sprite overworld Professor Oak

## Modifica
- Ripristinata l'associazione **sprite mappa distinto dal ritratto dialogo**.
- L'overworld di Professor Oak ora usa **esclusivamente** il nuovo sprite sheet approvato dal giocatore il 31/10/2026, separato in quattro fotogrammi statici `up`, `down`, `left`, `right`.
- I quattro file sono sotto `assets/sprites/npc/oak-frlg-{direzione}.png`, formato 24×32, RGBA con trasparenza. Sono stati ricavati tagliando *una singola posa completa* per direzione, evitando sovrapposizioni e ritagli da fogli differenti.
- Lo sheet originale rimane in `assets/sprites/npc/originali-approvati/prof-oak-overworld-sheet-definitivo-1.5.1.png`.
- Corretto il viewport CSS di Oak da 16×32 a 24×32 per evitare tagli a testa e abito nella casella della mappa, anche su schermi piccoli.
- **Non modificato** `oak-frlg-mugshot.png`: è il ritratto separato per dialoghi e cutscene.
- Nessun cambiamento alle meccaniche della Grotta Celeste, della selezione Pokémon, della perdita permanente, del Laboratorio Oak, dei checkpoint o di Supabase.

## Limiti
- Le quattro pose dell'overworld sono immagini statiche e non animazioni con tre frame; il gioco attuale utilizza una posa singola per Oak durante la mappa.
- La sorgente dell'ultimo sprite è un'immagine fornita dal giocatore e conserva la qualità pixel originaria. È ridimensionata tramite filtro nearest-neighbor, non ricreata con generazione grafica.
- Non sono stati eseguiti push, deploy o interventi online.

## Collaudo
- `python tests/verify-assets.py`
- `python tests/oak-sprite-assets.py`
- `node --test tests/*.test.cjs`
- `python tests/oak-story.browser.py` e `python tests/celestial-expedition.browser.py` per la verifica grafica con browser, se l'ambiente consente l'avvio di Chromium.
