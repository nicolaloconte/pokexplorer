# Pokéxplorer Beta 1.7 — Task #16, #17, #18

Data: 31 ottobre 2026. Partenza: ZIP completo Beta 1.6.

## Task #16 — Dev Mode
- `VAI AL PIANO` rimosso dal menu Opzioni e posizionato nella barra inferiore con velocità e musica.
- Il pulsante è inizialmente nascosto; compare dopo aver attivato DEV MODE col codice della Dev Mode.
- Teletrasporto verso un qualsiasi piano da 1 a 80 senza secondo PIN; richiede una run avviata e nessuna battaglia/cutscene in corso.
- Il motore verifica `devMode` prima di aprire la modale e prima di teletrasportare, anche se vengono invocate funzioni manualmente.
- La Dev Mode resta limitata alla sessione corrente e non viene salvata nel checkpoint.

## Task #17 — Footer crediti e Discord
- Secondo footer separato dai controlli di gioco: Pokéxplorer Beta, credito 17nico, link Discord dell'utente `https://discord.gg/qNGscTEYHM`.
- Link HTTPS in nuova scheda con `noopener noreferrer`; layout responsivo.

## Task #18 — Ritorno al menu principale
- Il menu Opzioni mostra TORNA AL MENU PRINCIPALE soltanto durante la run.
- Conferma prima dell'abbandono; il rifiuto non modifica la run.
- Prova a scrivere un checkpoint sicuro prima del reset. Quando la run è in battaglia o nella Grotta Celeste, non scrive uno snapshot invalido; conserva il checkpoint precedente.
- Il reset nasconde le modali temporanee, chiude il menu Opzioni, aggiorna il pulsante CONTINUA AVVENTURA.
- Le statistiche Obiettivi associate all'account rimangono indipendenti dal checkpoint.

## File toccati
- `index.html` — menu, teletrasporto, crediti, versione.
- `style.css` — controlli e crediti responsive.
- `js/engine.js` — Dev Mode, teletrasporto e navigazione al menu.
- `tests/release17.browser.py` — regressione funzionale desktop e mobile.
- `README.md`, questo changelog.

## Verifiche
- 32/32 test unitari JavaScript;
- test browser Beta 1.7 e Beta 1.6 (desktop 1440×900 e mobile 390×844);
- storia di Oak/Grotta Celeste negli stessi viewport;
- verifica asset grafici.

Nessun push GitHub, deploy o modifica Supabase.
