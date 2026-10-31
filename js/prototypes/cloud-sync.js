/* Optional Supabase Data API adapter. Not loaded by index.html and not connected
 * to a real account. Caller must supply a short-lived Supabase Auth session
 * access_token and user id from a verified session. Never supply secret keys.
 * Compatible with docs/SUPABASE_DISCORD_PLAN.md only after schema + RLS tests.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PokexCloudPrototype=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  class ConflictError extends Error { constructor(){super('Cloud checkpoint changed: manual conflict resolution required');this.name='ConflictError';} }
  function createClient({url,publishableKey,accessToken,userId,fetcher=fetch}){
    if(!/^https:\/\/[^/]+\/?$/.test(url||''))throw Error('Expected HTTPS Supabase URL');
    if(!publishableKey || !accessToken || !/^[0-9a-f-]{36}$/i.test(userId||'')) throw Error('Authenticated credentials required');
    const endpoint=`${url.replace(/\/$/,'')}/rest/v1/pokexplorer_saves`;
    const headers={'apikey':publishableKey,'authorization':`Bearer ${accessToken}`,'content-type':'application/json'};
    async function request(method,qs,payload,preferences){
      const res=await fetcher(`${endpoint}?${qs}`,{method,headers:{...headers,...(preferences?{'prefer':preferences}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
      if(!res.ok){throw Error(`Cloud API HTTP ${res.status}`);}
      return res.json();
    }
    const filter=`user_id=eq.${encodeURIComponent(userId)}`;
    return Object.freeze({
      async get(){const rows=await request('GET',`${filter}&select=revision,run,updated_at`);return rows[0]||null;},
      async create(run){const rows=await request('POST','select=revision,run,updated_at',
        {user_id:userId,revision:1,run},'return=representation');return rows[0]||null;},
      async update(run,expectedRevision){
        if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Invalid revision');
        const rows=await request('PATCH',`${filter}&revision=eq.${expectedRevision}&select=revision,run,updated_at`,
          {run,revision:expectedRevision+1},'return=representation');
        if(!rows.length)throw new ConflictError();
        return rows[0];
      }
    });
  }
  return {createClient,ConflictError};
});
