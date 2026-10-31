/* Discord social login + Supabase adapter.
   This module accepts PUBLIC URL and publishable key only. The Discord client
   secret and any service_role key must remain on the provider/server. */
(function(root){
 'use strict';
 const settings=root.POKEX_PUBLIC_CONFIG||{};
 const SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.js';
 let client=null;
 function enabled(){
   return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(settings.supabaseUrl||'') &&
     typeof settings.publishableKey==='string' && settings.publishableKey.trim().length>15;
 }
 function redirectUrl(loc=root.location){
   if(!loc || !((loc.protocol==='https:') || (loc.protocol==='http:' && /^(localhost|127\.0\.0\.1)$/.test(loc.hostname)))){
     throw Error('Discord login requires HTTPS or localhost; file:// is not supported');
   }
   return `${loc.origin}${loc.pathname}`;
 }
 function profile(user){
   const md=user?.user_metadata||{};
   const name=String(md.full_name||md.name||md.user_name||md.preferred_username||'ALLENATORE').trim().slice(0,28);
   let avatar=null;
   try{
     const url=new URL(md.avatar_url||'');
     if(url.protocol==='https:'&&['cdn.discordapp.com','media.discordapp.net','cdn.discordapp.net'].includes(url.hostname)) avatar=url.href;
   }catch(_){/* fallback artwork */}
   return {name,avatar};
 }
 async function setup(){
   if(!enabled()) return {configured:false,client:null,user:null};
   redirectUrl();
   if(!root.supabase?.createClient){
     await new Promise((resolve,reject)=>{
       const js=root.document.createElement('script');
       js.src=SDK_URL;js.async=true;js.onload=resolve;
       js.onerror=()=>reject(Error('Supabase SDK unavailable'));
       root.document.head.appendChild(js);
     });
   }
   if(!root.supabase?.createClient) throw Error('Supabase SDK missing');
   if(!client){
     client=root.supabase.createClient(settings.supabaseUrl,settings.publishableKey,{
       auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
     });
   }
   const {data,error}=await client.auth.getUser();
   if(error && !(/Auth session missing/i.test(error.message||'') || error.name==='AuthSessionMissingError')) throw error;
   return {configured:true,client,user:data?.user||null};
 }
 async function signIn(){
   if(!client)throw Error('OAuth not initialized');
   const {error}=await client.auth.signInWithOAuth({
     provider:'discord',options:{redirectTo:redirectUrl(),scopes:'identify'}
   });
   if(error)throw error;
 }
 async function signOut(){if(!client)throw Error('OAuth not initialized');const {error}=await client.auth.signOut();if(error)throw error;}
 async function user(){if(!client)return null;const {data,error}=await client.auth.getUser();if(error)return null;return data?.user||null;}
 async function loadCloud(){
   const u=await user();if(!u)return null;
   const {data,error}=await client.from('pokexplorer_saves').select('revision,run,updated_at').eq('user_id',u.id).maybeSingle();
   if(error)throw error;return data;
 }
 async function saveCloud(snapshot,expectedRevision){
   const u=await user();if(!u)throw Error('Not authenticated');
   const safe=root.PokexCheckpoints.validate(snapshot);
   if(expectedRevision===null){
     const {data,error}=await client.from('pokexplorer_saves').insert({user_id:u.id,revision:1,run:safe}).select('revision').single();
     if(error)throw error;return data.revision;
   }
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Invalid cloud revision');
   const {data,error}=await client.from('pokexplorer_saves').update({run:safe,revision:expectedRevision+1,updated_at:new Date().toISOString()})
      .eq('user_id',u.id).eq('revision',expectedRevision).select('revision').maybeSingle();
   if(error)throw error;
   if(!data)throw Error('Cloud conflict: newer progress exists; no overwrite performed');
   return data.revision;
 }
 root.PokexAuth=Object.freeze({enabled,redirectUrl,profile,setup,signIn,signOut,user,loadCloud,saveCloud,get client(){return client;}});
})(typeof window!=='undefined'?window:globalThis);
