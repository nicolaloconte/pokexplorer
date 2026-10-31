/* PokéAPI client (F04): short bounded retries, abortable timeout, transient-only retry.
   Cache ownership remains in Pokemon, Move and GameEngine services. */
const POKEAPI_ROOT = 'https://pokeapi.co/api/v2/';
async function pokeApiRequest(resource,{timeoutMs=8000,retries=1}={}) {
  const path=String(resource).replace(/^\/+/, '');
  if (!/^[a-z0-9-]+\/[a-z0-9%._-]+$/i.test(path)) throw new Error('Percorso PokéAPI non valido');
  for(let attempt=0;attempt<=retries;attempt++) {
    const controller=typeof AbortController==='function'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
    try {
      const response=await fetch(POKEAPI_ROOT+path,controller?{signal:controller.signal}:{});
      if(!response.ok){
        const failure=new Error(`PokéAPI HTTP ${response.status} (${path})`);
        failure.status=response.status; throw failure;
      }
      const data=await response.json();
      if(!data||typeof data!=='object')throw new Error('Risposta PokéAPI non valida');
      return data;
    } catch(error) {
      const temporary=!error.status || error.status===429 || error.status>=500;
      if(attempt===retries || !temporary)throw error;
      await new Promise(resolve=>setTimeout(resolve,160*(attempt+1)));
    } finally {if(timer!==null)clearTimeout(timer);}
  }
}
