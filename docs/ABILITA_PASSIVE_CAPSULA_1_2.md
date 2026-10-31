# Pokéxplorer Beta 1.2 — Capsula Abilità e abilità passive

## Requisiti implementati

- **Capsula Abilità** nel PokéMarket per **3.000 Pokécoins** (anche nelle città iniziali).
- Icona `assets/items/ability-capsule-user.png`: sprite 32×32 fornito dall'utente.
- Oggetto non chiave in **Zaino → Rimedi**, capacità massima 10.
- **Solo fuori dalla battaglia**: si sceglie un Pokémon della squadra, anche esausto.
- Verifica online delle abilità dal endpoint PokeAPI `pokemon/{id}` della **specie selezionata**; sono accettati unicamente record `is_hidden === false` e `slot >= 1`, distinti e non identici all'abilità attuale.
- Se dati assenti, Pokémon non idoneo, nessuna alternativa o annullamento, l'oggetto non viene consumato; **nessuna abilità esterna o nascosta** viene presentata.
- L'oggetto è consumato **una sola volta**, dopo scelta valida. Le caratteristiche del Pokémon restano inalterate, salvo abilità e l'eventuale guarigione da uno stato che la nuova abilità impedisce.
- Il cambio viene salvato nel checkpoint v2 esistente tramite `PokexCheckpoints`; vecchi checkpoint e salvataggio Supabase sono compatibili, senza migrazioni SQL.
- La modale permette selezione, annullamento, ESC e navigazione per Tab. Le richieste PokeAPI lente sono invalidate quando la finestra viene chiusa.

## Motore abilità

`js/abilities.js` contiene funzioni senza dipendenze DOM per controllo opzioni, variazione statistiche, danni, immunità, precisione, velocità, stato, meteo, effetti all'ingresso, contatto, KO e fine turno.

Integrati in `pokemon.js` e `engine.js`:

- Danni: Aiutofuoco / Acquaiuto / Erbaiuto / Aiutinsetto, Adattabilità, Macroforza, Forzapura, Dentistretti, Tecnico, Grassospesso, Guscioscudo, Lottascudo, Cecchino, Supersorte, Antagonismo, Lentifumé, Ferropugno, Temerarietà, Filtro, Magicscudo, Pelledura, Pellespessa/Fur Coat (se assegnata), Sturdy/Vigore, potenziamenti meteo e altri modificatori di danno supportati.
- Ingresso, statistiche e velocità: Prepotenza, Corpochiaro, Fumochiaro, Ipertaglio, Traccia, Download, Clorofilla, Nuotovelox, Remasabbia, Agonismo, Tenacia, Grancollera, Acceleratore, Anticipazione, Premonizione, Indagine.
- Immunità: Levitazione, Assorbacqua, Assorbivolt, Pellearsa, Fuocardore, Parafulmine, Acquascolo, Mangiaerba, Antisuono, immunità status, Magmascudo, Idrovelo, Scioltezza, Insonnia, Spiritovivo, Umidità e altro.
- Contatto: Statico, Velenopunte, Corpodifuoco, Spargispora, Incantevole, Cartavetro, Velentocco, Sottilguscio, Acquacollo (se presente) e affini, applicate alle mosse con il flag `contact` di PokeAPI.
- Turni e ambiente: Muta, Alternacura, Idratazione, Copripioggia, Velencura, Solarpotere, Pellearsa, risposte al meteo, Sguardofermo, Piedisvelti, Nullodifesa, Sabbiavelo, Mantelneve, Copricapo.
- Campo: Trappoarena / Parafulmine e blocchi condizionati, Raccolta (possibilità di trovare un oggetto dopo una vittoria), Risplendi / Tanfo (frequenza incontri nell'erba).
- `no-guard` supera le modifiche di precisione, `mold-breaker` può neutralizzare le difese abilità, e `inner-focus` contrasta il tentennamento introdotto tramite flag PokeAPI.

### Limitazioni da non nascondere

Il catalogo delle abilità normali dipende dai dati PokeAPI attuali e non è un insieme fisso. Le abilità che richiedono meccaniche non presenti nel gioco (es. furto di oggetti equipaggiati, lotte in doppio, meteo o condizioni molto specifiche) non possono avere un effetto visibile finché quelle meccaniche non esistono. **Questo rilascio estende drasticamente la copertura delle abilità passive, ma non è una certificazione che ogni abilità di tutte le 151 specie sia riprodotta al 100% in qualsiasi situazione canonica.**

Le abilità del gioco agiscono in un sistema di battaglia custom: non vengono dichiarate equivalenti per ogni dettaglio alle regole competitive ufficiali. Per una garanzia di copertura completa servirà un audit specie per specie delle abilità rese disponibili dal servizio live e un collaudo manuale di ogni comportamento.

## Test

Eseguire `node --test tests/*.test.cjs` dalla cartella principale del gioco.

- Test automatici: **17/17** superati su funzioni abilità, Capsula Abilità, dati nascosti, consumo, salvataggio/vecchi checkpoint, Pokédex e compatibilità evoluzioni.
- Sintassi: `node --check js/*.js` (oppure controllare ogni JS singolarmente): superata.
- La sessione di collaudo grafico Chromium non è stata completata: in questo ambiente Chromium blocca le navigazioni HTTP locali e `file://` con `ERR_BLOCKED_BY_ADMINISTRATOR`.
- **Da eseguire dopo pubblicazione:** acquistare una Capsula con 3.000 Pokécoins, usarla su specie con 2 abilità comuni, rifiutare su specie con 1 sola abilità comune, annullare, riaprire il salvataggio Discord e provare combattimenti di entrambi i lati con vari effetti passivi.

## Pubblicazione

Sostituire i file della precedente Beta 1.1 con il contenuto dello ZIP completo. Non occorrono aggiornamenti del database Supabase. Non inserire chiavi `service_role` o segreti nel frontend; `config.js` utilizza soltanto la chiave pubblicabile esistente.
