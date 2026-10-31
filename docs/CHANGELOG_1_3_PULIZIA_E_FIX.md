# Pokéxplorer Beta 1.3 — Fix e riordino risorse

Data: 30 ottobre 2026. Base: **Pokexplorer_Beta_1.2_Capsula_Abilita_Effetti_Passivi.zip**.

## Task 01 — Nascondere oggetti con quantità zero

La Borsa mostra oggetti consumabili e Poké Ball soltanto quando la quantità è maggiore di zero. La condizione vale anche per lo Zaino aperto dai comandi di battaglia. Gli Oggetti Chiave (Canna da Pesca e Condividi Esperienza) rimangono visibili anche prima dell'ottenimento e non diventano utilizzabili finché non sono posseduti. La visibilità si aggiorna quando un oggetto viene ottenuto, comprato, usato o si torna a zero. Non sono modificati inventario, limiti, salvataggi né prezzi.

## Task 02 — Sblocco dei PokéMarket

| Oggetto | Primo PokéMarket | Piano della mappa | Prezzo |
|---|---|---:|---:|
| Pozione | 1ª città | 5 | 150 |
| Superpozione | **2ª città** | **10** | 600 |
| Iperpozione | **5ª città** | **25** | 1.000 |

L'accesso è controllato **sia dal pulsante sia dalla funzione di acquisto**, così un acquisto non può avvenire prematuramente nemmeno invocando la funzione direttamente. Rimangono invariate le regole di ritrovamento a terra: Pozione dal piano 1, Superpozione dal 21, Iperpozione dal 51.

## NPC: ritratti e fallback

- Pescatore: ritratto locale `assets/sprites/npc/fisher-portrait-clean.png` (uomo con canna da pesca).
- Anziano / gentiluomo: sprite di battaglia Gen III `gentleman-gen3.png` caricato online da Pokémon Showdown. L'associazione è applicata alle classificazioni `gentleman` e `balding man`; i personaggi rimangono quelli realmente generati sulla mappa. Se l'immagine non è disponibile, si usa l'avatar di sicurezza.
- Oak: mantenuto lo sprite locale `oak-overworld-local.svg` per la mappa e il ritratto locale `oak-frlg-mugshot.png` per i dialoghi.
- Infermiera Joy: sprite NPC remoto anziché immagine locale rimossa. La cura e il suono non sono stati modificati.
- Gli NPC comuni usano gli sprite FireRed online già previsti dal motore. Non sono state inventate corrispondenze per altri NPC.

Gli sprite/ritratti esterni dipendono dalla disponibilità dei rispettivi host. In modalità offline subentra un avatar generico, non viene garantita la fedeltà visiva del personaggio.

## Asset e struttura

- Eliminati **43 file** indicati nei tuoi screenshot. Vedi `ASSET_RIMOSSI_1_3.txt`.
- Eliminati altri **12 SVG NPC legacy**, non referenziati nel codice attuale.
- Risorse grafiche active riordinate dentro `assets/sprites/`: `npc`, `player/{red,girl}`, `items`, `badges`, `trainers`, `buildings`, `effects`, `decor`, `world`, `ui`, `flags`.
- Le cartelle `assets/battle`, `assets/audio` e `assets/cave` rimangono separate perché contengono fondali, suoni e texture, non sprite individuali.
- Le immagini delle precedenti animazioni femminili di pesca verso sinistra/destra/su sono state rimosse su richiesta. In quelle direzioni il gioco usa **temporaneamente i frame di camminata corrispondenti** durante l'azione di pesca (la pesca resta funzionale, ma la canna non è visibile); le quattro pose di pesca verso il basso restano attive.
- Sostituiti i fallback rimossi con file presenti. La bandiera inglese è ora un'emoji nel controllo di lingua. Le immagini senza fonte rete usano l'avatar di riserva.
- Adattati i vecchi percorsi memorizzati nei checkpoint v2 in fase di rendering. Non è necessario convertire i salvataggi né modificare lo schema SQL.

## Verifiche effettuate

```bash
node --test tests/*.test.cjs
python tests/battle-keyboard.browser.py
python tests/release13.browser.py
python tests/verify-assets.py
```

Risultati ottenuti nella creazione: **17 test automatici superati**, test browser WASD/Spazio e raid/palestre passati su desktop e mobile, test browser Zaino/mercato/fallback passati su desktop e mobile, audit integrità di 79 percorsi dinamici e 175 asset grafici passato, nessun JS syntax error.

**Limitazioni:** non è stato eseguito un gameplay end-to-end con PokéAPI e Discord online, né un collaudo completo di tutte le mappe/abilità in produzione. Il browser di test non consente il caricamento di pagine da un server localhost, quindi i test Chromium sono eseguiti su HTML e JS in memoria; il controllo dei file si basa sull'audit statico e sulla lettura locale delle immagini.

**Nessun push GitHub, nessun deploy, nessuna modifica a Supabase.**
