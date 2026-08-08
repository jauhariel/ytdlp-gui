"use strict";
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmtDur(s){if(s===null||s===undefined||isNaN(s))return "";s=Math.floor(s);var h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  var mm=h?("0"+m).slice(-2):String(m);var xx=("0"+x).slice(-2);return h?h+":"+mm+":"+xx:mm+":"+xx}
function toast(msg,isErr){var t=document.createElement("div");t.className="toast"+(isErr?" err":"");t.textContent=msg;document.body.appendChild(t);
  setTimeout(function(){t.remove()},isErr?6000:2500)}
function post(url,obj){return fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(obj||{})}).then(function(r){return r.json()})}

var mode="video";
var items=[];
var lastJobs={};

// ---------- ikon SVG (gaya feather) ----------
var IC={
search:"<circle cx='11' cy='11' r='7'/><line x1='21' y1='21' x2='16.5' y2='16.5'/>",
clipboard:"<rect x='8' y='2' width='8' height='4' rx='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/>",
folder:"<path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/>",
external:"<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/><polyline points='15 3 21 3 21 9'/><line x1='10' y1='14' x2='21' y2='3'/>",
film:"<rect x='2' y='2' width='20' height='20' rx='2.2'/><line x1='7' y1='2' x2='7' y2='22'/><line x1='17' y1='2' x2='17' y2='22'/><line x1='2' y1='12' x2='22' y2='12'/><line x1='2' y1='7' x2='7' y2='7'/><line x1='2' y1='17' x2='7' y2='17'/><line x1='17' y1='17' x2='22' y2='17'/><line x1='17' y1='7' x2='22' y2='7'/>",
music:"<path d='M9 18V5l12-2v13'/><circle cx='6' cy='18' r='3'/><circle cx='18' cy='16' r='3'/>",
checkSquare:"<polyline points='9 11 12 14 22 4'/><path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'/>",
square:"<rect x='3' y='3' width='18' height='18' rx='2'/>",
download:"<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>",
trash:"<polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>",
terminal:"<polyline points='4 17 10 11 4 5'/><line x1='12' y1='19' x2='20' y2='19'/>",
refresh:"<polyline points='23 4 23 10 17 10'/><polyline points='1 20 1 14 7 14'/><path d='M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15'/>",
power:"<path d='M18.4 6.6a9 9 0 1 1-12.8 0'/><line x1='12' y1='2' x2='12' y2='12'/>",
x:"<line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>",
zap:"<polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/>",
clock:"<circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>",
checkCircle:"<path d='M22 11.1V12a10 10 0 1 1-5.9-9.1'/><polyline points='22 4 12 14 9 11'/>",
loader:"<line x1='12' y1='2' x2='12' y2='6'/><line x1='12' y1='18' x2='12' y2='22'/><line x1='4.9' y1='4.9' x2='7.8' y2='7.8'/><line x1='16.2' y1='16.2' x2='19.1' y2='19.1'/><line x1='2' y1='12' x2='6' y2='12'/><line x1='18' y1='12' x2='22' y2='12'/><line x1='4.9' y1='19.1' x2='7.8' y2='16.2'/><line x1='16.2' y1='7.8' x2='19.1' y2='4.9'/>",
alert:"<path d='M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
sun:"<circle cx='12' cy='12' r='4'/><line x1='12' y1='2' x2='12' y2='5'/><line x1='12' y1='19' x2='12' y2='22'/><line x1='4.2' y1='4.2' x2='6.4' y2='6.4'/><line x1='17.6' y1='17.6' x2='19.8' y2='19.8'/><line x1='2' y1='12' x2='5' y2='12'/><line x1='19' y1='12' x2='22' y2='12'/><line x1='4.2' y1='19.8' x2='6.4' y2='17.6'/><line x1='17.6' y1='6.4' x2='19.8' y2='4.2'/>",
moon:"<path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/>",
info:"<circle cx='12' cy='12' r='10'/><line x1='12' y1='16' x2='12' y2='12'/><line x1='12' y1='8' x2='12.01' y2='8'/>",
github:"<path d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22'/>"
};
var LOGO="<svg width='44' height='44' viewBox='0 0 64 64'><defs><linearGradient id='lg2' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#6366f1'/><stop offset='1' stop-color='#a855f7'/></linearGradient></defs><rect width='64' height='64' rx='15' fill='url(#lg2)'/><path d='M32 14v22M22 28l10 10 10-10' stroke='white' stroke-width='6' stroke-linecap='round' stroke-linejoin='round' fill='none'/><line x1='18' y1='48' x2='46' y2='48' stroke='white' stroke-width='6' stroke-linecap='round'/></svg>";
function ic(n,s,spin){return "<svg class='ic"+(spin?" spin":"")+"' width='"+(s||15)+"' height='"+(s||15)+"' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>"+IC[n]+"</svg>"}

// ---------- i18n ----------
var LANGS={
id:{
urlPh:"Tempel URL playlist / video di sini…",paste:"Tempel",fetch:"Ambil Info",fetching:"Mengambil…",
canDo:"Bisa download dari:",chipMore:"dll",
video:"Video",audio:"Audio",res:"Resolusi",resBest:"Terbaik (maksimal)",fmt:"Format file",
h264:"Utamakan codec H.264 (kompatibel)",subs:"Download subtitle",subLangs:"Bahasa subtitle",esubs:"Tempel subtitle ke video",
aformat:"Format audio",aquality:"Kualitas / bitrate",best:"Terbaik",
numbering:"Nomor urut playlist di nama file",emeta:"Embed metadata",ethumb:"Embed thumbnail",
sponsor:"SponsorBlock (potong iklan sponsor)",cookies:"Cookies browser (utk video member/dibatasi)",cookiesNone:"Tidak pakai",
rate:"Batas kecepatan (kosong = unlimited, cth: 5M)",conc:"Download bersamaan",
outdir:"Folder tujuan",browse:"Pilih Folder…",browsing:"Pilih folder…",open:"Lihat Hasil",
openT:"Buka folder tujuan di Explorer (buat lihat hasil download)",
update:"Update yt-dlp",updateT:"Update yt-dlp ke versi terbaru",quit:"Keluar",quitT:"Tutup aplikasi",
selAll:"Pilih Semua",selNone:"Kosongkan",selCount:"{0} / {1} dipilih",
downloadSel:"Download Terpilih",queue:"Antrean Download",clear:"Bersihkan selesai",logT:"Log yt-dlp",
stQ:"Antre",stD:"Download",stP:"Proses",stDone:"Selesai",stE:"Gagal",stC:"Batal",
totTotal:"Total",totDone:"selesai",totRun:"berjalan",totQueue:"antre",totFail:"gagal",
errUrl:"Masukkan URL yang valid",errPick:"Pilih minimal 1 video",errOutdir:"Isi folder tujuan dulu",
added:"{0} video masuk antrean",clipErr:"Gagal baca clipboard",
setupFail:"Setup otomatis gagal: {0} — coba restart aplikasi",setupPrep:"Menyiapkan komponen dulu:",
closedT:"Aplikasi ditutup",closedP:"Jendela ini boleh ditutup.",
toLight:"Mode terang",toDark:"Mode gelap",checking:"cek…",noYtdlp:"yt-dlp TIDAK ditemukan",
infoT:"Tentang aplikasi",aboutDesc:"GUI desktop untuk yt-dlp — download video & audio.",aboutBy:"Dibuat oleh",aboutSrc:"Kode sumber & lapor bug",aboutThanks:"Ditenagai oleh",close:"Tutup"
},
en:{
urlPh:"Paste playlist / video URL here…",paste:"Paste",fetch:"Fetch Info",fetching:"Fetching…",
canDo:"Download from:",chipMore:"etc.",
video:"Video",audio:"Audio",res:"Resolution",resBest:"Best (maximum)",fmt:"File format",
h264:"Prefer H.264 codec (compatible)",subs:"Download subtitles",subLangs:"Subtitle languages",esubs:"Embed subtitles into video",
aformat:"Audio format",aquality:"Quality / bitrate",best:"Best",
numbering:"Playlist numbering in filename",emeta:"Embed metadata",ethumb:"Embed thumbnail",
sponsor:"SponsorBlock (cut sponsor segments)",cookies:"Browser cookies (for member/restricted videos)",cookiesNone:"None",
rate:"Speed limit (empty = unlimited, e.g. 5M)",conc:"Concurrent downloads",
outdir:"Destination folder",browse:"Browse…",browsing:"Browsing…",open:"Open Folder",
openT:"Open destination folder in Explorer (view downloads)",
update:"Update yt-dlp",updateT:"Update yt-dlp to latest version",quit:"Exit",quitT:"Close application",
selAll:"Select All",selNone:"Clear",selCount:"{0} / {1} selected",
downloadSel:"Download Selected",queue:"Download Queue",clear:"Clear finished",logT:"yt-dlp log",
stQ:"Queued",stD:"Downloading",stP:"Processing",stDone:"Done",stE:"Failed",stC:"Cancelled",
totTotal:"Total",totDone:"done",totRun:"running",totQueue:"queued",totFail:"failed",
errUrl:"Enter a valid URL",errPick:"Select at least 1 video",errOutdir:"Set the destination folder first",
added:"{0} video(s) queued",clipErr:"Failed to read clipboard",
setupFail:"Automatic setup failed: {0} — try restarting the app",setupPrep:"Setting up components first:",
closedT:"App closed",closedP:"You may close this window.",
toLight:"Switch to light mode",toDark:"Switch to dark mode",checking:"checking…",noYtdlp:"yt-dlp NOT found",
infoT:"About this app",aboutDesc:"Desktop GUI for yt-dlp — download video & audio.",aboutBy:"Created by",aboutSrc:"Source code & bug reports",aboutThanks:"Powered by",close:"Close"
}};
var lang="id";
try{lang=localStorage.getItem("lang")||(((navigator.language||"").toLowerCase().indexOf("id")===0)?"id":"en")}catch(e){}
function T(k){var s=(LANGS[lang]&&LANGS[lang][k])||LANGS.en[k]||k;for(var i=1;i<arguments.length;i++){s=s.replace("{"+(i-1)+"}",arguments[i])}return s}
function applyLang(){
  document.documentElement.setAttribute("lang",lang);
  document.querySelectorAll("[data-t]").forEach(function(el){
    var icSpan=el.querySelector("[data-ic]");
    if(icSpan){el.setAttribute("data-icn",icSpan.getAttribute("data-ic"));el.setAttribute("data-isz",icSpan.getAttribute("data-sz")||"15")}
    var n=el.getAttribute("data-icn");
    if(n){el.innerHTML=ic(n,parseInt(el.getAttribute("data-isz"),10))+" <span class='bl'>"+T(el.getAttribute("data-t"))+"</span>"}
    else{el.textContent=T(el.getAttribute("data-t"))}
  });
  document.querySelectorAll("[data-tp]").forEach(function(el){el.placeholder=T(el.getAttribute("data-tp"))});
  document.querySelectorAll("[data-tt]").forEach(function(el){el.title=T(el.getAttribute("data-tt"))});
  var b=$("st-ytdlp");if(b.className==="badge")b.textContent=T("checking");
  setThemeIcon();
  updateCount();
  // hidrasi icon yg berdiri sendiri (tanpa parent data-t), mis. tombol info
  document.querySelectorAll("[data-ic]").forEach(function(el){
    if(!el.querySelector("svg"))el.innerHTML=ic(el.getAttribute("data-ic"),parseInt(el.getAttribute("data-sz")||"15",10));
  });
}

// ---------- tema ----------
var theme="dark";
try{theme=localStorage.getItem("theme")||"dark"}catch(e){}
function setThemeIcon(){var b=$("btn-theme");b.innerHTML=ic(theme==="light"?"moon":"sun");b.title=T(theme==="light"?"toDark":"toLight")}
function setTheme(t){theme=t;document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("theme",t)}catch(e){}setThemeIcon()}
$("btn-theme").addEventListener("click",function(){setTheme(theme==="light"?"dark":"light")});
$("btn-info").addEventListener("click",function(){$("modal-info").classList.add("show")});
$("modal-info").addEventListener("click",function(e){if(e.target===this||e.target.closest("[data-close]"))this.classList.remove("show")});
document.addEventListener("keydown",function(e){if(e.key==="Escape")$("modal-info").classList.remove("show")});
$("link-repo").addEventListener("click",function(e){e.preventDefault();post("/api/open-url",{url:this.getAttribute("href")})});
$("sel-lang").value=lang;
$("sel-lang").addEventListener("change",function(){lang=$("sel-lang").value;try{localStorage.setItem("lang",lang)}catch(e){}applyLang()});
setTheme(theme);
applyLang();

// ---------- status ----------
function refreshStatus(){
  fetch("/api/status").then(function(r){return r.json()}).then(function(s){
    var b=$("st-ytdlp");
    if(s.ytdlp){b.textContent="yt-dlp "+s.version;b.className="badge ok"}
    else{b.textContent=T("noYtdlp");b.className="badge err"}
    if(!$("outdir").value)$("outdir").value=(s.home||"")+"\\Downloads\\yt-dlp";
    if(s.setup)updSetup(s.setup);
  });
}
refreshStatus();

// ---------- banner setup ----------
function updSetup(s){
  var b=$("setup-banner");
  if(s.error){
    b.className="banner err";
    b.innerHTML=ic("alert",16)+" <span>"+T("setupFail",esc(s.error))+"</span>";
    return;
  }
  if(s.running){
    b.className="banner";
    b.innerHTML=ic("loader",16,true)+'<span>'+T("setupPrep")+' <b>'+esc(s.msg)+'</b>'+(s.percent>=0?' '+s.percent.toFixed(0)+'%':'')+' …</span>';
    return;
  }
  if(!b.classList.contains("hidden")){refreshStatus()}
  b.className="banner hidden";
}

// ---------- mode tabs ----------
var tabs=document.querySelectorAll(".tab");
tabs.forEach(function(t){t.addEventListener("click",function(){
  tabs.forEach(function(x){x.classList.remove("active")});
  t.classList.add("active");
  mode=t.dataset.mode;
  $("opts-video").classList.toggle("hidden",mode!=="video");
  $("opts-audio").classList.toggle("hidden",mode!=="audio");
})});

// ---------- paste ----------
$("btn-paste").addEventListener("click",function(){
  navigator.clipboard.readText().then(function(t){$("url").value=t.trim()}).catch(function(){toast(T("clipErr"),true)});
});
$("url").addEventListener("keydown",function(e){if(e.key==="Enter")$("btn-fetch").click()});

// ---------- probe ----------
$("btn-fetch").addEventListener("click",function(){
  var url=$("url").value.trim();
  if(!/^https?:\/\//i.test(url)){toast(T("errUrl"),true);return}
  var btn=$("btn-fetch");btn.disabled=true;btn.innerHTML=ic("loader",15,true)+" "+T("fetching");
  post("/api/probe",{url:url,cookies:$("cookies").value,lang:lang}).then(function(r){
    btn.disabled=false;btn.innerHTML=ic("search")+" "+T("fetch");
    if(r.error){toast(r.error,true);return}
    items=r.items;
    $("plinfo").classList.remove("hidden");
    $("options").classList.remove("hidden");
    $("listwrap").classList.remove("hidden");
    $("pl-title").textContent=r.title+(r.isPlaylist?"":"");
    $("pl-meta").textContent=(r.site?r.site+" • ":"")+(r.uploader?r.uploader+" • ":"")+r.count+" video"+(r.isPlaylist?" (playlist)":"");
    var first=items[0];$("pl-thumb").src=first.thumb||"";
    $("pl-thumb").onerror=function(){$("pl-thumb").style.visibility="hidden"};
    renderList();
  }).catch(function(e){btn.disabled=false;btn.innerHTML=ic("search")+" "+T("fetch");toast("Error: "+e,true)});
});

// ---------- list ----------
function renderList(){
  var html="";
  items.forEach(function(v,i){
    html+='<label class="vrow"><input type="checkbox" data-i="'+i+'" checked>'+
      '<span class="idx">'+(i+1)+'</span>'+
      '<img loading="lazy" src="'+esc(v.thumb)+'" onerror="this.style.visibility=\'hidden\'">'+
      '<span style="flex:1;min-width:0"><span class="t">'+esc(v.title)+'</span><span class="d">'+fmtDur(v.duration)+'</span></span>'+
      '</label>';
  });
  $("video-list").innerHTML=html;
  updateCount();
  $("video-list").addEventListener("change",updateCount);
}
function updateCount(){
  var n=$("video-list").querySelectorAll("input:checked").length;
  $("sel-count").textContent=T("selCount",n,items.length);
}
$("sel-all").addEventListener("click",function(){$("video-list").querySelectorAll("input").forEach(function(c){c.checked=true});updateCount()});
$("sel-none").addEventListener("click",function(){$("video-list").querySelectorAll("input").forEach(function(c){c.checked=false});updateCount()});

// ---------- options ----------
function getOpts(){
  return {
    mode:mode,
    res:$("res").value,container:$("container").value,h264:$("h264").checked,
    audioFormat:$("aformat").value,audioQuality:$("aquality").value,
    numbering:$("numbering").checked,embedThumb:$("ethumb").checked,embedMeta:$("emeta").checked,
    subs:$("subs").checked,subLangs:$("sublangs").value.trim()||"id,en",embedSubs:$("esubs").checked,
    sponsor:$("sponsor").checked,cookies:$("cookies").value,
    rate:$("rate").value.trim(),concurrent:parseInt($("conc").value,10)||2,
    outDir:$("outdir").value.trim()
  };
}
// simpan preferensi
["res","container","h264","aformat","aquality","numbering","ethumb","emeta","subs","sublangs","esubs","sponsor","cookies","rate","conc","outdir"].forEach(function(id){
  var el=$(id);
  try{var saved=localStorage.getItem("opt_"+id);if(saved!==null){if(el.type==="checkbox")el.checked=saved==="1";else el.value=saved}}catch(e){}
  el.addEventListener("change",function(){
    try{localStorage.setItem("opt_"+id,el.type==="checkbox"?(el.checked?"1":"0"):el.value)}catch(e){}
  });
});

$("btn-browse").addEventListener("click",function(){
  var b=$("btn-browse");b.disabled=true;b.innerHTML=ic("loader",15,true)+" "+T("browsing");
  post("/api/browse").then(function(r){
    b.disabled=false;b.innerHTML=ic("folder")+" "+T("browse");
    if(r.path){
      var o=$("outdir");
      o.value=r.path;
      o.dispatchEvent(new Event("change")); // simpan ke preferensi
    }
  }).catch(function(){b.disabled=false;b.innerHTML=ic("folder")+" "+T("browse")});
});
$("btn-open").addEventListener("click",function(){
  post("/api/open",{path:$("outdir").value.trim()});
});

// ---------- download ----------
$("btn-download").addEventListener("click",function(){
  var sel=[];
  $("video-list").querySelectorAll("input[type=checkbox]").forEach(function(c){
    if(c.checked){var v=items[parseInt(c.dataset.i,10)];sel.push({url:v.url,title:v.title,index:v.index})}
  });
  if(!sel.length){toast(T("errPick"),true);return}
  var o=getOpts();
  if(!o.outDir){toast(T("errOutdir"),true);return}
  post("/api/download",{items:sel,options:o,lang:lang}).then(function(r){
    if(r.error){toast(r.error,true);return}
    $("downloads").classList.remove("hidden");
    toast(T("added",r.added));
    $("downloads").scrollIntoView({behavior:"smooth"});
  });
});

// ---------- SSE ----------
var es=new EventSource("/api/events");
es.onmessage=function(ev){
  var d;try{d=JSON.parse(ev.data)}catch(e){return}
  if(d.type==="log"){
    var el=$("log");
    el.textContent+=d.lines.join("\n")+"\n";
    var lines=el.textContent.split("\n");
    if(lines.length>600)el.textContent=lines.slice(-500).join("\n");
    el.scrollTop=el.scrollHeight;
  }else if(d.type==="jobs"){
    if(d.setup)updSetup(d.setup);
    renderJobs(d);
  }
};

function stLabel(s){return {queued:T("stQ"),downloading:T("stD"),processing:T("stP"),done:T("stDone"),error:T("stE"),cancelled:T("stC")}[s]||s}
function renderJobs(d){
  if(d.jobs.length)$("downloads").classList.remove("hidden");
  var done=d.jobs.filter(function(j){return j.status==="done"}).length;
  var err=d.jobs.filter(function(j){return j.status==="error"}).length;
  $("overall").innerHTML=d.jobs.length?(T("totTotal")+" "+d.jobs.length+" &nbsp;·&nbsp; <span style='color:var(--green)'>"+ic("checkCircle",13)+" "+done+" "+T("totDone")+"</span> &nbsp;·&nbsp; <span style='color:var(--yellow)'>"+ic("loader",13)+" "+d.running+" "+T("totRun")+"</span> &nbsp;·&nbsp; <span style='color:var(--blue)'>"+ic("clock",13)+" "+d.queued+" "+T("totQueue")+"</span>"+(err?" &nbsp;·&nbsp; <span style='color:var(--red)'>"+ic("alert",13)+" "+err+" "+T("totFail")+"</span>":"")):"";
  var html="";
  d.jobs.slice().reverse().forEach(function(j){
    lastJobs[j.id]=j;
    var cls=j.status==="done"?"done":(j.status==="error"||j.status==="cancelled"?"err":"");
    var active=j.status==="downloading"||j.status==="queued"||j.status==="processing";
    html+='<div class="jrow"><div class="top">'+
      '<span class="jt" title="'+esc(j.title)+'">'+esc(j.title)+'</span>'+
      '<span class="st '+j.status+'">'+stLabel(j.status)+'</span>'+
      (active?'<button class="jcancel" data-id="'+j.id+'">'+ic("x",12)+'</button>':"")+
      '</div>'+
      '<div class="bar"><div class="'+cls+'" style="width:'+j.percent.toFixed(1)+'%"></div></div>'+
      '<div class="jmeta"><span>'+j.percent.toFixed(1)+'%</span>'+
      (j.speed?"<span>"+ic("zap",12)+" "+esc(j.speed)+"</span>":"")+
      (j.eta?"<span>"+ic("clock",12)+" "+esc(j.eta)+"</span>":"")+
      (j.msg&&j.status==="error"?"<span style='color:#ff8a95'>"+esc(j.msg)+"</span>":"")+
      '</div></div>';
  });
  $("jobs").innerHTML=html;
}
$("jobs").addEventListener("click",function(e){
  var t=e.target.closest("[data-id]");
  var id=t&&t.dataset.id;
  if(id)post("/api/cancel",{id:id});
});
$("btn-clear").addEventListener("click",function(){post("/api/clear")});

// ---------- update & quit ----------
$("btn-update").addEventListener("click",function(){
  var b=$("btn-update");b.disabled=true;
  post("/api/update",{lang:lang}).then(function(r){
    b.disabled=false;
    if(r.error)toast(r.error,true);
    else{toast(r.msg||("Versi: "+r.version));if(r.version)$("st-ytdlp").textContent="yt-dlp "+r.version}
  });
});
$("btn-quit").addEventListener("click",function(){
  post("/api/shutdown").then(function(){
    document.body.innerHTML='<div style="display:flex;height:100vh;align-items:center;justify-content:center;flex-direction:column;gap:10px">'+LOGO+'<h2 style="margin:0">'+T("closedT")+'</h2><p style="color:var(--muted);margin:0">'+T("closedP")+'</p></div>';
  });
});
