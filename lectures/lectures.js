(function(){
var d=document,root=d.documentElement;

function init(){
var panels={};[].forEach.call(d.querySelectorAll('[data-panel]'),function(p){panels[p.dataset.panel]=p});
if(!panels.notes)return;
var tabs=d.querySelectorAll('.tabs a'),rows=[].slice.call(d.querySelectorAll('.transcript p'));
function show(name){for(var k in panels)panels[k].classList.toggle('on',k===name);
[].forEach.call(tabs,function(a){if(a.hash==='#'+name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
function route(){var h=decodeURIComponent(location.hash.slice(1)),m=/^t=(\d+)$/.exec(h),el=null;
if(m&&panels.transcript){show('transcript');var want=+m[1],best=rows[0];
for(var i=0;i<rows.length;i++){if(+rows[i].dataset.s<=want)best=rows[i];else break}
rows.forEach(function(r){r.classList.toggle('hit',r===best)});if(best)best.scrollIntoView({block:'center'});return}
if(panels[h]){show(h);if(panels[h].getBoundingClientRect().top<0)panels[h].scrollIntoView();return}
if(h)el=d.getElementById(h);
if(el){var p=el.closest('[data-panel]');show(p?p.dataset.panel:'notes');el.scrollIntoView();return}
show('notes')}
addEventListener('hashchange',route);route();
var run=d.querySelector('.rundown');if(run&&matchMedia('(min-width:62rem)').matches)run.open=true;

var quiz=d.querySelector('.quiz');if(!quiz)return;
var key='quiz:'+location.pathname,saved={},qs=[].slice.call(quiz.querySelectorAll('.q[data-answer]')),score=d.querySelector('.score span');
try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){}
function keep(){try{localStorage.setItem(key,JSON.stringify(saved))}catch(e){}}
function tally(){var done=0,good=0;qs.forEach(function(q,i){if(saved[i]!=null){done++;if(saved[i]==q.dataset.answer)good++}});
score.textContent=done?'Dobrze '+good+' z '+done+' odpowiedzi, pytań zamkniętych jest '+qs.length+'.':'Pytań zamkniętych: '+qs.length+'. Odpowiedzi zostają w tej przeglądarce.'}
function settle(q,i){var opts=q.querySelectorAll('.opt'),ans=+q.dataset.answer,pick=+saved[i];
[].forEach.call(opts,function(o,n){o.disabled=true;o.classList.toggle('right',n===ans);o.classList.toggle('wrong',n===pick&&n!==ans)});
q.querySelector('.verdict').textContent=pick===ans?'Dobrze.':'Źle. Poprawna odpowiedź: '+'ABCDEF'.charAt(ans)+'.';q.querySelector('.exp').hidden=false}
qs.forEach(function(q,i){if(saved[i]!=null)settle(q,i);
q.addEventListener('click',function(e){var o=e.target.closest('.opt');if(!o||saved[i]!=null)return;saved[i]=+o.dataset.i;keep();settle(q,i);tally()})});
d.querySelector('.score button').addEventListener('click',function(){saved={};keep();
qs.forEach(function(q){[].forEach.call(q.querySelectorAll('.opt'),function(o){o.disabled=false;o.classList.remove('right','wrong')});q.querySelector('.exp').hidden=true});
[].forEach.call(quiz.querySelectorAll('details'),function(x){x.open=false});tally();quiz.scrollIntoView()});
tally()}

var lock=d.getElementById('lock');
if(!lock){init();return}

// Sealed site: the page and the files next to it are AES-GCM ciphertext (IV, data, tag), the key
// comes from the password through PBKDF2. The derived key is kept in this browser, the password is not.
var KEY='lectures:key',sealed=d.getElementById('sealed').textContent.trim(),err=lock.querySelector('.err'),key=null;
function bytes(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function text(u){var s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function unseal(u){return crypto.subtle.decrypt({name:'AES-GCM',iv:u.subarray(0,12)},key,u.subarray(12))}
function fetched(name){return fetch(name).then(function(r){if(!r.ok)throw new Error(r.status);return r.arrayBuffer()}).then(function(b){return unseal(new Uint8Array(b))})}
function derive(pw){return crypto.subtle.importKey('raw',new TextEncoder().encode(pw.normalize('NFC').trim()),'PBKDF2',false,['deriveBits']).then(function(k){
return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(lock.dataset.salt),iterations:+lock.dataset.iter},k,512)}).then(function(b){return new Uint8Array(b).slice(0,32)})}
function media(){
function load(img){fetched(img.dataset.enc).then(function(p){var u=URL.createObjectURL(new Blob([p],{type:'image/jpeg'}));img.src=u;var a=img.closest('a.slide');if(a){a.href=u;a.target='_blank'}}).catch(function(){})}
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);load(e.target)}})},{rootMargin:'800px'}):null;
[].forEach.call(d.querySelectorAll('img[data-enc]'),function(i){if(io)io.observe(i);else load(i)});
d.addEventListener('click',function(e){var a=e.target.closest('a[data-get]');if(!a)return;e.preventDefault();
fetched(a.dataset.get).then(function(p){var l=d.createElement('a');l.href=URL.createObjectURL(new Blob([p],{type:'text/plain;charset=utf-8'}));l.download=a.dataset.name;d.body.appendChild(l);l.click();l.remove()})})}
function reveal(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']).then(function(k){key=k;return unseal(bytes(sealed))}).then(function(plain){
var doc=JSON.parse(new TextDecoder().decode(plain));try{localStorage.setItem(KEY,text(raw))}catch(e){}
d.title=doc.title;d.getElementById('page').innerHTML=doc.html;root.classList.remove('haskey');media();init()})}
lock.addEventListener('submit',function(e){e.preventDefault();if(lock.classList.contains('busy'))return;err.hidden=true;lock.classList.add('busy');
Promise.resolve().then(function(){if(!window.crypto||!crypto.subtle)throw new Error('insecure');return derive(lock.pw.value)}).then(reveal).catch(function(x){
lock.classList.remove('busy');err.hidden=false;err.textContent=x&&x.message==='insecure'?'Ta strona działa tylko przez https.':'To hasło nie pasuje.';lock.pw.select()})});
var had=null;try{had=localStorage.getItem(KEY)}catch(e){}
if(had)Promise.resolve().then(function(){return reveal(bytes(had))}).catch(function(){try{localStorage.removeItem(KEY)}catch(e){}root.classList.remove('haskey')});
else root.classList.remove('haskey');
})();
