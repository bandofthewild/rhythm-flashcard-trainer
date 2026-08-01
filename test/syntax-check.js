// Extracts the inline <script> from index.html and syntax-checks it with node.
// Node-only, so it runs identically on Windows, mac, Linux and in CI.
const fs=require('fs'), path=require('path'), {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..');
const s=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const open='<script>\n(function(){';
const a=s.lastIndexOf(open), b=s.lastIndexOf('</script>');
if(a<0||b<0){ console.error('FAILED: could not locate the inline script in index.html'); process.exit(1); }
const inline=s.slice(a+'<script>\n'.length, b);
const wrapped=fs.readFileSync(path.join(__dirname,'dom-stubs.js'),'utf8')+inline;
const tmp=path.join(__dirname,'_wrapped.js');
fs.writeFileSync(tmp, wrapped);
try{
  execFileSync(process.execPath, ['--check', tmp], {stdio:['ignore','pipe','pipe']});
  console.log('syntax OK ('+inline.length+' chars of inline script)');
}catch(e){
  console.error('FAILED: syntax error in the inline script\n'+(e.stderr?e.stderr.toString():e.message));
  process.exit(1);
}finally{ try{fs.unlinkSync(tmp);}catch(_){} }
