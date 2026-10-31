# Pokéxplorer Beta 1.6 — Task #11–#15

## Correzioni
- Task #11: rimossa la voce *LABORATORIO OAK* dal menu/ala sinistra. Una sola scelta obbligatoria dopo la spedizione con 7 Pokémon; quello affidato a Oak non si può più ritirare. Per compatibilità i vecchi depositi restano nel checkpoint, ma non sono più accessibili.
- Task #12: dopo il primo KO Mewtwo si rialza e Oak consegna la Master Ball; dopo il **secondo KO**, Mewtwo scompare e la grotta si conclude anche senza cattura. Le perdite in caso di sconfitta della spedizione rimangono permanenti.
- Task #13: shiny casuali da **1/4.096** a **1/2.000**; non modifica quelli già salvati.
- Task #14: personaggio **CAMPIONE** nel selettore iniziale, bloccato fino alla vittoria di una run con un solo Pokémon dall'inizio alla fine su account Discord verificato; immagini tratte dal file originale fornito `sprites-gold.png`. Pesca usa le pose overworld di riserva se mancano frame specifici.
- Task #15: **OBIETTIVI** sostituisce *GUARDA PROGRESSI*. 17 missioni approvate, contatori e sprite blu per le missioni non completate; bordo verde per le completate.

## Persistenza
- Le statistiche nuove sono eventi cumulativi per account: inizio run, catture riuscite, vittorie, piani speciali, medaglie e conclusione Grotta Celeste.
- Account Discord sincronizzato tramite tabella `public.pokexplorer_objective_events`, con RLS e policy `auth.uid() = user_id` (script di installazione `sql/003_objectives_events.sql`). La tabella è stata aggiunta al progetto Pokexplorer il 31 ottobre 2026; non rieseguire la migrazione lì.
- Gli ospiti non acquisiscono ricompense permanenti e non possono selezionare il Campione.
- Il Pokédex permanente fornisce il progresso delle **151 specie** e le varianti shiny già catturate; avvistamenti soltanto non contano.
- Per le run precedenti non si possono inventare catture storiche, sblocchi 'solo' o totali non registrati: i nuovi contatori partono dai dati documentabili. Per un checkpoint precedente vengono importati piano, medaglie, avvio/vittoria eventualmente verificabili; mai 'solo' senza tracciamento.
- I salvataggi in formato v2 continuano a essere supportati. La chiusura del browser all'interno della Grotta Celeste continua a ripristinare il checkpoint pre-spedizione.

## Test
- Test JavaScript con `node --test tests/*.test.cjs`.
- Test UI Chromium con `python tests/release16.browser.py` (desktop 1440×900, mobile 390×844).
- Verificare su installazione HTTPS l'autenticazione Discord, l'upload di eventi e la sincronizzazione fra due dispositivi: i test automatici locali non simulano il vero OAuth.

Nessun push, commit o deploy eseguito.
