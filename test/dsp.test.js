const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
// pull the two pure DSP functions straight out of the glue source, so this test
// can never drift from the shipped code
const glue=fs.readFileSync(path.join(ROOT,'src','shell_bottom.html'),'utf8');
const a=glue.indexOf('  function detectTempoFromEnvelope(');
const b=glue.indexOf('  function normBarBeats(');
if(a<0||b<0){ console.error('DSP functions not found in src/shell_bottom.html'); process.exit(1); }
eval(glue.slice(a,b));
const fps=22050/256;
function clickEnv(bpm, phaseSec, durSec, barLen, accent){
  const n=Math.floor(durSec*fps), env=new Float32Array(n);
  const period=fps*60/bpm, ph=phaseSec*fps;
  const nb=Math.floor((n-1-ph)/period);
  for(let k=0;k<nb;k++){
    const x=Math.round(ph+k*period);
    if(x>0&&x<n){ const isDown=(k%barLen)===accent; env[x]= isDown?1.0:0.55; }
  }
  return env;
}
let pass=0, fail=0;
function check(name, cond, got){ if(cond){pass++; console.log('  PASS '+name+'  '+got);} else {fail++; console.log('  FAIL '+name+'  '+got);} }

console.log('=== tempo + phase detection ===');
for(const [bpm,ph] of [[120,0.0],[96,0.137],[144,0.42],[72,0.9],[168,0.05]]){
  const env=clickEnv(bpm, ph, 40, 4, 0);
  const r=detectTempoFromEnvelope(env, fps, 40, 220);
  const dBpm=Math.abs(r.bpm-bpm);
  // phase is modulo the period
  const per=60/bpm; let dPh=Math.abs(((r.beatSec-ph)%per+per)%per); if(dPh>per/2) dPh=per-dPh;
  check(`bpm=${bpm} ph=${ph}s`, dBpm<=0.3 && dPh<0.02, `got ${r.bpm} bpm, phase off ${(dPh*1000).toFixed(1)}ms`);
}

console.log('=== bar phase (argmax convention, brief bug #1) ===');
for(const barLen of [4,3,2,6]){
  for(const accent of [...Array(barLen).keys()]){
    const bpm=120, ph=0.25;
    const envLow=clickEnv(bpm, ph, 60, barLen, accent);
    const got=pickBarPhase(envLow, fps, bpm, ph*fps, barLen);
    check(`barLen=${barLen} accent=${accent}`, got===accent, `got barBeats=${got}`);
  }
}

console.log('=== barLen=3 must never return 3 (brief bug #2 freeze) ===');
{
  const envLow=clickEnv(120,0.1,60,3,2);
  const g=pickBarPhase(envLow,fps,120,0.1*fps,3);
  check('range', g>=0 && g<3, `got ${g}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
