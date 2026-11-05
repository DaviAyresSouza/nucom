'use strict';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const precise = matchMedia('(hover: hover) and (pointer: fine)');
const hero = $('.hero'), stage = $('.stage'), mark = $('.mark'), rotor = $('.rotor');
const satellites = $$('.particle'), motion = $('#motion'), ground = $('.ground');
const ease = 'cubic-bezier(.16,.8,.2,1)';
let paused = preference.matches, started = false, visible = true, over = false;
let drag = null, tickId = 0, previous = 0, elapsed = 0, angle = 0, pitch = 0;
let inertia = 0, spinSpeed = 0, jump = 1, scrollFraction = 0, size = 0;

function animateElement(node, frames, options) {
  if (!paused && node.animate) return node.animate(frames, options);
}
function drawLogo() {
  const jumpHeight = Math.sin(Math.PI * jump);
  const tilt = paused ? 0 : Math.min(elapsed / 2.5, 1) * 10;
  const rotation = angle + 360 * (1 - (1 - jump) ** 3);
  rotor.style.transform = 'translateY(' + (-jumpHeight * size * .12 - scrollFraction * size * .09) +
    'px) rotateX(' + (pitch + tilt + scrollFraction * 12) + 'deg) rotateY(' + rotation +
    'deg) rotateZ(' + (-tilt * .8) + 'deg)';
  ground.style.transform = 'scaleX(' + ((.58 + .42 * Math.abs(Math.cos(rotation * Math.PI / 180))) * (1 - jumpHeight * .35)) + ')';
  ground.style.opacity = String(1 - jumpHeight * .5);
  satellites.forEach((node, i) => {
    const t = elapsed * [.52,.43,.36][i] + i * 2.1;
    const slope = [-28,29,-66][i] * Math.PI / 180;
    const x = 44 * Math.cos(t), y = 16 * Math.sin(t);
    node.style.left = (50 + x * Math.cos(slope) - y * Math.sin(slope)) + '%';
    node.style.top = (46 + (x * Math.sin(slope) + y * Math.cos(slope)) * 1.08) + '%';
    const depth = Math.sin(t);
    node.style.zIndex = depth > 0 ? 3 : 1;
    node.style.transform = 'translate(-50%,-50%) scale(' + (.91 + depth * .22) + ') rotate(' + (t * 20) + 'deg)';
  });
}
function tick(now) {
  const dt = previous ? Math.min(.05,(now-previous)/1000) : 0;
  previous = now; elapsed += dt;
  if (!drag) {
    const target = elapsed < 1.05 ? 0 : over ? 8 : 28;
    spinSpeed += (target - spinSpeed) * (1 - Math.exp(-5 * dt));
    angle = (angle + (spinSpeed * (1 + .8 * scrollFraction) + inertia) * dt) % 360;
    inertia *= Math.exp(-3.7 * dt); pitch *= Math.exp(-4 * dt);
  }
  jump = Math.min(1,jump + dt / .82);
  drawLogo(); tickId = requestAnimationFrame(tick);
}
function sync() {
  cancelAnimationFrame(tickId); previous = 0;
  motion.textContent = paused ? 'Ativar movimento' : 'Pausar movimento';
  drawLogo();
  if (started && visible && !paused && !document.hidden) tickId = requestAnimationFrame(tick);
}
function setPause(value) {
  paused = value;
  if (paused) {
    angle = pitch = inertia = spinSpeed = scrollFraction = 0; jump = 1;
    document.getAnimations().forEach(anim => anim.finish?.());
    $('.copy').style.transform = ''; $('.copy').style.opacity = '';
    $('.cta').style.transform = '';
    if (!started) begin();
  }
  sync();
}
mark.addEventListener('pointerenter',() => over = true);
mark.addEventListener('pointerleave',() => over = false);
mark.addEventListener('pointerdown',event => {
  if (!event.isPrimary || event.button !== 0) return;
  drag = {id:event.pointerId,x:event.clientX,y:event.clientY,dist:0,t:event.timeStamp};
  inertia = 0; mark.setPointerCapture(event.pointerId);
});
mark.addEventListener('pointermove',event => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  drag.dist += Math.hypot(dx,dy); angle += .58*dx; pitch = Math.max(-34,Math.min(34,pitch-dy*.3));
  inertia = Math.max(-370,Math.min(370,dx*580/Math.max(14,event.timeStamp-drag.t)));
  Object.assign(drag,{x:event.clientX,y:event.clientY,t:event.timeStamp}); drawLogo();
});
mark.addEventListener('pointerup',event => {
  if (drag?.id !== event.pointerId) return;
  if (drag.dist < 6 && !paused) {jump = 0; inertia = 0;}
  if (event.pointerType !== 'mouse') over = false;
  drag = null;
});
mark.addEventListener('lostpointercapture',() => drag = null);
mark.addEventListener('click',event => {if (!event.detail && !paused) jump = 0;});
motion.hidden = false;
motion.addEventListener('click',() => setPause(!paused));
preference.addEventListener('change',event => setPause(event.matches));
new ResizeObserver(() => {size = stage.clientWidth; drawLogo();}).observe(stage);
new IntersectionObserver(([entry]) => {visible=entry.isIntersecting; sync();}).observe(hero);
document.addEventListener('visibilitychange',sync);

const loader = $('.loader');
let introFrame = 0;
function begin() {
  if (started) return;
  started = true; cancelAnimationFrame(introFrame); loader.hidden = true;
  const intro = {duration:760,easing:ease,fill:'backwards'};
  $$('.char').forEach((el,i) => animateElement(el,[
    {opacity:0,filter:'blur(9px)',transform:'perspective(450px) translateY(.65em) rotateX(-55deg)'},
    {opacity:1,filter:'blur(0)',transform:'none'}],{...intro,delay:60+i*23}));
  [$('.navbar'),$('.visual'),$('.lead'),$('.cta')].forEach((el,i) =>
    animateElement(el,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],
      {...intro,delay:i*85}));
  sync();
}
function runIntro() {
  if (paused || scrollY > 50 || location.hash) {begin();return;}
  loader.hidden = false;
  const start = performance.now();
  function fill(now) {
    const p = Math.min(1,(now-start)/1100);
    loader.style.setProperty('--unfilled',(100-p*100)+'%');
    $('.loader-progress').textContent = Math.round(p*100)+'%';
    if (p < 1) introFrame=requestAnimationFrame(fill);
    else {
      const exit = animateElement(loader,[{clipPath:'inset(0 0 0%)'},{clipPath:'inset(0 0 100%)'}],{duration:350,easing:ease});
      if (exit) exit.finished.then(begin,begin); else begin();
    }
  }
  introFrame = requestAnimationFrame(fill);
  setTimeout(begin,1900);
}
$$('.title-line').forEach(line => {
  const text = line.textContent;
  line.replaceChildren(...Array.from(text, ch => {
    const span=document.createElement('span');span.className='char';span.textContent=ch;return span;
  }));
});
runIntro();
let pendingScroll = false;
function updateScroll() {
  pendingScroll = false;
  if (!paused && visible) {
    const rect = hero.getBoundingClientRect();
    scrollFraction = Math.min(1,Math.max(0,-rect.top / rect.height));
    $('.copy').style.transform = 'translateY(' + (-scrollFraction * 52) + 'px)';
    $('.copy').style.opacity = String(Math.max(.18,1-Math.max(0,scrollFraction-.20)*1.5));
  }
}
addEventListener('scroll',() => {
  if (!pendingScroll) {pendingScroll=true;requestAnimationFrame(updateScroll);}
},{passive:true});
const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    const el = entry.target;
    animateElement(el,[{opacity:.12,transform:'translateY(42px) scale(.98)'},{opacity:1,transform:'none'}],
      {duration:760,easing:ease,delay:parseInt(el.dataset.delay || '0',10),fill:'backwards'});
    reveal.unobserve(el);
  }
},{threshold:.12});
$$('[data-reveal]').forEach(el=>reveal.observe(el));

const cta = $('.cta');
if (precise.matches) {
  cta.addEventListener('pointermove',event => {
    if (paused) return;
    const r = cta.getBoundingClientRect();
    cta.style.transform='translate('+((event.clientX-r.left-r.width/2)*.1)+'px,'+((event.clientY-r.top-r.height/2)*.16)+'px)';
  });
  cta.addEventListener('pointerleave',()=>cta.style.transform='');
  $$('.card').forEach(el=>el.addEventListener('pointermove',event=>{
    const r=el.getBoundingClientRect();
    el.style.setProperty('--spot-x',(event.clientX-r.left)+'px');el.style.setProperty('--spot-y',(event.clientY-r.top)+'px');
  }));
}
const buttons = $$('.selector button'), picture = $('.viewer img');
let request = 0;
function selectShow(button) {
  const id = ++request;
  const next = new Image(); next.src = button.dataset.src; next.alt = button.textContent.trim();
  next.onload = () => {
    if(id!==request) return;
    picture.src=next.src;picture.alt=next.alt;
    buttons.forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    animateElement(picture,[{opacity:.2,transform:'translateY(14px) scale(.95)'},{opacity:1,transform:'none'}],{duration:420,easing:ease});
  };
}
buttons.forEach((button,i)=>{
  button.addEventListener('click',()=>selectShow(button));
  button.addEventListener('keydown',event=>{
    if (!['ArrowDown','ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const other=buttons[(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length];
    other.focus();selectShow(other);
  });
});
const sections = new IntersectionObserver(entries=>{
  for(const e of entries) if(e.isIntersecting){
    $$('nav a').forEach(a=>{if(a.hash==='#'+e.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  }
},{rootMargin:'-12% 0px -45%'});
$$('main > section').forEach(el=>sections.observe(el));