/* Pokéxplorer — R2.13: contextual musical director (HTML5, local MP3).
   Explicit scene changes only; old fades are cancelled when new scenes win. */
(()=>{'use strict';
  const SCENES=Object.freeze({
    exploration:'assets/audio/pokexplorer_bg_music.mp3',
    encounter:'assets/audio/pkmnxplorer_wild_trainer_encounter.mp3',
    gym:'assets/audio/pkmnxplorer_gym.mp3',
    legend_trio:'assets/audio/pkmnxplorer_legend_trio.mp3',
    cave:'assets/audio/pkmnxplorer_grotta_celeste.mp3',
    mewtwo:'assets/audio/pkmnxplorer_mewtwo.mp3'
  });
  const STORAGE_KEY='pokexplorer_local_music_volume_v1';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  class LocalBackgroundMusic{
    constructor(doc=document){
      this.doc=doc;this.effectAudios=new Map();this.audio=doc.getElementById('pokexplorer-background-music');
      this.slider=doc.getElementById('music-volume');
      this.output=doc.getElementById('music-volume-value');
      this.status=doc.getElementById('music-status');
      if(!this.audio)return;
      let saved=null;try{saved=localStorage.getItem(STORAGE_KEY)}catch(_){}
      const numeric=saved===null?NaN:Number(saved);
      this.volume=Number.isFinite(numeric)?clamp(numeric,0,100):10;
      this.scene='exploration';this.started=false;this.trying=false;
      this.transitionId=0;this.transitionFrame=0;this.audio.loop=true;
      this.audio.volume=this.volume/100;
      this.renderVolume();
      this.slider?.addEventListener('input',()=>this.setVolume(Number(this.slider.value)));
      this.onGesture=()=>this.tryStart();
      for(const name of ['pointerdown','touchstart','keydown'])
        doc.addEventListener(name,this.onGesture,{capture:true,passive:true});
      this.audio.addEventListener('play',()=>{
        this.started=true;this.removeGestureListeners();this.setStatus('Musica in riproduzione.');
      });
      this.audio.addEventListener('error',()=>this.setStatus('Traccia audio non disponibile.'));
      this.tryStart();
    }
    renderVolume(){if(this.slider)this.slider.value=String(this.volume);if(this.output)this.output.textContent=`${this.volume}%`;}
    // All in-game audio effects share the site's master MUSIC volume.
    // Effects remain separate from the looping soundtrack; no scene changes.
    registerEffect(audio,gain=1){
      if(!audio)return;
      this.effectAudios.set(audio,clamp(Number(gain)||0,0,1));
      this.updateEffectVolumes();
    }
    updateEffectVolumes(){
      for(const [audio,gain] of this.effectAudios){
        audio.volume=clamp((this.volume/100)*gain,0,1);
      }
    }
    setVolume(raw){
      this.volume=clamp(Number.isFinite(raw)?raw:10,0,100);
      this.renderVolume();
      this.updateEffectVolumes();
      // User mode never persists preferences, including audio volume.
      if(!window.PokexCheckpoints?.isGuestMode?.())try{localStorage.setItem(STORAGE_KEY,String(this.volume))}catch(_){}
      if(!this.transitionFrame)this.audio.volume=this.volume/100;
    }
    setStatus(text){if(this.status)this.status.textContent=text;}
    removeGestureListeners(){for(const name of ['pointerdown','touchstart','keydown'])this.doc.removeEventListener(name,this.onGesture,true);}
    tryStart(){
      if(!this.audio||this.trying||!this.audio.paused)return;
      this.trying=true;
      try{Promise.resolve(this.audio.play()).then(()=>{
        this.trying=false;this.started=true;this.removeGestureListeners();
      }).catch(()=>{this.trying=false;this.setStatus('La musica partirà alla prima interazione.');});}
      catch(_){this.trying=false;}
    }
    // Each area/battle owns its theme; replacement cancels any pending transition.
    setScene(scene){
      if(!Object.prototype.hasOwnProperty.call(SCENES,scene)||!this.audio)return;
      if(scene===this.scene)return;
      this.scene=scene;
      const token=++this.transitionId;
      if(this.transitionFrame){cancelAnimationFrame(this.transitionFrame);this.transitionFrame=0;}
      const start=performance.now(),from=this.audio.volume;
      const fade=()=>{
        if(token!==this.transitionId)return;
        const progress=clamp((performance.now()-start)/420,0,1);
        this.audio.volume=from*(1-progress);
        if(progress<1)this.transitionFrame=requestAnimationFrame(fade);
        else {
          this.transitionFrame=0;
          this.audio.pause();
          this.audio.src=SCENES[scene];this.audio.load();
          this.audio.loop=true;this.audio.volume=0;
          const begin=()=>{
            if(token!==this.transitionId)return;
            const started=performance.now();
            const rise=()=>{
              if(token!==this.transitionId)return;
              const p=clamp((performance.now()-started)/650,0,1);
              this.audio.volume=(this.volume/100)*p;
              this.transitionFrame=p<1?requestAnimationFrame(rise):0;
            };
            this.transitionFrame=requestAnimationFrame(rise);
          };
          try{Promise.resolve(this.audio.play()).then(begin).catch(()=>{
            this.audio.volume=this.volume/100;this.trying=false;
            this.setStatus('Tocca o premi un tasto per avviare la musica.');
            this.installResume();
          });}catch(_){this.installResume();}
        }
      };
      this.transitionFrame=requestAnimationFrame(fade);
    }
    installResume(){
      for(const name of ['pointerdown','touchstart','keydown'])this.doc.addEventListener(name,this.onGesture,{capture:true,passive:true});
    }
  }
  window.PokexplorerMusic=LocalBackgroundMusic;
  window.addEventListener('DOMContentLoaded',()=>{window.pokexplorerMusic=new LocalBackgroundMusic();});
})();
