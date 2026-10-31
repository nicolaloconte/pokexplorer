# Pokéxplorer Beta 1.3.1 — Audit e fix sprite overworld

- Nessun elemento grafico sostituito arbitrariamente. La mappa continua a usare i FireRed overworld già previsti.
- Registrati i 18 PNG remoti diversi usati dal motore: 16 NPC, più bug_catcher e fisher.
- Le 6 classi di allenatori (youngster, bug_catcher, cooltrainer_m, cooltrainer_f, hiker, camper) sono incluse, evitando omissioni nelle liste precedenti.
- Centralizzata la costruzione degli URL in `js/game-data.js`, utilizzata da `js/engine.js` per NPC e allenatori.
- Il resolver mantiene gli URL presenti nei checkpoint precedenti.
- Aggiunto supporto opzionale per sprite originali locali: `js/overworld-local-assets.js` elenca solo i file realmente scaricati. Quando l'elenco è vuoto, il gioco continua a caricare gli originali da GitHub.
- `docs/overworld_catalogo/` contiene catalogo HTML, CSV, manifest JSON, script di download e due vere risorse locali (Oak, fallback).
- Nessun file della Beta 1.3 eliminato; nessun cambiamento a incontri, statistiche, battaglie o salvataggi.

## Limiti

I PNG FireRed originali sono esterni e non erano inclusi nella Beta 1.3. Il download degli stessi non è stato possibile da questo ambiente; il pacchetto di catalogazione contiene URL e uno script per recuperarli dal PC dell'utente. I 18 PNG non sono spacciati per file locali. È necessario controllare i diritti di redistribuzione degli sprite di terze parti.

Task #03 (background Rotom) e #04 (solo italiano) restano separati e non sono stati modificati in questa release, in quanto la richiesta corrente riguardava l'audit overworld.
