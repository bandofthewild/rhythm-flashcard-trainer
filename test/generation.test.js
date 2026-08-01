const fs=require('fs'), vm=require('vm');
// ---- DOM stub with a real checkbox registry ----
const checks={};                        // id -> {checked}
const vals={dropdownLevel:'1',dropdownTimeSignature:'4/4',dropdownDifficulty:'medium',allowTies:false};
function el(id){
  if(id && id.startsWith('rhythm-')){ if(!checks[id]) checks[id]={checked:false,id}; return checks[id]; }
  return { get value(){return vals[id];}, set value(v){vals[id]=v;}, get checked(){return !!vals[id];}, set checked(v){vals[id]=v;}, textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}} };
}
const document={
  getElementById:el,
  querySelectorAll(sel){ if(sel.includes('rhythmCheckboxes')) return Object.values(checks); return []; },
  querySelector(){return null;}, createElement(){return {style:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){}};},
  createElementNS(){return this.createElement();}
};
const sandbox={document, window:{}, console, VexFlow:{Flow:{setMusicFont(){}}}, RHYTHMTEST:{}};
sandbox.global=sandbox;
vm.createContext(sandbox);
const path=require('path');
const ROOT=path.join(__dirname,'..');
const engine=fs.readFileSync(path.join(ROOT,'src','engine.js'),'utf8');
vm.runInContext(engine + "\n;RHYTHMTEST.gen=generateMusicalRhythms;RHYTHMTEST.cnt=getCountingSyllables;RHYTHMTEST.enabled=getEnabledRhythms;RHYTHMTEST.defs=getDefaultRhythmsForLevel;RHYTHMTEST.UPM=UNITS_PER_MEASURE;RHYTHMTEST.eventIsRest=eventIsRest;RHYTHMTEST.applyDef=function(l,ts){document.querySelectorAll('#rhythmCheckboxes input').forEach(c=>c.checked=false);getDefaultRhythmsForLevel(l,ts).forEach(k=>{document.getElementById('rhythm-'+k).checked=true;});};", sandbox);

const {gen,cnt,enabled,UPM,eventIsRest,applyDef}=sandbox.RHYTHMTEST;
const meters=['4/4','3/4','2/4','6/8','9/8','12/8','2/2'];
const diffs=['easy','medium','hard'];
let tests=0, fails=0, examples=[];
for(const ts of meters){
  vals.dropdownTimeSignature=ts;
  for(let lv=1; lv<=6; lv++){
    vals.dropdownLevel=String(lv);
    applyDef(lv, ts);
    for(const df of diffs){
      vals.dropdownDifficulty=df;
      for(const M of [1,2]){
        for(let it=0; it<12; it++){
          tests++;
          const en=enabled();
          let measures;
          try{ measures=gen(ts,M,en); }
          catch(e){ fails++; examples.push(`THROW ${ts} L${lv} ${df} M${M}: ${e.message}`); continue; }
          if(!Array.isArray(measures)||measures.length!==M){ fails++; examples.push(`BADLEN ${ts} L${lv} ${df} M${M}: got ${measures&&measures.length}`); continue; }
          for(const m of measures){
            const sum=m.reduce((a,e)=>a+(e.units||0),0);
            if(sum!==UPM[ts]){ fails++; examples.push(`SUM ${ts} L${lv} ${df} M${M}: measure=${sum} expected=${UPM[ts]} :: ${m.map(e=>e.key+'('+e.units+')').join(' ')}`); }
            const c=cnt(m,ts);
            if(c.length!==m.length){ fails++; examples.push(`CNT ${ts} L${lv} ${df}: ${c.length} vs ${m.length}`); }
          }
        }
      }
    }
  }
}
console.log(`Ran ${tests} generation tests across ${meters.length} meters × 6 levels × 3 difficulties × {1,2} measures.`);
console.log(`Failures: ${fails}`);
console.log(examples.slice(0,25).join('\n')||'  (no failures)');
// show a couple of real samples w/ counting
vals.dropdownTimeSignature='4/4'; vals.dropdownLevel='4'; applyDef(4,'4/4'); vals.dropdownDifficulty='medium';
let s=gen('4/4',1,enabled())[0];
console.log('\nSample 4/4 L4:', s.map(e=>e.key+'/'+e.units).join('  '));
console.log('Counting:     ', cnt(s,'4/4').join('  '));
vals.dropdownTimeSignature='6/8'; vals.dropdownLevel='4'; applyDef(4,'6/8');
let s2=gen('6/8',1,enabled())[0];
console.log('Sample 6/8 L4:', s2.map(e=>e.key+'/'+e.units).join('  '));
console.log('Counting:     ', cnt(s2,'6/8').join('  '));

// ---- explicit compound counting checks (after the fix) ----
function eighthsMeasure(ts){ // build a full bar of eighth notes
  const upb=sandbox.RHYTHMTEST.UPM[ts]; const n=upb/2;
  const arr=[]; for(let i=0;i<n;i++) arr.push({key:'eighth',units:2,vexDur:'8',isRest:false});
  return arr;
}
console.log('\n=== compound counting (all eighths) ===');
for(const ts of ['6/8','9/8','12/8']){
  console.log(ts, '->', sandbox.RHYTHMTEST.cnt(eighthsMeasure(ts), ts).join(' '));
}
console.log('6/8 dotted half  ->', sandbox.RHYTHMTEST.cnt([{key:'dottedHalf',units:12,vexDur:'h',dots:1}], '6/8').join(' '));
console.log('6/8 eighth+16ths ->', sandbox.RHYTHMTEST.cnt([{key:'eighth',units:2},{key:'sixteenth',units:1},{key:'sixteenth',units:1},{key:'eighth',units:2},{key:'eighth',units:2},{key:'eighth',units:2},{key:'eighth',units:2}], '6/8').join(' '));
console.log('4/4 (unchanged)  ->', sandbox.RHYTHMTEST.cnt([{key:'quarter',units:4},{key:'eighth',units:2},{key:'eighth',units:2},{key:'sixteenth',units:1},{key:'sixteenth',units:1},{key:'sixteenth',units:1},{key:'sixteenth',units:1},{key:'quarter',units:4}], '4/4').join(' '));

// gate CI: a non-zero exit is what makes this suite able to fail a build
if(fails>0){ console.error(`\nFAILED: ${fails} generation failure(s).`); process.exit(1); }
process.exit(0);
