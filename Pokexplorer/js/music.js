/* Pokéxplorer V7.7 — music player HTML5 senza dipendenze o controlli play/pause.
 * Riproduce il file MP3 locale; autoplay quando consentito e avvio al primo gesto altrimenti.
 * Loop nativo e dissolvenza progressiva di ingresso/uscita ogni ciclo.
 */
(()=>{'use strict';
  const DEFAULT_VOLUME=10;
  const FADE_SECONDS=2.3;
  const STORAGE_KEY='pokexplorer_local_music_volume_v1';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  class LocalBackgroundMusic {
    constructor(doc=document){
      this.audio=doc.getElementById('pokexplorer-background-music');
      this.slider=doc.getElementById('music-volume');
      this.output=doc.getElementById('music-volume-value');
      this.status=doc.getElementById('music-status');
      if(!this.audio)return;
      let stored=null;
      try{stored=window.localStorage.getItem(STORAGE_KEY);}catch(_){/* storage may be denied */}
      const remembered=stored!==null?Number(stored):NaN;
      this.volume=Number.isFinite(remembered)?clamp(remembered,0,100):DEFAULT_VOLUME;
      this.audio.loop=true;
      this.audio.volume=0;
      this.started=false;
      this.frame=0;
      this.lastPosition=0;
      this.trying=false;
      this.initialGestureListener=this.tryStartFromGesture.bind(this);
      this.renderVolume();
      this.slider?.addEventListener('input',()=>this.setVolume(Number(this.slider.value)));
      this.audio.addEventListener('play',()=>{
        this.started=true;
        this.removeGestureListeners();
        this.setStatus('Musica in riproduzione.');
        this.startMeter();
      });
      this.audio.addEventListener('pause',()=>this.stopMeter());
      this.audio.addEventListener('seeking',()=>{this.lastPosition=this.audio.currentTime||0;});
      this.audio.addEventListener('error',()=>this.setStatus('File musicale non disponibile.'));
      // Il loop nativo continua anche se la scheda resta in background.
      this.installGestureListeners(doc);
      this.tryStart();
    }
    renderVolume(){
      if(this.slider)this.slider.value=String(this.volume);
      if(this.output)this.output.textContent=`${this.volume}%`;
    }
    setVolume(raw){
      this.volume=clamp(Number.isFinite(raw)?raw:DEFAULT_VOLUME,0,100);
      this.renderVolume();
      try{window.localStorage.setItem(STORAGE_KEY,String(this.volume));}catch(_){/* optional */}
      this.adjustGain();
    }
    setStatus(text){if(this.status)this.status.textContent=text;}
    installGestureListeners(doc){
      // Capture phase: l'avvio è nello stesso evento utente, prima dei click del gioco.
      for(const type of ['pointerdown','touchstart','keydown'])
        doc.addEventListener(type,this.initialGestureListener,{capture:true,passive:true});
    }
    removeGestureListeners(){
      for(const type of ['pointerdown','touchstart','keydown'])
        document.removeEventListener(type,this.initialGestureListener,true);
    }
    tryStartFromGesture(){this.tryStart();}
    tryStart(){
      if(this.started||this.trying||!this.audio)return;
      this.trying=true;
      let p;
      try{p=this.audio.play();}
      catch(_){this.trying=false;this.setStatus('La musica partirà alla prima interazione con il gioco.');return;}
      Promise.resolve(p).then(()=>{
        this.trying=false;
        this.started=true;
        this.removeGestureListeners();
        this.startMeter();
      }).catch(()=>{
        this.trying=false;
        this.setStatus('La musica partirà alla prima interazione con il gioco.');
      });
    }
    adjustGain(){
      if(!this.audio)return;
      const t=Number(this.audio.currentTime)||0;
      const duration=Number(this.audio.duration)||0;
      // La durata esatta arriva dai metadati MP3; nessuna durata hardcoded.
      const fadeIn=clamp(t/FADE_SECONDS,0,1);
      const fadeOut=Number.isFinite(duration)&&duration>FADE_SECONDS
        ?clamp((duration-t)/FADE_SECONDS,0,1):1;
      // Se lo stream ricomincia da zero, fadeIn riparte automaticamente.
      this.audio.volume=clamp((this.volume/100)*Math.min(fadeIn,fadeOut),0,1);
      this.lastPosition=t;
    }
    startMeter(){
      this.stopMeter();
      const step=()=>{
        if(this.audio.paused||this.audio.ended){this.frame=0;return;}
        this.adjustGain();
        this.frame=requestAnimationFrame(step);
      };
      this.frame=requestAnimationFrame(step);
    }
    stopMeter(){if(this.frame){cancelAnimationFrame(this.frame);this.frame=0;}}
  }
  window.PokexplorerMusic=LocalBackgroundMusic;
  window.addEventListener('DOMContentLoaded',()=>{window.pokexplorerMusic=new LocalBackgroundMusic();});
})();
