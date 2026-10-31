/* Pokéxplorer local checkpoint prototype, deliberately NOT wired to gameplay.
 * No secret data; manual save/load only in the test harness until an atomic
 * snapshot boundary and Pokémon hydration have been fully verified.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PokexCheckpointPrototype = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const VERSION = 1, KEY = 'pokexplorer:prototype-checkpoint:v1';
  const maxBytes = 512 * 1024;
  const numeric = n => Number.isFinite(n) && n >= 0;
  function validate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Invalid checkpoint');
    if (snapshot.version !== VERSION) throw new Error('Unsupported checkpoint version');
    if (typeof snapshot.runId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(snapshot.runId)) throw new Error('Invalid run ID');
    if (!Number.isInteger(snapshot.floor) || snapshot.floor < 1 || snapshot.floor > 80) throw new Error('Invalid floor');
    if (!Number.isInteger(snapshot.money) || !numeric(snapshot.money)) throw new Error('Invalid money');
    if (!Array.isArray(snapshot.badges) || snapshot.badges.length > 8 || snapshot.badges.some(n => !Number.isInteger(n) || n < 0 || n > 7) || new Set(snapshot.badges).size!==snapshot.badges.length) throw new Error('Invalid badges');
    if (!Array.isArray(snapshot.team) || snapshot.team.length > 6) throw new Error('Invalid team');
    if (snapshot.team.some(mon => !mon || !Number.isInteger(mon.id) || mon.id<1 || !Number.isInteger(mon.level) || mon.level<1 || mon.level>100 || !numeric(mon.hp) || !numeric(mon.maxHp) || mon.hp > mon.maxHp || !Array.isArray(mon.moves) || mon.moves.length > 4 || mon.moves.some(m=>typeof m.id!=='string'||m.id.length>60||!numeric(m.pp)))) throw new Error('Invalid Pokémon data');
    if (!snapshot.items || typeof snapshot.items!=='object' || Array.isArray(snapshot.items) || Object.values(snapshot.items).some(value => typeof value !== 'boolean' && (!Number.isInteger(value)||value<0||value>999))) throw new Error('Invalid inventory');
    if (!Array.isArray(snapshot.completedGymFloors) || snapshot.completedGymFloors.some(n=>!Number.isInteger(n)||n<1||n>80)) throw new Error('Invalid completed floors');
    if (snapshot.activeIndex !== null && (!Number.isInteger(snapshot.activeIndex)||snapshot.activeIndex<0||snapshot.activeIndex>=snapshot.team.length)) throw new Error('Invalid active index');
    if (typeof snapshot.createdAt!=='string' || !Number.isFinite(Date.parse(snapshot.createdAt))) throw new Error('Invalid timestamp');
    const encoded = JSON.stringify(snapshot);
    if (new TextEncoder().encode(encoded).length > maxBytes) throw new Error('Checkpoint too large');
    return JSON.parse(encoded);
  }
  function create(game, runId, now = new Date().toISOString()) {
    // Allowlist avoids DOM nodes, timers, caches, unresolved promises and DEV state.
    const team=(game.team||[]).map(mon=>({id:mon.id,level:mon.level,hp:mon.currentHp,maxHp:mon.maxHp,
      moves:(mon.moves||[]).map(m=>({id:m.id,pp:m.currentPp}))}));
    return validate({version:VERSION,runId,floor:game.floor,money:game.money,
      badges:(game.badges||[]).map(b=>typeof b==='object'?b.id:b),team,
      activeIndex:game.activeMon?game.team.indexOf(game.activeMon):null,
      items:{...game.items},completedGymFloors:[...(game.completedGymFloors||[])],createdAt:now});
  }
  function save(snapshot, storage) {
    const data=JSON.stringify(validate(snapshot));
    storage.setItem(KEY+':pending',data);
    // Previous committed checkpoint is only replaced after staging succeeds.
    storage.setItem(KEY,data);
    storage.removeItem(KEY+':pending');
  }
  function load(storage) {
    const data=storage.getItem(KEY);
    if (!data)return null;
    try { return validate(JSON.parse(data)); }
    catch (cause){throw new Error('Saved checkpoint invalid or incompatible', {cause});}
  }
  function clear(storage){storage.removeItem(KEY);storage.removeItem(KEY+':pending');}
  return Object.freeze({VERSION,KEY,validate,create,save,load,clear});
});
