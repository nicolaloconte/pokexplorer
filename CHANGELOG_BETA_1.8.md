# Pokéxplorer Beta 1.8 — pannelli e salvataggio manuale

- **Torna al menu principale** ora apre un pannello del gioco con **ANNULLA** e **TORNA AL MENU**, senza `window.confirm`.
- Il ritorno al menu **non salva automaticamente**: mantiene l’ultimo checkpoint precedente. I progressi successivi non salvati vanno persi.
- Menu opzioni: **SALVA PARTITA** appare solo durante una run. Un messaggio nello stesso menu conferma l’esito.
- Il salvataggio manuale usa il sistema di checkpoint esistente e, con login valido, ne richiama l’eventuale sincronizzazione cloud. Non è possibile salvare durante lotte, raid, dialoghi, Grotta Celeste o altre transizioni bloccanti.
- Il salvataggio automatico di fine dungeon rimane attivo.
- **Modalità UTENTE**: nessun salvataggio permanente, per evitare confusione e sovrascrittura di salvataggi Discord. È necessario accedere con Discord per salvare.
- Le altre richieste di conferma del browser (nuova avventura, logout, conflitti cloud) usano lo stesso pannello personalizzato.
- Nessuna modifica ai dati su Supabase, nessun deploy o push GitHub.

## Verifiche

`node --test tests/*.test.cjs` · `python tests/release18.browser.py` · `python tests/release17.browser.py` · `python tests/release16.browser.py` · `python tests/verify-assets.py`.
