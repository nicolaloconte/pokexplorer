/* Bootstrap: require a verified Discord session before constructing the game
   whenever PUBLIC Supabase configuration is enabled. Unconfigured ZIPs remain
   a local/offline preview, never a simulated signed-in account. */
window.addEventListener('DOMContentLoaded', async () => {
  const gate=document.getElementById('login-gate');
  const message=document.getElementById('login-gate-status');
  const technical=document.getElementById('login-gate-error-details');
  const technicalText=document.getElementById('login-gate-error-code');
  // Display human-readable status; keep optional diagnostic details outside the main layout.
  function setLoginStatus(text,details=''){
    message.textContent=text;
    if(technical){if(details)technical.classList.remove('hidden');else technical.classList.add('hidden');technical.open=false;}
    if(technicalText)technicalText.textContent=details;
  }
  const login=document.getElementById('login-discord-btn');
  const guest=document.getElementById('login-guest-btn');
  const logout=document.getElementById('logout-discord-btn');
  const auth=window.PokexAuth;
  let guestSelected=false;
  function bootGame(){if(!window.game)window.game=new GameEngine();return window.game;}
  function enterGuestMode(){
    if(guestSelected)return;
    guestSelected=true;
    // Must be set before constructing the engine, or it might see another user's saved run.
    window.PokexCheckpoints?.setGuestMode(true);
    window.PokexDex?.setOwner('guest',{guestMode:true});
    window.PokexObjectives?.setOwner('guest',{guestMode:true});
    if(guest)guest.disabled=true;
    const trainer=bootGame();
    const label=document.getElementById('trainer-discord-name');
    if(label){label.textContent='UTENTE';}
    const avatar=document.getElementById('trainer-discord-avatar');
    if(avatar)avatar.src='assets/sprites/ui/trainer-avatar-fallback.svg';
    trainer.updateContinueButton();
    gate.classList.add('hidden');
  }
  if(guest)guest.onclick=enterGuestMode;
  function setProfile(profile){
    const label=document.getElementById('trainer-discord-name');
    if(label)label.textContent=profile.name;
    const avatar=document.getElementById('trainer-discord-avatar');
    if(avatar){
      avatar.onerror=()=>{avatar.onerror=null;avatar.src='assets/sprites/ui/trainer-avatar-fallback.svg';};
      avatar.src=profile.avatar||'assets/sprites/ui/trainer-avatar-fallback.svg';
    }
  }
  if(!auth?.enabled()){
    // Offline preview only: not a Discord-authenticated release.
    window.PokexDex?.setOwner('local');
    window.PokexObjectives?.setOwner('local');
    bootGame();
    const label=document.getElementById('trainer-discord-name');
    if(label){label.textContent='ALLENATORE LOCALE';}
    return;
  }
  gate.classList.remove('hidden');login.disabled=true;
  setLoginStatus('Verifica della sessione Discord…');
  try{
    const {user}=await auth.setup();
    if(guestSelected)return;
    if(!user){
      setLoginStatus('Scegli come iniziare la tua avventura.');
      login.disabled=false;
      login.onclick=async()=>{
        login.disabled=true;setLoginStatus('Reindirizzamento a Discord…');
        try{await auth.signIn();}
        catch(err){setLoginStatus('Accesso non riuscito. Riprova oppure continua come Utente.',String(err.message||err).slice(0,250));login.disabled=false;}
      };
      return;
    }
    // Only the authenticated Supabase user ID selects the owner's checkpoint.
    if(typeof user.id!=='string'||!/^[0-9a-f-]{36}$/i.test(user.id))throw Error('Invalid Supabase account identifier');
    window.PokexCheckpoints?.setGuestMode?.(false);
    window.PokexCheckpoints?.setUser(user.id);
    window.PokexDex?.setOwner(user.id);
    window.PokexObjectives?.setOwner(user.id);
    const game=bootGame();
    setProfile(auth.profile(user));
    game.updateContinueButton();
    gate.classList.add('hidden');
    // This sync is independent of run checkpoints; cloud schema must be migrated.
    window.PokexDex?.initCloud(auth.client).catch(error=>console.warn('Pokédex cloud unavailable:',error));
    window.PokexObjectives?.initCloud(auth.client).catch(error=>console.warn('Obiettivi cloud unavailable:',error));
    if(logout){
      logout.classList.remove('hidden');
      logout.onclick=async()=>{
        if(!window.confirm('Disconnettersi da Discord? I progressi locali resteranno in questo browser.'))return;
        logout.disabled=true;
        try{await auth.signOut();window.location.reload();}
        catch(err){logout.disabled=false;window.alert('Disconnessione non riuscita: '+String(err.message||err).slice(0,110));}
      };
    }
    const checkpoint=window.PokexCheckpoints;
    let revision=null,cloudEnabled=true,busy=false,timer=null;
    try{
      const remote=await auth.loadCloud(),local=checkpoint.load();
      if(remote?.run && !local){checkpoint.save(remote.run);revision=remote.revision;}
      else if(remote?.run && local){
        revision=remote.revision;
        if(JSON.stringify(remote.run)!==JSON.stringify(local)){
          const useRemote=window.confirm('È disponibile una partita Discord diversa da quella locale. Caricare il salvataggio cloud?');
          if(useRemote)checkpoint.save(remote.run);
          else if(!window.confirm('Sostituire esplicitamente il salvataggio cloud con quello locale?'))cloudEnabled=false;
        }
      }
      game.updateContinueButton();
      window.PokexObjectives?.importCheckpoint?.(checkpoint.load());
    }catch(error){cloudEnabled=false;console.warn('Cloud restore unavailable',error);}
    const sync=async()=>{
      if(!cloudEnabled||busy)return;
      const saved=checkpoint.load();if(!saved)return;
      busy=true;
      try{revision=await auth.saveCloud(saved,revision);}
      catch(err){
        cloudEnabled=false;console.warn('Cloud sync paused, no overwrite:',err);
        const status=document.getElementById('save-status');
        if(status)status.textContent='SYNC CLOUD SOSPESA: '+String(err.message||err).slice(0,64);
      }finally{busy=false;}
    };
    window.addEventListener('pokex:checkpoint',()=>{
      if(!cloudEnabled)return;clearTimeout(timer);timer=setTimeout(sync,1100);
    });
    if(cloudEnabled&&checkpoint.load()&&revision===null)await sync();
  }catch(err){
    if(guestSelected)return;
    setLoginStatus('Accesso al servizio non disponibile. Puoi continuare come Utente.',String(err.message||err).slice(0,250));
    login.disabled=false;
    login.textContent='RIPROVA CONNESSIONE';
    login.onclick=()=>window.location.reload();
  }
});
