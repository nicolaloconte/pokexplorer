# Pokéxplorer Hybrid — installazione e attivazione (30 ottobre 2026)

## Cosa contiene questo ZIP

Questo archivio è l'intero gioco web aggiornato, **non una patch da applicare sopra un'altra versione**. Estrailo mantenendo la struttura `Pokéxplorer Beta/` e pubblicane il contenuto sullo stesso host HTTPS già configurato per Discord OAuth. Non è necessario copiare singoli file dalla vecchia beta. Non sono stati effettuati push Git o deploy.

Il Pokédex apre una schermata integrata nella scocca Rotom e mantiene un registro locale dei progressi. L'account verificato da Discord viene identificato tramite il suo UUID Supabase Auth; la sincronizzazione permanente richiede **la migrazione SQL** descritta sotto.

## Requisiti

- Browser recente con JavaScript, accesso a PokéAPI e agli sprite di PokeAPI.
- Le configurazioni OAuth Discord / Supabase già previste in `config.js` e nell'host pubblicato (redirect autorizzato).
- Un progetto Supabase con provider Discord OAuth configurato, accesso alla dashboard SQL Editor e uno schema che ammetta le nuove tabelle.
- **Non inserire mai nel frontend** `service_role`, secret API key, token Discord o credenziali DB. Il file `config.js` usa solo i valori pubblici già previsti dalla beta.

## Attivazione cloud (già eseguita sul progetto Pokexplorer)

1. **Sul progetto Supabase esistente Pokexplorer, non rieseguire le migrazioni:** le tabelle sono già state create il 30 ottobre 2026. Per nuove installazioni o cloni del database, effettuare prima un backup e usare uno staging.
2. Verifica in Supabase SQL Editor la presenza di `public.pokexplorer_saves`, `public.pokexplorer_dex_species` e `public.pokexplorer_dex_variants`.
3. **Solo su un database nuovo e non migrato**, applica una **sola volta** `sql/001_pokedex_hybrid.sql` (tabelle delle specie/varianti, RLS per utente, trigger di monotonia, RPC e privilegi). Usa il meccanismo di migrazioni in adozione nel tuo progetto e conserva il file nel repository.
4. **Solo se** `public.pokexplorer_saves` è assente e la beta non riesce a ripristinare i salvataggi cloud, applica `sql/002_account_checkpoints_if_missing.sql` (tabella dei checkpoint e RLS). Questa tabella è preesistente nella logica del gioco: non è un nuovo formato di salvataggio.
5. Verifica che le policy RLS di ogni tabella garantiscano isolamento dei record con `auth.uid() = user_id` e che il ruolo `anon` non possa leggere progressi privati.
6. Pubblica il gioco via HTTPS sulla stessa origine autorizzata in Supabase Auth e Discord. Esegui login con **due account distinti** per verificare isolamento, e con lo stesso account da **due dispositivi** per verificare l'unione delle scoperte.
7. Testa la disconnessione temporanea (nuova cattura mentre offline, ritorno online e sincronizzazione) e il Game Over (il Pokédex non deve azzerarsi).

### Query informative (senza modifiche)

```sql
select to_regclass('public.pokexplorer_saves') as checkpoint,
       to_regclass('public.pokexplorer_dex_species') as dex_species,
       to_regclass('public.pokexplorer_dex_variants') as dex_variants;

select tablename, policyname, cmd from pg_policies
where schemaname='public'
  and tablename in ('pokexplorer_saves','pokexplorer_dex_species','pokexplorer_dex_variants')
order by tablename, policyname;
```

### Stato cloud confermato (30 ottobre 2026)

Il progetto Supabase “Pokexplorer” è stato aggiornato **dopo** la prima preparazione del pacchetto: `pokexplorer_saves`, `pokexplorer_dex_species` e `pokexplorer_dex_variants` risultavano installate con **RLS attiva**, tre policy per ciascuna tabella, accesso anonimo negato e permessi autenticati limitati al proprietario. Sono installate anche le RPC del Pokédex. **Non applicare nuovamente le migrazioni a questo progetto.** Il test completo Discord e la sincronizzazione tra dispositivi rimangono da verificare dopo il deploy.

## Utilizzo

- **Menu principale**: pulsante `POKÉDEX` per consultare la collezione prima di iniziare un'altra avventura.
- **Ala sinistra**: pulsante `POKÉDEX · KANTO`, visibile fuori dalle battaglie. Consultazione nel display centrale, chiusura con `X` / `Esc`.
- **Elenco**: 151 numeri, ricerca per numero/nome solo sulle specie già viste, filtro dello stato e del tipo.
- **Scheda**: dati base alla vista e approfondimento dopo la cattura.
- **Varianti**: *solo* varianti realmente avvistate/catturate: nessuno slot vuoto, silhouette, contatore o suggerimento per le altre.
- **Habitat**: dati disponibili da PokéAPI e contesto dell'ultimo/primo avvistamento, senza spoiler.
- **Diario**: date e descrizione della prima osservazione e cattura.
- Le notifiche di nuova specie/variante vengono differite alle fasi senza overlay di battaglia.

## Migrazione di salvataggi preesistenti

Il checkpoint **rimane versione 2**. Gli attributi facoltativi `gender` e `isShiny` sono stati aggiunti senza cambiare la sua struttura generale. I Pokémon ripristinati da checkpoint vecchi non hanno il sesso ricostruibile: rimangono con `gender='unknown'` e `isShiny=false` senza creare varianti inventate. Le specie della squadra vengono invece importate come *specie catturate* nel Pokédex. Non è possibile recuperare gli avvistamenti storici non registrati dalla beta.

Non è consigliabile reimpostare la probabilità shiny sui Pokémon presenti nei salvataggi vecchi: cambierebbe retroattivamente la partita.

## Modalità ospite e offline

Con account Discord verificato, ogni collezione è associata all'UUID Auth Supabase. Le scoperte offline sono salvate localmente e messe in coda fino al successo della relativa chiamata RPC. La disconnessione o la chiusura in fase di sincronizzazione possono richiedere un successivo avvio per recuperare la coda. **La navigazione in incognito, la cancellazione dei dati del sito e il cambio di browser prima della prima sincronizzazione possono perdere eventi ancora solo locali.**

La modalità `UTENTE` non conserva una collezione permanente; non viene confusa con un account Discord. Il bootstrap locale senza Supabase resta una preview del gioco e non simula una sincronizzazione cloud.

## Sicurezza, limiti e collaudo

RLS, `auth.uid()` e RPC impediscono letture/scritture incrociate tra utenti autenticati correttamente; **non certificano** le catture ai fini di classifiche competitive: il browser resta controllato dal giocatore. I client inviano gli eventi registrati nel gameplay. In caso di futuro PvP/leaderboard è necessario validare eventi e rarità lato server.

Test inclusi: `node --test tests/pokedex.test.cjs` e controllo sintattico `node --check js/*.js` (eseguire individualmente i file, o tramite una loop shell). Sono state effettuate anche prove desktop/mobile con Chromium e bootstrap dello starter su ambiente mock; **non** equivalgono a test reali su dispositivo, con API e OAuth pubblici, o a verifica di sicurezza completa.

### Checklist minima di accettazione

- [ ] Prima scoperta specie mostra `VISTI`, prima cattura incrementa `CATTURATI`.
- [ ] Visti/catturati non regrediscono dopo Game Over, un'altra partita o un refresh.
- [ ] Maschio, femmina, shiny e specie genderless generano gli sprite previsti e mantengono i tratti dopo l'evoluzione.
- [ ] Le varianti sconosciute **non** compaiono nel Pokédex e non esistono contatori di varianti mancanti.
- [ ] Cattura con squadra piena e scambio NPC vengono registrati.
- [ ] Login Discord: dati separati tra due account e uniti tra due dispositivi dello stesso account.
- [ ] Evento offline inviato una sola volta al ritorno online; errore di rete non elimina la coda.
- [ ] Compatibilità con vecchi checkpoint, Centro Pokémon e Portamedaglie.
- [ ] Desktop/mobile: apertura, filtri, schede, interazioni, chiusura, accessibilità da tastiera.
