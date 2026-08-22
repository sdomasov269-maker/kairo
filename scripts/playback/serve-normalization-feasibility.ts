import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";

const root = join(tmpdir(), "kairo-normalization-test");
const port = Number(process.argv[2] ?? 4317);
const shaka = join(process.cwd(), "node_modules", "shaka-player", "dist", "shaka-player.compiled.js");
const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t", ".js": "text/javascript", ".json": "application/json" };

const html = `<!doctype html><meta charset="utf-8"><title>Kairo normalization feasibility</title>
<script src="/shaka.js"></script><video id="video" muted playsinline style="width:640px"></video><pre id="result">loading</pre>
<script>
const params=new URLSearchParams(location.search); const variant=params.get('variant')||'original';
const targets=(params.get('targets')||'18,30').split(',').map(Number);
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:null};
const pct=(a,p)=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.min(b.length-1,Math.ceil(b.length*p)-1)]:null};
async function sample(video,target,player){
  video.currentTime=Math.max(0,target-1); await new Promise(r=>video.addEventListener('seeked',r,{once:true}));
  const frames=[]; let last=null; let startQuality=video.getVideoPlaybackQuality();
  await new Promise(async(resolve,reject)=>{let timeout=setTimeout(()=>reject(new Error('sample timeout')),12000);
    if(typeof video.requestVideoFrameCallback==='function'){
      function frame(now,meta){if(last)frames.push({wall:now-last.now,media:(meta.mediaTime-last.media)*1000,at:meta.mediaTime});last={now,media:meta.mediaTime};
        if(meta.mediaTime>=target+1){clearTimeout(timeout);resolve();return;} video.requestVideoFrameCallback(frame)} video.requestVideoFrameCallback(frame);
    }else{let count=startQuality.totalVideoFrames,lastNow=performance.now();const id=setInterval(()=>{const now=performance.now(),quality=video.getVideoPlaybackQuality();if(quality.totalVideoFrames!==count){frames.push({wall:now-lastNow,media:null,at:video.currentTime,count:quality.totalVideoFrames-count});count=quality.totalVideoFrames;lastNow=now}if(video.currentTime>=target+1){clearInterval(id);clearTimeout(timeout);resolve()}},4)}
    try{await video.play()}catch(error){reject(error)} }); video.pause();
  const local=frames.filter(f=>f.at>=target-.6&&f.at<=target+.6); const ranges=[]; for(let i=0;i<video.buffered.length;i++)ranges.push([video.buffered.start(i),video.buffered.end(i)]);
  const gaps=ranges.slice(1).map((r,i)=>({start:ranges[i][1],end:r[0],gap:(r[0]-ranges[i][1])*1000}));
  const q=video.getVideoPlaybackQuality(); return {target,measurement:typeof video.requestVideoFrameCallback==='function'?'rVFC':'videoPlaybackQuality polling',medianMediaMs:median(local.map(f=>f.media).filter(Number.isFinite)),p95WallMs:pct(local.map(f=>f.wall),.95),largestWallMs:Math.max(...local.map(f=>f.wall)),largestMediaMs:Math.max(...local.map(f=>f.media).filter(Number.isFinite)),
    droppedFrames:q.droppedVideoFrames-startQuality.droppedVideoFrames,bufferAhead:ranges.find(r=>target>=r[0]&&target<=r[1])?.[1]-target??null,readyState:video.readyState,shakaBuffering:player.isBuffering(),ranges,gaps}; }
async function sequential(video,player){
  const frames=[],events=[],buffering=[];let previous=null;
  for(const name of ['waiting','stalled','seeking','seeked','playing','ended'])video.addEventListener(name,()=>events.push({name,at:video.currentTime,wall:performance.now()}));
  player.addEventListener('buffering',event=>buffering.push({value:event.buffering,at:video.currentTime,wall:performance.now()}));
  const frame=(now,meta)=>{let ahead=null;for(let i=0;i<video.buffered.length;i++)if(meta.mediaTime>=video.buffered.start(i)&&meta.mediaTime<=video.buffered.end(i))ahead=video.buffered.end(i)-meta.mediaTime;
    if(previous&&meta.mediaTime>1)frames.push({at:meta.mediaTime,wallDelta:now-previous.now,mediaDelta:(meta.mediaTime-previous.mediaTime)*1000,expectedDelta:meta.expectedDisplayTime-previous.expected,processingDuration:meta.processingDuration*1000,presentedDelta:meta.presentedFrames-previous.presented,bufferAhead:ahead,readyState:video.readyState,shakaBuffering:player.isBuffering()});
    previous={now,mediaTime:meta.mediaTime,expected:meta.expectedDisplayTime,presented:meta.presentedFrames};if(!video.ended)video.requestVideoFrameCallback(frame)};
  video.requestVideoFrameCallback(frame);await video.play();await new Promise(resolve=>video.addEventListener('ended',resolve,{once:true}));
  const ranges=[];for(let i=0;i<video.buffered.length;i++)ranges.push([video.buffered.start(i),video.buffered.end(i)]);const quality=video.getVideoPlaybackQuality();
  const summarize=list=>{const values=list.map(f=>f.wallDelta).sort((a,b)=>a-b);return {callbacks:list.length,median:median(values),p95:pct(values,.95),largest:values.at(-1)??null,over80:values.filter(v=>v>80).length,over120:values.filter(v=>v>120).length,over160:values.filter(v=>v>160).length,over200:values.filter(v=>v>200).length,maxProcessing:Math.max(0,...list.map(f=>f.processingDuration)),largeFrames:list.filter(f=>f.wallDelta>80).map(f=>({at:f.at,wallDelta:f.wallDelta,mediaDelta:f.mediaDelta,bufferAhead:f.bufferAhead,readyState:f.readyState,shakaBuffering:f.shakaBuffering}))}};
  return {variant,duration:video.duration,resolution:[video.videoWidth,video.videoHeight],whole:summarize(frames),at18:summarize(frames.filter(f=>f.at>=17&&f.at<=19)),at30:summarize(frames.filter(f=>f.at>=29&&f.at<=31)),quality:{total:quality.totalVideoFrames,dropped:quality.droppedVideoFrames,corrupted:quality.corruptedVideoFrames},events,buffering,ranges,gaps:ranges.slice(1).map((r,i)=>(r[0]-ranges[i][1])*1000)};
}
(async()=>{const video=document.querySelector('#video');const player=new shaka.Player();await player.attach(video);player.configure({streaming:{bufferingGoal:45,rebufferingGoal:6,bufferBehind:30,segmentPrefetchLimit:3}});
 await player.load('/'+variant+'/playlist.m3u8'); window.__player=player; window.__loaded=true;
 if(params.get('sequential')==='1'){const out=await sequential(video,player);window.__result=out;document.querySelector('#result').textContent=JSON.stringify(out,null,2)}
 else if(params.get('auto')==='1'){const samples=[];for(const target of targets)samples.push(await sample(video,target,player));const out={variant,duration:video.duration,samples};window.__result=out;document.querySelector('#result').textContent=JSON.stringify(out,null,2)}
 else document.querySelector('#result').textContent=JSON.stringify({variant,duration:video.duration,loaded:true},null,2)})().catch(e=>{window.__error=String(e?.stack||e);document.querySelector('#result').textContent=window.__error});
</script>`;

createServer((request, response) => {
  const path = new URL(request.url ?? "/", `http://localhost:${port}`).pathname;
  if (path === "/" || path === "/test.html") { response.setHeader("content-type", mime[".html"]!); response.end(html); return; }
  const file = path === "/shaka.js" ? shaka : normalize(join(root, decodeURIComponent(path)));
  if (file !== shaka && !file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { response.statusCode = 404; response.end("not found"); return; }
  const size = statSync(file).size; const range = request.headers.range;
  response.setHeader("access-control-allow-origin", "*"); response.setHeader("content-type", mime[extname(file)] ?? "application/octet-stream");
  if (range) { const match=/bytes=(\d+)-(\d*)/.exec(range); const start=Number(match?.[1]??0); const end=match?.[2]?Number(match[2]):size-1;
    response.statusCode=206;response.setHeader("accept-ranges","bytes");response.setHeader("content-range",`bytes ${start}-${end}/${size}`);response.setHeader("content-length",end-start+1);createReadStream(file,{start,end}).pipe(response);return; }
  response.setHeader("content-length",size); createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/test.html`));
