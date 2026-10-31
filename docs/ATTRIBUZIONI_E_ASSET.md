# Asset e dipendenze esterne — verifica diritti richiesta

Non è stata effettuata una verifica legale delle licenze. Un **fallback grafico locale** risolve la rottura di layout, ma **non** garantisce il diritto di ridistribuire la risorsa originale. Prima di una diffusione pubblica controllare autore, licenza e condizioni specifiche.

## Dipendenze osservate nel codice

- **PokéAPI**, URL `pokeapi.co`: dati specie, mosse, abilità e descrizioni. Il gioco dipende dalla rete; i fallback per mosse sono parziali.
- **Sprites da PokeAPI/sprites** (`raw.githubusercontent.com/PokeAPI/sprites`), immagini Pokémon usate in parti dell'HTML; fallback specifici presenti in markup.
- **pret/pokefirered** (`raw.githubusercontent.com/pret/pokefirered`), spritesheet NPC/allenatori overworld; fallback locali in `assets/characters/npc-XX.png`.
- **Pokémon Showdown** (`play.pokemonshowdown.com/sprites/trainers`), ritratti allenatori; fallback locale in `assets/trainers/opponent-fallback.svg`.
- **Google Fonts**, CSS remoto Press Start 2P (con font alternativo locale del browser).
- **Audio locale** (`assets/audio`): sei file MP3. Provenienza, autore e possibilità di redistribuzione non documentati nello ZIP di partenza; **da verificare**.
- **Immagini locali** (`assets/`): PNG, WEBP e SVG. Il controllo di integrità NON dimostra la proprietà o la licenza degli asset.

## F09 — Cosa è stato fatto

- Usato il fallback SVG `assets/ui/pokemon-placeholder.svg` se non caricano gli sprite Pokémon più importanti (starter, info, campo di battaglia).
- Conservati i fallback esistenti per ritratti degli allenatori e sprite NPC; nessun download automatico di asset da siti terzi in questa fase.
- I flussi di rete esterni rimangono attivi; la modalità offline completa richiederebbe un dataset locale e autorizzazione sui materiali.

### Capsula Abilità (Beta 1.2)
- `assets/items/ability-capsule-user.png`: immagine 32×32 fornita dall'utente in questa conversazione; conservata senza sostituzioni o asset remoti.
