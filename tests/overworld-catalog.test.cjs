const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const installed=require(path.join(root,'assets/sprites/npc/overworld/MANIFEST_RITRATTI.json'));
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'js/game-data.js'),'utf8'),context);
const check=expr=>vm.runInContext(expr,context);

test('esattamente 18 classi overworld approvate, nessuna duplicata',()=>{
 const names=Array.from(check('FIRERED_OVERWORLD_NAMES'));
 assert.equal(names.length,18);assert.equal(new Set(names).size,18);
 assert.deepEqual(names,installed.map(x=>x.type));
});
test('i ritratti scelti esistono e gli overworld sono sorgenti distinte',()=>{
 for(let i=0;i<installed.length;i++){
   const row=installed[i];assert.equal(row.id,`OW-${String(i+1).padStart(2,'0')}`);
   assert.ok(fs.existsSync(path.join(root,row.portrait)),row.portrait);
   assert.ok(row.map.startsWith('https://raw.githubusercontent.com/pret/pokefirered/'),row.map);
   assert.ok(!fs.existsSync(path.join(root,'assets/sprites/npc/overworld',row.type+'.png')),'Do not ship scaled portraits as overworld images');
 }
});
test('mappa con originali FireRed, dialogo con ritratti approvati',()=>{
 for(const item of installed){
   assert.equal(check(`overworldSpriteUrl(${JSON.stringify(item.type)})`),item.map);
   assert.equal(check(`overworldPortraitUrl(${JSON.stringify(item.type)})`),item.portrait);
   const legacy='https://raw.githubusercontent.com/pret/pokefirered/master/graphics/object_events/pics/people/'+item.type+'.png';
   assert.equal(check(`resolvedSpritePath(${JSON.stringify(legacy)})`),item.map);
   const corrupt='assets/sprites/npc/overworld/'+item.type+'.png';
   assert.equal(check(`resolvedSpritePath(${JSON.stringify(corrupt)})`),item.map);
 }
});
test('i nomi tecnici richiesti dalle API rimangono stabili',()=>{
 assert.equal(Array.from(check('FIRERED_NPC_NAMES')).length,16);
 assert.equal(Array.from(check('FIRERED_TRAINER_OVERWORLD_NAMES')).length,6);
});
