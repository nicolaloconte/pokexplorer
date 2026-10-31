# Beta 1.4.1 — Correzione abbinamento overworld/ritratti

**Problema introdotto in Beta 1.4:** i 18 ritratti selezionati venivano adattati a 16×32 e sostituivano erroneamente i veri sprite usati sulla mappa. Il risultato era un personaggio minuscolo e deformato.

**Correzione:**
- Gli sprite *sulla mappa* tornano a usare gli originali FireRed/LeafGreen (spritesheet 16×32 per frame) recuperati da `raw.githubusercontent.com/pret/pokefirered`.
- I **18 ritratti OW-01–OW-18**, approvati, rimangono locali in `assets/sprites/npc/ritratti/` e appaiono soltanto nei dialoghi e nelle presentazioni degli allenatori.
- Sono state rimosse le 18 miniature 16×32 create erroneamente nella Beta 1.4.
- I vecchi checkpoint che contengono i percorsi `assets/sprites/npc/overworld/*.png` vengono reindirizzati ai corrispondenti sprite originali sulla mappa.
- La tabella `assets/sprites/npc/overworld/MANIFEST_RITRATTI.json` distingue per ogni NPC la sorgente `map` dal file `portrait`.

## Limite noto
Gli sprite overworld originali sono richiesti via HTTPS: serve Internet. Se il server esterno non è raggiungibile, il sistema usa gli avatar di riserva esistenti. Prima di rendere la release completamente offline occorre reperire e distribuire i veri spritesheet overworld, **non** rigenerarli dai ritratti.

## Controlli
`node --test tests/*.test.cjs` e `python tests/verify-assets.py`, oltre a verifica browser dei dialoghi (servizi esterni simulati). Nessuna migrazione SQL o modifica dei salvataggi richiesta.
