const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=fs.readFileSync(path.join(root,'js/game-data.js'),'utf8');
const context=vm.createContext({window:{}});
vm.runInContext(data,context);
const read=e=>vm.runInContext(e,context);
const manifest=require(path.join(root,'assets/sprites/npc/overworld/MANIFEST_RITRATTI.json'));
test('18 overworld distinct from 18 approved portraits',()=>{
 assert.equal(manifest.length,18);
 for(const item of manifest){
  const map=read(`overworldSpriteUrl(${JSON.stringify(item.type)})`);
  const portrait=read(`overworldPortraitUrl(${JSON.stringify(item.type)})`);
  assert.equal(map,item.map);
  assert.equal(portrait,item.portrait);
  assert.ok(map.includes('/object_events/pics/people/'));
  assert.ok(fs.existsSync(path.join(root,portrait)));
  assert.notEqual(map,portrait);
  assert.equal(read(`resolvedSpritePath(${JSON.stringify('assets/sprites/npc/overworld/'+item.type+'.png')})`),map);
 }
});
test('no generated portrait-as-overworld assets remain',()=>{
 const dir=path.join(root,'assets/sprites/npc/overworld');
 assert.equal(fs.readdirSync(dir).filter(n=>n.endsWith('.png')).length,0);
 assert.ok(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('overworld-local-assets.js'));
});
