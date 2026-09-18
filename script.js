const grid = document.getElementById("property-grid");
const modal = document.getElementById("property-modal");
let properties = [];
let dataSource = "supabase";

function getSupabaseClient() {
  const cfg = window.AELO_SUPABASE_CONFIG || {};
  if (!window.supabase || !cfg.url || !cfg.anonKey || cfg.url.startsWith("COLE_AQUI")) return null;
  return window.supabase.createClient(cfg.url, cfg.anonKey);
}

function normalizeProperty(p) {
  const meta = [];
  if (Number(p.bedrooms) > 0) meta.push(`${p.bedrooms} quartos`);
  if (Number(p.suites) > 0) meta.push(`${p.suites} suítes`);
  if (Number(p.parking) > 0) meta.push(`${p.parking} vagas`);
  if (p.area_m2) meta.push(`${Number(p.area_m2).toLocaleString("pt-BR")} m²`);
  if (p.type === "temporada" && Number(p.max_guests) > 0) meta.push(`até ${p.max_guests} hóspedes`);
  if (p.type === "temporada" && Number(p.min_nights) > 0) meta.push(`${p.min_nights} noite${Number(p.min_nights)===1?"":"s"} mín.`);
  const gallery_urls = Array.isArray(p.gallery_urls) && p.gallery_urls.length ? p.gallery_urls : (p.image_url ? [p.image_url] : []);
  const seasonPrice = Number(p.nightly_price) > 0 ? Number(p.nightly_price) : Number(p.price || 0);
  const normalized = { ...p, gallery_urls, image_url: gallery_urls[0] || p.image_url || "logo.png", badge: p.badge || String(p.type || "").toUpperCase(), price_label: p.price_label || formatPrice(p.type === "temporada" ? seasonPrice : p.price, p.type), meta };
  normalized.nightly_price = seasonPrice;
  return normalized;
}

function formatPrice(value, type) {
  const n = Number(value || 0);
  const base = n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (type === "aluguel") return `${base}/mês`;
  if (type === "temporada") return `${base}/noite`;
  return base;
}


// V43 — Analytics anônimo de visitas e pesquisas
const AELO_ANALYTICS_KEY = 'aelo_visitor_id';
function getAeloVisitorId(){
  try{
    let id=localStorage.getItem(AELO_ANALYTICS_KEY);
    if(!id){ id=(crypto.randomUUID ? crypto.randomUUID() : 'v_'+Date.now()+'_'+Math.random().toString(36).slice(2)); localStorage.setItem(AELO_ANALYTICS_KEY,id); }
    return id;
  }catch(e){ return 'session_'+Date.now()+'_'+Math.random().toString(36).slice(2); }
}
async function trackAeloEvent(eventType, details={}, attempt=0){
  try{
    const c=getSupabaseClient();
    if(!c){
      if(attempt<3) setTimeout(()=>trackAeloEvent(eventType,details,attempt+1),800);
      return;
    }
    const {error}=await c.from('site_events').insert({visitor_id:getAeloVisitorId(), event_type:eventType, details});
    if(error && attempt<2) setTimeout(()=>trackAeloEvent(eventType,details,attempt+1),1000);
    if(error) console.debug('Analytics AELO:',error);
  }catch(e){
    if(attempt<2) setTimeout(()=>trackAeloEvent(eventType,details,attempt+1),1000);
    else console.debug('Analytics AELO:',e);
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>trackAeloEvent('page_view',{page:location.pathname}),{once:true});
}else{
  trackAeloEvent('page_view',{page:location.pathname});
}

async function loadProperties() {
  const client = getSupabaseClient();
  if (!client) return;
  const { data, error } = await client.from("properties").select("*").eq("is_published", true).order("created_at", { ascending: false });
  if (!error && data) {
    properties = data.map(normalizeProperty);
    const note = document.getElementById("catalog-note");
    if (note) note.innerHTML = "Catálogo atualizado pela equipe Aelo através do painel administrativo.";
  } else {
    properties = [];
    const note = document.getElementById("catalog-note");
    if (note) note.innerHTML = "Não foi possível carregar o catálogo agora. Nenhum imóvel demonstrativo é exibido.";
    console.warn("Não foi possível carregar o catálogo de imóveis.", error);
  }
  renderProperties(document.querySelector(".filter.active")?.dataset.filter || "todos");
}

function openSeasonSearch(prefill={}) {
  const panel=document.getElementById("season-search");
  if(!panel) return;
  panel.hidden=false;
  const set=(id,value)=>{const el=document.getElementById(id);if(el && value!==undefined) el.value=value;};
  set("season-location",prefill.location||"");
  set("season-checkin",prefill.checkin||"");
  set("season-checkout",prefill.checkout||"");
  set("season-guests",String(prefill.guests||0));
  set("season-property-type",prefill.propertyType||"");
  set("season-budget",String(prefill.budget||0));
  const note=document.getElementById("season-search-note");
  if(note && !prefill.keepNote) note.textContent="";
  requestAnimationFrame(()=>panel.scrollIntoView({behavior:"smooth",block:"center"}));
}
function closeSeasonSearch(){const panel=document.getElementById("season-search");if(panel) panel.hidden=true;}
function normSeason(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function seasonRegionMatch(location, query){
  const q=normSeason(query), loc=normSeason(location);
  if(!q) return true;
  const aliases={
    "lauro de freitas":["lauro de freitas","buraquinho","vilas do atlantico","ipitanga","pitangueiras","jardim aeroporto","portao"],
    "vilas do atlantico":["vilas do atlantico","lauro de freitas"],
    "camacari":["camacari","guarajuba","barra do jacui","abrantes","jaua"],
    "salvador":["salvador"]
  };
  const options=aliases[q]||[q];
  return options.some(a=>loc.includes(a));
}
function seasonTypeMatch(p,type){
  if(!type) return true;
  const hay=normSeason([p.property_category,p.title,p.description].join(" "));
  return hay.includes(normSeason(type));
}
function renderSeasonSearchResults(list,ctx={}){
  const results=document.getElementById("season-results"), note=document.getElementById("season-search-note");
  if(!results) return;
  results.innerHTML="";
  if(note){
    const period=ctx.checkin&&ctx.checkout?` Período: ${new Date(ctx.checkin+'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(ctx.checkout+'T12:00:00').toLocaleDateString('pt-BR')}.`:"";
    note.textContent=list.length?`${list.length} ${list.length===1?'hospedagem encontrada':'hospedagens encontradas'}.${period}`:`Nenhuma hospedagem encontrada com esses filtros.${period}`;
  }
  if(!list.length){
    results.innerHTML=`<div class="season-no-results"><strong>Não encontramos uma opção com todos esses critérios.</strong><span>Você pode ampliar a busca ou falar com a AELO para uma procura personalizada.</span><div><button type="button" class="btn btn-gold" id="season-contact-search">Falar com a AELO</button></div></div>`;
    const c=document.getElementById("season-contact-search");
    if(c)c.addEventListener("click",()=>{const msg=`Olá! Procuro aluguel por temporada.${ctx.location?` Região: ${ctx.location}.`:''}${ctx.checkin?` Check-in: ${ctx.checkin}.`:''}${ctx.checkout?` Check-out: ${ctx.checkout}.`:''}${ctx.guests?` Hóspedes: ${ctx.guests}.`:''}${ctx.propertyType?` Tipo: ${ctx.propertyType}.`:''}${ctx.budget?` Diária máxima: R$ ${Number(ctx.budget).toLocaleString('pt-BR')}.`:''}`;window.open('https://wa.me/5571992961212?text='+encodeURIComponent(msg),'_blank');});
    return;
  }
  list.slice(0,8).forEach(p=>{
    const card=document.createElement("article"); card.className="season-result-card";
    const guests=Number(p.max_guests||0)>0?`até ${Number(p.max_guests)} hóspedes`:"consulte hóspedes";
    card.innerHTML=`<div class="season-result-image"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"></div><div class="season-result-body"><p class="eyebrow">TEMPORADA</p><h4>${esc(p.title)}</h4><p class="season-result-location">${esc(p.location)}</p><div class="season-result-meta"><span>👨‍👩‍👧 ${guests}</span>${Number(p.min_nights||0)>0?`<span>🌙 mínimo ${Number(p.min_nights)} noites</span>`:''}</div><strong class="season-result-price">${esc(p.price_label||formatPrice(p.nightly_price||p.price,'temporada'))}</strong><button type="button" class="season-result-view" data-id="${esc(p.id)}">Ver imóvel</button></div>`;
    results.appendChild(card);
    card.querySelector(".season-result-view").addEventListener("click",()=>openModal(p.id));
  });
}
function runSeasonSearch(){
  const location=document.getElementById("season-location")?.value.trim()||"";
  const checkin=document.getElementById("season-checkin")?.value||"";
  const checkout=document.getElementById("season-checkout")?.value||"";
  const guests=Number(document.getElementById("season-guests")?.value||0);
  const propertyType=document.getElementById("season-property-type")?.value||"";
  const budget=Number(document.getElementById("season-budget")?.value||0);
  let list=properties.filter(p=>p.type==='temporada'&&seasonRegionMatch(p.location,location)&&seasonTypeMatch(p,propertyType)&&(!guests||Number(p.max_guests||0)>=guests)&&(!budget||Number(p.nightly_price||p.price||0)<=budget));
  if(checkin&&checkout&&checkout<checkin){
    const note=document.getElementById("season-search-note"); if(note) note.textContent="Confira as datas: o check-out precisa ser posterior ao check-in.";
    renderSeasonSearchResults([],{}); return;
  }
  trackAeloEvent('search',{interest:'Temporada',type:'temporada',region:location||'qualquer',checkin,checkout,guests,propertyType,budget,results:list.length});
  renderSeasonSearchResults(list,{location,checkin,checkout,guests,propertyType,budget});
}
function initSeasonSearch(){
  const form=document.getElementById("season-search-form");
  if(form)form.addEventListener("submit",e=>{e.preventDefault();runSeasonSearch();});
  const close=document.getElementById("season-search-close"); if(close)close.addEventListener("click",closeSeasonSearch);
  const clear=document.getElementById("season-search-clear"); if(clear)clear.addEventListener("click",()=>{form?.reset();const r=document.getElementById('season-results');const n=document.getElementById('season-search-note');if(r)r.innerHTML='';if(n)n.textContent='';});
}

function renderProperties(filter = "todos") {
  const list = filter === "todos" ? properties : properties.filter(p => p.type === filter);
  grid.innerHTML = list.map(p => `
    <article class="property-card" data-id="${p.id}">
      <div class="property-image">
        <img src="${p.image_url}" alt="${p.title}" loading="lazy">
        <span class="badge">${p.type === "temporada" ? "TEMPORADA" : p.badge}</span>${p.commercial_status==='vendido'?`<span class="sold-badge">✓ IMÓVEL VENDIDO</span>`:''}
      </div>
      <div class="property-info">
        <h3>${p.title}</h3>
        <p class="location">${p.location}</p>
        <div class="price">${p.price_label}</div>
        <div class="meta">${p.meta.map(item => `<span>${item}</span>`).join("")}</div>
      </div>
    </article>`).join("");

  if (!list.length) {
    if (filter === "temporada") {
      grid.innerHTML = `<div class="season-empty"><div class="season-empty-icon">📅</div><div><p class="eyebrow">TEMPORADA AELO</p><h3>Hospedagens selecionadas para sua próxima estadia.</h3><p>Estamos ampliando nosso portfólio de casas e apartamentos para temporada. Em breve, você poderá consultar as opções disponíveis e falar com a AELO para planejar sua estadia.</p><button type="button" class="btn btn-gold season-empty-btn" id="season-empty-contact">Encontrar hospedagem</button></div></div>`;
      const c=document.getElementById("season-empty-contact");
      if(c) c.addEventListener("click",()=>openSeasonSearch());
    } else {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:30px 0;color:#697384">Nenhum imóvel encontrado nesta categoria.</div>`;
    }
  }
  const rentalIntro=document.getElementById("rental-intro");
  if(rentalIntro) rentalIntro.hidden = !["aluguel","temporada"].includes(filter);
  const seasonPanel=document.getElementById("season-search");
  if(seasonPanel && filter !== "temporada") seasonPanel.hidden=true;
  document.querySelectorAll(".mini-choice").forEach(btn=>btn.onclick=()=>{ const target=btn.dataset.filterChoice; const filterBtn=document.querySelector(`.filter[data-filter="${target}"]`); if(filterBtn) filterBtn.click(); });
  document.querySelectorAll(".property-card").forEach(card => card.addEventListener("click", () => openModal(card.dataset.id)));
}

let currentGallery = [];
let currentGalleryIndex = 0;

function renderGalleryThumbs(){
  const wrap=document.getElementById("gallery-thumbs");
  if(!wrap) return;
  wrap.innerHTML="";
  if(currentGallery.length<=1) return;
  currentGallery.forEach((src,i)=>{
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="gallery-thumb"+(i===currentGalleryIndex?" active":"");
    btn.setAttribute("aria-label",`Ver foto ${i+1}`);
    const im=document.createElement("img");
    im.src=src; im.alt=`Miniatura da foto ${i+1}`; im.loading="lazy";
    btn.appendChild(im);
    btn.addEventListener("click",()=>{ currentGalleryIndex=i; showGalleryImage(); });
    wrap.appendChild(btn);
  });
}

function showGalleryImage() {
  const img = document.getElementById("modal-image");
  const counter = document.getElementById("gallery-counter");
  if (!currentGallery.length) return;
  img.src = currentGallery[currentGalleryIndex];
  img.alt = document.getElementById("modal-title").textContent;
  counter.textContent = currentGallery.length > 1 ? `${currentGalleryIndex + 1} / ${currentGallery.length}` : "";
  document.querySelector(".gallery-prev").classList.toggle("hidden", currentGallery.length <= 1);
  document.querySelector(".gallery-next").classList.toggle("hidden", currentGallery.length <= 1);
  document.querySelectorAll(".gallery-thumb").forEach((b,i)=>b.classList.toggle("active",i===currentGalleryIndex));
  const active=document.querySelector(".gallery-thumb.active");
  if(active) active.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
  const wm=document.getElementById("modal-watermark");
  if(wm) wm.style.display=currentGallery.length?"block":"none";
}

async function loadSeasonAvailability(propertyId){
  const c=getSupabaseClient();
  if(!c) return {blocks:[],rates:[]};
  const [b,r]=await Promise.all([
    c.from('season_blocks').select('start_date,end_date,status').eq('property_id',propertyId),
    c.from('season_rate_periods').select('start_date,end_date,nightly_rate').eq('property_id',propertyId)
  ]);
  return {blocks:b.data||[],rates:r.data||[]};
}
function dateOnly(s){return new Date(String(s)+'T12:00:00');}
function fmtBRL(n){return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function nightsBetween(a,b){return Math.max(0,Math.round((dateOnly(b)-dateOnly(a))/86400000));}
function dayBlocked(date,blocks){
  const d=dateOnly(date);
  return blocks.some(x=>d>=dateOnly(x.start_date)&&d<dateOnly(x.end_date));
}
function rateForNight(p,date,rates){
  const d=dateOnly(date);
  const special=rates.find(x=>d>=dateOnly(x.start_date)&&d<=dateOnly(x.end_date));
  if(special && Number(special.nightly_rate)>0) return {value:Number(special.nightly_rate),label:'período especial'};
  const dow=d.getDay();
  if((dow===5||dow===6) && Number(p.weekend_price)>0) return {value:Number(p.weekend_price),label:'fim de semana'};
  return {value:Number(p.nightly_price||p.price||0),label:'diária normal'};
}
function renderSeasonCalendar(p,availability,checkin,checkout){
  const box=document.getElementById('modal-season-calendar'); if(!box)return;
  const base=checkin?dateOnly(checkin):new Date();
  const y=base.getFullYear(), m=base.getMonth();
  const first=new Date(y,m,1), start=(first.getDay()+6)%7, days=new Date(y,m+1,0).getDate();
  const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  let html=names.map(x=>`<div class="season-cal-head">${x}</div>`).join('');
  for(let i=0;i<start;i++)html+='<div class="season-cal-day muted"></div>';
  for(let d=1;d<=days;d++){
    const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const blocked=dayBlocked(iso,availability.blocks);
    const selected=(checkin&&iso===checkin)||(checkout&&iso===checkout);
    html+=`<div class="season-cal-day ${blocked?'blocked ':''}${selected?'selected':''}" title="${blocked?'Indisponível':'Disponível'}">${d}</div>`;
  }
  box.innerHTML=html;
}
async function updateSeasonQuote(p){
  const ci=document.getElementById('modal-season-checkin')?.value||'';
  const co=document.getElementById('modal-season-checkout')?.value||'';
  const guests=Number(document.getElementById('modal-season-guests')?.value||2);
  const result=document.getElementById('modal-season-total'), note=document.getElementById('modal-season-availability-note');
  if(!result||!note)return;
  const availability=await loadSeasonAvailability(p.id);
  renderSeasonCalendar(p,availability,ci,co);
  if(!ci||!co){result.dataset.estimatedTotal='';result.innerHTML='<strong>Escolha check-in e check-out</strong><div>O sistema calcula a estadia depois que as datas forem selecionadas.</div>';note.textContent='A disponibilidade final é confirmada pela AELO.';return;}
  const nights=nightsBetween(ci,co);
  if(co<=ci){result.dataset.estimatedTotal='';result.innerHTML='<strong>Período inválido</strong>';note.textContent='O check-out precisa ser posterior ao check-in.';return;}
  if(Number(p.min_nights||0)>nights){result.dataset.estimatedTotal='';result.innerHTML=`<strong>Mínimo de ${Number(p.min_nights)} noites</strong>`;note.textContent='Escolha um período maior para continuar.';return;}
  if(Number(p.max_guests||0)>0 && guests>Number(p.max_guests)){result.dataset.estimatedTotal='';result.innerHTML='<strong>Quantidade de hóspedes acima do limite</strong>';note.textContent=`Esta hospedagem aceita até ${Number(p.max_guests)} hóspedes.`;return;}
  let total=0, rows={}, blocked=false;
  for(let i=0;i<nights;i++){const d=new Date(dateOnly(ci));d.setDate(d.getDate()+i);const iso=d.toISOString().slice(0,10);if(dayBlocked(iso,availability.blocks)){blocked=true;break;}const r=rateForNight(p,iso,availability.rates);total+=r.value;rows[r.label]=(rows[r.label]||0)+1;}
  if(blocked){result.dataset.estimatedTotal='';result.innerHTML='<strong>Essas datas não estão disponíveis</strong>';note.textContent='Escolha outro período no calendário ou fale com a AELO.';return;}
  const cleaning=Number(p.cleaning_fee||0), grand=total+cleaning;
  result.dataset.estimatedTotal=String(grand);
  result.innerHTML=`<strong>${fmtBRL(grand)} estimados</strong><div>${nights} noite${nights===1?'':'s'}${cleaning?` + ${fmtBRL(cleaning)} de limpeza`:''}</div><div class="season-rate-breakdown">${Object.entries(rows).map(([k,v])=>`<span><span>${v} × ${k}</span><b>${k==='fim de semana'&&Number(p.weekend_price)>0?fmtBRL(p.weekend_price):k==='diária normal'?fmtBRL(p.nightly_price||p.price):'tarifa especial'}</b></span>`).join('')}</div>`;
  note.textContent='Valor estimado. A confirmação da reserva e da tarifa é feita pela AELO.';
}
function initSeasonBooking(p){
  const box=document.getElementById('modal-season-booking'); if(!box)return;
  box.classList.toggle('hidden',p.type!=='temporada');
  if(p.type!=='temporada')return;
  const ci=document.getElementById('modal-season-checkin'), co=document.getElementById('modal-season-checkout'), g=document.getElementById('modal-season-guests');
  if(g && !g.value) g.value='2';
  const today=new Date().toISOString().slice(0,10); ci.min=today; co.min=today;
  const refresh=()=>updateSeasonQuote(p);
  [ci,co,g].forEach(el=>el&&el.addEventListener('change',refresh));
  refresh();
}

function openModal(id) {
  const p = properties.find(item => String(item.id) === String(id));
  if (!p) return;
  window.AELO_CURRENT_PROPERTY = p;
  currentGallery = p.gallery_urls?.length ? p.gallery_urls : [p.image_url];
  currentGalleryIndex = 0;
  document.getElementById("modal-type").textContent = p.badge + (p.commercial_status==='vendido' ? (p.sold_by==='terceiro' ? " • VENDIDO POR TERCEIRO" : " • VENDIDO PELA AELO") : "");
  document.getElementById("modal-title").textContent = p.title;
  document.getElementById("modal-location").textContent = p.location;
  document.getElementById("modal-meta").innerHTML = p.meta.join(" • ");
  const seasonSummary=document.getElementById("modal-season-summary");
  if(seasonSummary){
    if(p.type === "temporada"){
      const rows=[];
      const normalNightly = Number(p.nightly_price) > 0 ? Number(p.nightly_price) : Number(p.price || 0);
      if(normalNightly > 0) rows.push(`<span><b>Diária normal</b>${formatPrice(normalNightly,"temporada")}</span>`);
      if(Number(p.weekend_price)>0) rows.push(`<span><b>Fim de semana</b>${formatPrice(p.weekend_price,"temporada")}</span>`);
      if(Number(p.high_season_price)>0) rows.push(`<span><b>Alta temporada</b>${formatPrice(p.high_season_price,"temporada")}</span>`);
      if(Number(p.cleaning_fee)>0) rows.push(`<span><b>Taxa de limpeza</b>${Number(p.cleaning_fee).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>`);
      if(p.checkin_time) rows.push(`<span><b>Check-in</b>${p.checkin_time}</span>`);
      if(p.checkout_time) rows.push(`<span><b>Check-out</b>${p.checkout_time}</span>`);
      seasonSummary.innerHTML=rows.join("");
      seasonSummary.classList.toggle("hidden",!rows.length);
    }else{seasonSummary.classList.add("hidden");seasonSummary.innerHTML="";}
  }
  const desc = String(p.description || p.descricao || p.details || "").trim();
  const descEl = document.getElementById("modal-description");
  if (descEl) {
    descEl.textContent = desc || "Entre em contato com a AELO para mais informações sobre este imóvel.";
    descEl.classList.toggle("is-empty", !desc);
  }
  renderGalleryThumbs();
  showGalleryImage();
  initSeasonBooking(p);
  modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  const launcher = document.getElementById("aelo-chat-launcher");
  if (launcher) { launcher.style.display = "flex"; launcher.style.visibility = "visible"; launcher.style.opacity = "1"; }
}

document.querySelectorAll("[data-quick-filter]").forEach(link => link.addEventListener("click", () => {
  const target=link.dataset.quickFilter;
  const filter=document.querySelector(`.filter[data-filter="${target}"]`);
  if(filter){document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));filter.classList.add("active");renderProperties(target);}
}));
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
  button.classList.add("active"); renderProperties(button.dataset.filter);
}));
document.querySelector(".modal-close").addEventListener("click", closeModal);
document.querySelector(".gallery-prev").addEventListener("click", () => { if (!currentGallery.length) return; currentGalleryIndex = (currentGalleryIndex - 1 + currentGallery.length) % currentGallery.length; showGalleryImage(); });
document.querySelector(".gallery-next").addEventListener("click", () => { if (!currentGallery.length) return; currentGalleryIndex = (currentGalleryIndex + 1) % currentGallery.length; showGalleryImage(); });

const modalInterest = document.querySelector(".modal-interest");
if (modalInterest) modalInterest.addEventListener("click", (e) => {
  e.preventDefault();
  const p = window.AELO_CURRENT_PROPERTY;
  if (!p) return;
  // Para temporada, mantemos a ficha do imóvel aberta durante todo o atendimento.
  // Assim o cliente nunca perde o contexto, fotos, valores e datas enquanto conversa com a AELO.
  if (p.type !== "temporada") closeModal();
  if (typeof window.aeloStartPropertyInterest === "function") {
    window.aeloStartPropertyInterest(p);
    return;
  }
  const phone = "5571992961212";
  const price = p.price_label || (p.type === "temporada" && Number(p.nightly_price) > 0 ? formatPrice(p.nightly_price, "temporada") : "");
  const msg = `Olá! Tenho interesse no imóvel ${p.title || "anunciado no site AELO"}${p.location ? `, em ${p.location}` : ""}${price ? ` — ${price}` : ""}. Gostaria de receber mais informações.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
});
const modalAssistant = document.getElementById("modal-assistant");
if (modalAssistant) modalAssistant.addEventListener("click", () => {
  const launcher = document.getElementById("aelo-chat-launcher");
  if (launcher) launcher.click();
});
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
if (menuToggle && mobileMenu) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
    mobileMenu.classList.remove("open");
  };
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    mobileMenu.setAttribute("aria-hidden", String(expanded));
    mobileMenu.classList.toggle("open", !expanded);
  });
  mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("click", e => {
    if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
  });
}

initSeasonSearch();
loadProperties();


/* V49.3 — Busca de temporada + Assistente AELO Inteligente, guiado por botões e catálogo real */
/* V32.1 — Assistente AELO: qualificação na ordem região > tipo > quartos > valor > prazo */
(function initAeloAssistant(){
const launcher=document.getElementById('aelo-chat-launcher'),panel=document.getElementById('aelo-chat'),close=document.getElementById('aelo-chat-close'),messages=document.getElementById('aelo-chat-messages'),quick=document.getElementById('aelo-chat-quick'); if(!launcher||!panel)return; let started=false;
const add=(text,who='bot',html=false)=>{const e=document.createElement('div');e.className='aelo-chat-msg '+who;html?e.innerHTML=text:e.textContent=text;messages.appendChild(e);messages.scrollTop=messages.scrollHeight};
const buttons=items=>{quick.innerHTML='';items.forEach(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.label;b.onclick=()=>{add(x.label,'user');x.action()};quick.appendChild(b)})};
const open=()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false');launcher.style.display='none';launcher.style.visibility='hidden';launcher.style.opacity='0';if(!started){started=true;add('Olá! Sou o Assistente AELO. 👋\nPosso ajudar você a encontrar um imóvel, anunciar sua propriedade ou solicitar uma avaliação imobiliária. Escolha uma opção abaixo para começarmos.');main()}};
const shut=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true');const l=document.getElementById('aelo-chat-launcher');if(l && !document.getElementById('property-modal')?.classList.contains('open')){l.style.display='flex';l.style.visibility='visible';l.style.opacity='1'}};
const main=()=>buttons([{label:'🔎 Encontrar imóvel',action:buy},{label:'🔑 Alugar imóvel',action:rent},{label:'📅 Aluguel por temporada',action:seasonRent},{label:'💰 Anunciar imóvel',action:sell},{label:'📊 Avaliação / PTAM',action:valuation},{label:'⚖️ Perícia / assistência',action:expert},{label:'📱 Falar com o corretor',action:contact}]);
const buy=()=>{add('Ótimo. Vamos qualificar seu perfil em poucos passos. Em qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Lauro de Freitas'})},{label:'Camaçari',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Camaçari'})},{label:'Salvador',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Salvador'})},{label:'Outra região',action:()=>freeRegionStep({interest:'Compra',type:'venda'})},{label:'↩️ Menu',action:main}])};
const seasonRent=()=>{add('Ótimo! Vamos encontrar uma hospedagem por temporada. Em qual região você procura?');buttons([{label:'📅 Lauro de Freitas',action:()=>seasonTypeStep({interest:'Temporada',type:'temporada',region:'Lauro de Freitas'})},{label:'🏖️ Camaçari / Guarajuba',action:()=>seasonTypeStep({interest:'Temporada',type:'temporada',region:'Camaçari'})},{label:'🌊 Salvador',action:()=>seasonTypeStep({interest:'Temporada',type:'temporada',region:'Salvador'})},{label:'📱 Outra região / Falar com o corretor',action:()=>wa('Olá! Estou procurando um imóvel para aluguel por temporada em outra região.')},{label:'↩️ Menu',action:main}])};
const seasonTypeStep=(ctx)=>{add('Que tipo de hospedagem você procura?');buttons([{label:'🏠 Casa',action:()=>seasonGuestsStep({...ctx,propertyType:'Casa'})},{label:'🏢 Apartamento',action:()=>seasonGuestsStep({...ctx,propertyType:'Apartamento'})},{label:'🔎 Outro / indiferente',action:()=>seasonGuestsStep({...ctx,propertyType:'Outro / indiferente'})}])};
const seasonGuestsStep=(ctx)=>{add('Quantos hóspedes?');buttons([{label:'Até 2',action:()=>seasonBudgetStep({...ctx,guests:2})},{label:'3 a 5',action:()=>seasonBudgetStep({...ctx,guests:5})},{label:'6 a 8',action:()=>seasonBudgetStep({...ctx,guests:8})},{label:'9 ou mais',action:()=>seasonBudgetStep({...ctx,guests:9})},{label:'Ainda não sei',action:()=>seasonBudgetStep({...ctx,guests:0})}])};
const seasonBudgetStep=(ctx)=>{add('Qual valor máximo por noite você pretende pagar?');buttons([{label:'Até R$ 500/noite',action:()=>seasonFinish({...ctx,budgetLabel:'até R$ 500/noite',budgetMax:500})},{label:'R$ 500 a R$ 1.000',action:()=>seasonFinish({...ctx,budgetLabel:'R$ 500 a R$ 1.000/noite',budgetMin:500,budgetMax:1000})},{label:'R$ 1.000 a R$ 2.000',action:()=>seasonFinish({...ctx,budgetLabel:'R$ 1.000 a R$ 2.000/noite',budgetMin:1000,budgetMax:2000})},{label:'Acima de R$ 2.000',action:()=>seasonFinish({...ctx,budgetLabel:'acima de R$ 2.000/noite',budgetMin:2000})},{label:'Ainda não defini',action:()=>seasonFinish({...ctx,budgetLabel:'a definir',budgetMax:Infinity})}])};
const seasonFinish=(ctx)=>{const normLocal=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const aliases={'Lauro de Freitas':['lauro de freitas','buraquinho','vilas do atlantico','vilas do atlântico','ipitanga','pitangueiras','jardim aeroporto','portao'],'Camaçari':['camaçari','camacari','guarajuba','barra do jacuí','barra do jacui','abrantes','jaua','jauá'],'Salvador':['salvador']};const regionOk=loc=>(aliases[ctx.region]||[normLocal(ctx.region)]).some(a=>normLocal(loc).includes(normLocal(a)));const typeOk=p=>!ctx.propertyType||ctx.propertyType==='Outro / indiferente'||normLocal([p.property_category,p.title,p.description].join(' ')).includes(normLocal(ctx.propertyType));let list=properties.filter(p=>p.type==='temporada'&&regionOk(p.location)&&typeOk(p)&&(!ctx.budgetMin||Number(p.price||0)>=ctx.budgetMin)&&(!ctx.budgetMax||Number(p.price||0)<=ctx.budgetMax)&&(!ctx.guests||Number(p.max_guests||0)>=ctx.guests));trackAeloEvent('search',{interest:'Temporada',type:'temporada',region:ctx.region,budget:ctx.budgetLabel,guests:ctx.guests,results:list.length});add(list.length?'Encontrei estas opções de temporada para você. 📅':'Não encontrei uma opção com todos esses critérios agora. Posso te encaminhar ao Fábio para uma busca personalizada.');if(list.length){list.slice(0,4).forEach(p=>{const el=document.createElement('div');el.className='aelo-chat-property';el.innerHTML=`<img src="${p.image_url}" alt="${esc(p.title)}"><strong>${esc(p.title)}</strong><small>${esc(p.location)} · ${Number(p.max_guests||0)>0?'até '+Number(p.max_guests)+' hóspedes':'consulte hóspedes'}</small><b>${esc(p.price_label||formatPrice(p.price,'temporada'))}</b><a href="#" data-id="${p.id}">Ver imóvel</a>`;quick.appendChild(el);el.querySelector('a').onclick=e=>{e.preventDefault();openModal(p.id);shut();};});}buttons([{label:'📋 Quero deixar meu contato',action:()=>collectLead('Temporada',ctx)},{label:'📱 Falar com o corretor',action:()=>wa(`Olá! Procuro aluguel por temporada em ${ctx.region||'outra região'}. ${ctx.guests?`Somos ${ctx.guests} hóspedes. `:''}${ctx.budgetLabel?`Orçamento: ${ctx.budgetLabel}.`:''}`)},{label:'🔄 Nova busca',action:seasonRent},{label:'↩️ Menu',action:main}]);};
const rent=()=>{add('Perfeito. Vamos qualificar seu perfil em poucos passos. Em qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Lauro de Freitas'})},{label:'Camaçari',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Camaçari'})},{label:'Salvador',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Salvador'})},{label:'Outra região',action:()=>freeRegionStep({interest:'Aluguel',type:'aluguel'})},{label:'↩️ Menu',action:main}])};
const freeRegionStep=(ctx)=>{add('Sem problema. Escolha uma das regiões disponíveis ou fale diretamente com o Fábio para uma busca personalizada.');buttons([{label:'Vilas do Atlântico',action:()=>propertyTypeStep({...ctx,region:'Vilas do Atlântico'})},{label:'Buraquinho',action:()=>propertyTypeStep({...ctx,region:'Buraquinho'})},{label:'Ipitanga',action:()=>propertyTypeStep({...ctx,region:'Ipitanga'})},{label:'Pitangueiras',action:()=>propertyTypeStep({...ctx,region:'Pitangueiras'})},{label:'Alphaville',action:()=>propertyTypeStep({...ctx,region:'Alphaville'})},{label:'📱 Falar com o corretor',action:()=>wa('Olá! Estou procurando um imóvel em outra região e gostaria de receber opções.') }])};
const propertyTypeStep=(ctx)=>{add('Que tipo de imóvel você procura?');buttons([{label:'🏠 Casa',action:()=>bedroomStep({...ctx,propertyType:'Casa'})},{label:'🏢 Apartamento',action:()=>bedroomStep({...ctx,propertyType:'Apartamento'})},{label:'▱ Terreno',action:()=>budgetStep({...ctx,propertyType:'Terreno',bedrooms:0})},{label:'🏬 Comercial',action:()=>bedroomStep({...ctx,propertyType:'Comercial'})},{label:'🔎 Outro / indiferente',action:()=>bedroomStep({...ctx,propertyType:'Outro / indiferente'})}])};
const bedroomStep=(ctx)=>{add('Quantos quartos você precisa?');buttons([{label:'1 quarto',action:()=>budgetStep({...ctx,bedrooms:1})},{label:'2 quartos',action:()=>budgetStep({...ctx,bedrooms:2})},{label:'3 quartos',action:()=>budgetStep({...ctx,bedrooms:3})},{label:'4+ quartos',action:()=>budgetStep({...ctx,bedrooms:4})},{label:'Não é importante',action:()=>budgetStep({...ctx,bedrooms:0})}])};
const budgetStep=(ctx)=>{if(ctx.type==='aluguel'){add('Qual é o valor mensal máximo?');buttons([{label:'Até R$ 3 mil',action:()=>timeframeStep({...ctx,budgetLabel:'até R$ 3 mil/mês',budgetMax:3000,budgetMin:0})},{label:'R$ 3 mil a R$ 6 mil',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 3 mil a R$ 6 mil/mês',budgetMax:6000,budgetMin:3000})},{label:'Acima de R$ 6 mil',action:()=>timeframeStep({...ctx,budgetLabel:'acima de R$ 6 mil/mês',budgetMax:Infinity,budgetMin:6000})},{label:'Ainda não sei',action:()=>timeframeStep({...ctx,budgetLabel:'a definir',budgetMax:Infinity,budgetMin:0})}])}else{add('Qual faixa de valor você pretende investir?');buttons([{label:'Até R$ 300 mil',action:()=>timeframeStep({...ctx,budgetLabel:'até R$ 300 mil',budgetMax:300000,budgetMin:0})},{label:'R$ 300 mil a R$ 500 mil',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 300 mil a R$ 500 mil',budgetMax:500000,budgetMin:300000})},{label:'R$ 500 mil a R$ 800 mil',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 500 mil a R$ 800 mil',budgetMax:800000,budgetMin:500000})},{label:'R$ 800 mil a R$ 1 milhão',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 800 mil a R$ 1 milhão',budgetMax:1000000,budgetMin:800000})},{label:'Acima de R$ 1 milhão',action:()=>timeframeStep({...ctx,budgetLabel:'acima de R$ 1 milhão',budgetMax:Infinity,budgetMin:1000000})},{label:'Ainda não defini',action:()=>timeframeStep({...ctx,budgetLabel:'a definir',budgetMax:Infinity,budgetMin:0})}])}};
const timeframeStep=(ctx)=>{add('E qual é o seu prazo?');buttons([{label:'Imediato',action:()=>finishSearch({...ctx,timeframe:'Imediato'})},{label:'Até 3 meses',action:()=>finishSearch({...ctx,timeframe:'Até 3 meses'})},{label:'3 a 6 meses',action:()=>finishSearch({...ctx,timeframe:'3 a 6 meses'})},{label:'Mais de 6 meses',action:()=>finishSearch({...ctx,timeframe:'Mais de 6 meses'})},{label:'Ainda não sei',action:()=>finishSearch({...ctx,timeframe:'A definir'})}])};
const finishSearch=(ctx)=>{
  const normLocal=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const regionTerm=normLocal(ctx.region);
  const regionAliases={
    'lauro de freitas':['lauro de freitas','buraquinho','vilas do atlantico','vilas do atlântico','ipitanga','pitangueiras','jardim aeroporto','portao'],
    'camaçari':['camaçari','camacari','guarajuba','barra do jacuipe','barra do jacuí','abrantes','jauá','jaua'],
    'salvador':['salvador']
  };
  const regionOk=loc=>{if(!regionTerm)return true; const locn=normLocal(loc); const aliases=regionAliases[ctx.region]||[regionTerm]; return aliases.some(a=>locn.includes(normLocal(a)));};
  const typeOk=p=>{
    if(!ctx.propertyType||ctx.propertyType==='Outro / indiferente')return true;
    const explicit=normLocal(p.property_type||p.propertyType||p.subtype||p.category||p.tipo_imovel||'');
    if(explicit)return explicit.includes(normLocal(ctx.propertyType));
    const text=normLocal([p.title,p.description,p.badge].filter(Boolean).join(' '));
    const terms={Casa:['casa','sobrado','chale','chácara'],Apartamento:['apartamento','apto','flat','studio'],Terreno:['terreno','lote'],Comercial:['comercial','sala','loja','galpao','galpão']};
    return (terms[ctx.propertyType]||[]).some(t=>text.includes(normLocal(t)));
  };
  const base=properties.filter(p=>p.type===ctx.type);
  const exact=base.filter(p=>typeOk(p)&&Number(p.price||0)>=Number(ctx.budgetMin||0)&&Number(p.price||0)<=Number(ctx.budgetMax||Infinity)&&(!ctx.bedrooms||Number(p.bedrooms||0)>=ctx.bedrooms)&&regionOk(p.location));
  let list=exact;
  if(!list.length){
    const nearby=base.filter(p=>typeOk(p)&&Number(p.price||0)>=Number(ctx.budgetMin||0)&&Number(p.price||0)<=Number(ctx.budgetMax||Infinity)&&(!ctx.bedrooms||Number(p.bedrooms||0)>=ctx.bedrooms));
    if(nearby.length){list=nearby; ctx._broader=true;}
  }
  trackAeloEvent('search',{interest:ctx.interest||null,type:ctx.type||null,region:ctx.region||null,propertyType:ctx.propertyType||null,budget:ctx.budgetLabel||null,bedrooms:ctx.bedrooms||null,timeframe:ctx.timeframe||null,results:list.length});
  show(list,`${ctx.interest} • ${ctx.region}`,ctx.interest,ctx);
};
const sell=()=>{add('Posso encaminhar seu interesse diretamente ao corretor.');buttons([{label:'📋 Deixar contato',action:()=>collectLead('Anunciar imóvel')},{label:'📱 Abrir WhatsApp',action:()=>wa('Olá! Gostaria de anunciar meu imóvel para venda.')}])};
const valuation=()=>{add('O serviço de Corretor Avaliador inclui PTAM e análise de mercado. Para solicitar uma avaliação, informe a localização do imóvel e o objetivo da avaliação.');buttons([{label:'📋 Solicitar atendimento',action:()=>collectLead('Avaliação / PTAM')},{label:'📱 Solicitar avaliação',action:()=>wa('Olá! Gostaria de solicitar uma avaliação imobiliária / PTAM.')}])};
const expert=()=>{add('A atuação inclui Perícia Judicial e Assistência Técnica em avaliações imobiliárias.');buttons([{label:'📋 Deixar contato',action:()=>collectLead('Perícia / Assistência Técnica')},{label:'📱 Falar com o corretor',action:()=>wa('Olá! Gostaria de informações sobre Perícia Judicial ou Assistência Técnica em avaliação imobiliária.')}])};
const contact=()=>{add('Claro. O contato profissional é pelo WhatsApp ou pelo e-mail fabio.aelo@creci.org.br.');buttons([{label:'📋 Deixar contato',action:()=>collectLead('Atendimento geral')},{label:'📱 WhatsApp',action:()=>wa('Olá! Vim pelo site AELO e gostaria de falar com você.')},{label:'✉️ Enviar e-mail',action:()=>location.href='mailto:fabio.aelo@creci.org.br'}])};
const region=(type,interest)=>{add('Qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>searchRegion(type,'lauro de freitas',interest)},{label:'Camaçari',action:()=>searchRegion(type,'camaçari',interest)},{label:'Salvador',action:()=>searchRegion(type,'salvador',interest)}])};
const search=(type,pred,label,interest)=>{const list=properties.filter(p=>p.type===type&&pred(Number(p.price||0))); trackAeloEvent('search',{interest,type,budget:label,results:list.length}); show(list,label,interest,{interest,type,budgetLabel:label});};
const searchRegion=(type,term,interest)=>{const list=properties.filter(p=>p.type===type&&String(p.location||'').toLowerCase().includes(term)); trackAeloEvent('search',{interest,type,region:term,budget:'a definir',results:list.length}); show(list,term,interest,{interest,type,region:term,budgetLabel:'a definir'});};
const show=(list,label,interest,ctx={})=>{if(!list.length){add(`Não encontrei imóveis publicados exatamente com esses critérios. Posso registrar sua busca e o Fábio poderá apresentar outras opções.`);buttons([{label:'📋 Quero deixar meu contato',action:()=>collectLead(interest||'Compra',ctx)},{label:'🔎 Nova busca',action:()=>{resetCtx();main()}},{label:'📱 Falar com o corretor',action:()=>wa('Olá! Vim pelo Assistente AELO e gostaria de receber opções de imóveis.') }]);return} if(ctx._broader){add(`Não encontrei uma combinação exata, mas encontrei ${list.length} imóvel(is) publicado(s) que chegam mais perto do que você procura. Veja as opções:`)}else{add(`Encontrei ${list.length} opção(ões) que combinam com seu perfil. Veja abaixo:`)}list.slice(0,4).forEach(p=>{add(`<div class="aelo-chat-property"><img src="${esc(p.image_url||'logo.png')}" alt="${esc(p.title)}"><strong>${esc(p.title)}</strong><small>${esc(p.location||'')}<br>${esc(p.meta.join(' • '))}</small><b>${esc(p.price_label||'')}</b><br><a href="#imoveis" data-prop-id="${esc(p.id)}">Ver imóvel →</a></div>`,'bot',true)});document.querySelectorAll('[data-prop-id]').forEach(a=>a.onclick=e=>{e.preventDefault();shut();openModal(a.dataset.propId)});buttons([{label:'📋 Quero receber opções',action:()=>collectLead(interest||'Compra',ctx)},{label:'📱 Tenho interesse',action:()=>wa(`Olá! Vi opções no site AELO. Meu interesse é ${interest||'imóvel'}.`)},{label:'↩️ Nova busca',action:main}])};
const collectLead=(interest,ctx={})=>{quick.innerHTML=''; const wrap=document.createElement('div'); wrap.className='aelo-lead-card'; const summary=(ctx.region||ctx.budgetLabel||ctx.bedrooms||ctx.propertyType||ctx.timeframe)?`<div class="lead-qualification"><b>Perfil qualificado</b><span>${esc(ctx.region||'Região a definir')}</span><span>${esc(ctx.budgetLabel||'Faixa a definir')}</span><span>${esc(ctx.propertyType||'Tipo não definido')}</span><span>${ctx.bedrooms?`${ctx.bedrooms}+ quartos`:'Quartos não definidos'}</span><span>${esc(ctx.timeframe||'Prazo a definir')}</span></div>`:''; wrap.innerHTML=`<strong>Vamos deixar seu contato?</strong><small>Assim o corretor poderá retornar com atendimento personalizado.</small>${summary}<label>Nome<input class="lead-name" type="text" autocomplete="name" placeholder="Seu nome"></label><label>WhatsApp<input class="lead-phone" type="tel" autocomplete="tel" placeholder="(71) 99999-9999"></label><label>Região de interesse<input class="lead-region" type="text" value="${esc(ctx.region||'')}" placeholder="Ex.: Lauro de Freitas"></label><label>Mensagem <span>(opcional)</span><textarea class="lead-message" rows="2" placeholder="Conte brevemente o que procura"></textarea></label><button type="button" class="aelo-lead-submit">Enviar meu contato</button><p class="aelo-lead-status" role="status"></p>`; quick.appendChild(wrap); requestAnimationFrame(()=>{quick.scrollTop=quick.scrollHeight;}); const btn=wrap.querySelector('.aelo-lead-submit'); btn.onclick=async()=>{const name=wrap.querySelector('.lead-name').value.trim(),phone=wrap.querySelector('.lead-phone').value.trim(),regionValue=wrap.querySelector('.lead-region').value.trim(),message=wrap.querySelector('.lead-message').value.trim(),status=wrap.querySelector('.aelo-lead-status'); if(!name||!phone){status.textContent='Informe seu nome e WhatsApp.';return} btn.disabled=true;btn.textContent='Enviando...'; const client=getSupabaseClient(); if(!client){status.textContent='Não foi possível conectar ao atendimento. Use o WhatsApp.';btn.disabled=false;btn.textContent='Enviar meu contato';return} const qualification=[ctx.propertyType&&`Tipo: ${ctx.propertyType}`,ctx.timeframe&&`Prazo: ${ctx.timeframe}`,ctx.budgetLabel&&`Faixa: ${ctx.budgetLabel}`,ctx.bedrooms?`Quartos: ${ctx.bedrooms}+`:null].filter(Boolean).join(' • '); const finalMessage=[qualification&&`Perfil qualificado — ${qualification}`,message].filter(Boolean).join(' | '); const {error}=await client.from('leads').insert({name,whatsapp:phone,interest,region:regionValue||null,message:finalMessage||null,budget:ctx.budgetLabel||null,source:'site-chatbot',bedrooms:Number(ctx.bedrooms||0),property_id:ctx.propertyId||null}); if(error){console.error(error);status.textContent='Não foi possível registrar agora. Você pode falar pelo WhatsApp.';btn.disabled=false;btn.textContent='Tentar novamente';return} add(`Perfeito, ${name.split(' ')[0]}! Seu contato foi recebido com as preferências registradas. O corretor poderá retornar pelo WhatsApp. 📲`); buttons([{label:'📱 Falar com o corretor',action:()=>wa(`Olá! Acabei de deixar meu contato pelo site AELO. Meu nome é ${name}. Interesse: ${interest}. ${ctx.region?`Região: ${ctx.region}. `:''}${ctx.budgetLabel?`Faixa: ${ctx.budgetLabel}. `:''}${ctx.bedrooms?`Quartos: ${ctx.bedrooms}+.`:''}` )},{label:'↩️ Menu principal',action:main}]); }};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const wa=m=>window.open('https://wa.me/5571992961212?text='+encodeURIComponent(m),'_blank');
let chatCtx={interest:null,type:null,region:null,propertyType:null,bedrooms:null,budgetLabel:null,budgetMin:0,budgetMax:Infinity,timeframe:null};
const resetCtx=()=>{chatCtx={interest:null,type:null,region:null,propertyType:null,bedrooms:null,budgetLabel:null,budgetMin:0,budgetMax:Infinity,timeframe:null}};
const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const mergeCtx=(patch={})=>{chatCtx={...chatCtx,...patch};return chatCtx};
const nextQuestion=ctx=>{
  if(!ctx.interest){add('Posso ajudar. Você está procurando um imóvel para comprar, alugar ou quer outro serviço?');buttons([{label:'🔎 Comprar',action:()=>mergeCtx({interest:'Compra',type:'venda'})&&nextQuestion(chatCtx)},{label:'🔑 Alugar',action:()=>mergeCtx({interest:'Aluguel',type:'aluguel'})&&nextQuestion(chatCtx)},{label:'💰 Anunciar imóvel',action:sell},{label:'📊 Avaliação / PTAM',action:valuation},{label:'⚖️ Perícia / assistência',action:expert}]);return}
  if(!ctx.region){add('Perfeito. Em qual região você procura? Pode digitar uma cidade ou bairro.');buttons([{label:'Lauro de Freitas',action:()=>mergeCtx({region:'Lauro de Freitas'})&&nextQuestion(chatCtx)},{label:'Vilas do Atlântico',action:()=>mergeCtx({region:'Vilas do Atlântico'})&&nextQuestion(chatCtx)},{label:'Camaçari',action:()=>mergeCtx({region:'Camaçari'})&&nextQuestion(chatCtx)},{label:'Salvador',action:()=>mergeCtx({region:'Salvador'})&&nextQuestion(chatCtx)}]);return}
  if(!ctx.propertyType){add('Que tipo de imóvel você procura?');buttons([{label:'🏠 Casa',action:()=>mergeCtx({propertyType:'Casa'})&&nextQuestion(chatCtx)},{label:'🏢 Apartamento',action:()=>mergeCtx({propertyType:'Apartamento'})&&nextQuestion(chatCtx)},{label:'🌳 Terreno',action:()=>mergeCtx({propertyType:'Terreno'})&&nextQuestion(chatCtx)},{label:'🏬 Comercial',action:()=>mergeCtx({propertyType:'Comercial'})&&nextQuestion(chatCtx)},{label:'🔎 Outro / indiferente',action:()=>mergeCtx({propertyType:'Outro / indiferente'})&&nextQuestion(chatCtx)}]);return}
  // Terreno não possui etapa de quartos. Zeramos esse critério e seguimos diretamente para orçamento.
  if(ctx.propertyType==='Terreno'){
    if(ctx.bedrooms===null || ctx.bedrooms===undefined) chatCtx.bedrooms=0;
  }
  if(ctx.propertyType!=='Terreno' && ctx.bedrooms===null){add('Quantos quartos você gostaria de ter?');buttons([{label:'1 quarto',action:()=>mergeCtx({bedrooms:1})&&nextQuestion(chatCtx)},{label:'2 quartos',action:()=>mergeCtx({bedrooms:2})&&nextQuestion(chatCtx)},{label:'3 quartos',action:()=>mergeCtx({bedrooms:3})&&nextQuestion(chatCtx)},{label:'4+ quartos',action:()=>mergeCtx({bedrooms:4})&&nextQuestion(chatCtx)},{label:'Não é importante',action:()=>mergeCtx({bedrooms:0})&&nextQuestion(chatCtx)}]);return}
  if(!ctx.budgetLabel){add(ctx.type==='aluguel'?'Qual é o valor mensal máximo?':'Qual faixa de valor você pretende investir?');if(ctx.type==='aluguel')buttons([{label:'Até R$ 3 mil',action:()=>mergeCtx({budgetLabel:'até R$ 3 mil/mês',budgetMax:3000})&&nextQuestion(chatCtx)},{label:'R$ 3 mil a R$ 6 mil',action:()=>mergeCtx({budgetLabel:'R$ 3 mil a R$ 6 mil/mês',budgetMin:3000,budgetMax:6000})&&nextQuestion(chatCtx)},{label:'Acima de R$ 6 mil',action:()=>mergeCtx({budgetLabel:'acima de R$ 6 mil/mês',budgetMin:6000})&&nextQuestion(chatCtx)},{label:'Ainda não sei',action:()=>mergeCtx({budgetLabel:'a definir'})&&nextQuestion(chatCtx)}]);else buttons([{label:'Até R$ 500 mil',action:()=>mergeCtx({budgetLabel:'até R$ 500 mil',budgetMax:500000})&&nextQuestion(chatCtx)},{label:'R$ 500 mil a R$ 800 mil',action:()=>mergeCtx({budgetLabel:'R$ 500 mil a R$ 800 mil',budgetMin:500000,budgetMax:800000})&&nextQuestion(chatCtx)},{label:'R$ 800 mil a R$ 1 milhão',action:()=>mergeCtx({budgetLabel:'R$ 800 mil a R$ 1 milhão',budgetMin:800000,budgetMax:1000000})&&nextQuestion(chatCtx)},{label:'Acima de R$ 1 milhão',action:()=>mergeCtx({budgetLabel:'acima de R$ 1 milhão',budgetMin:1000000})&&nextQuestion(chatCtx)},{label:'Ainda não sei',action:()=>mergeCtx({budgetLabel:'a definir'})&&nextQuestion(chatCtx)}]);return}
  if(!ctx.timeframe){add('E qual é o seu prazo?');buttons([{label:'Imediato',action:()=>mergeCtx({timeframe:'Imediato'})&&finishSearch(chatCtx)},{label:'Até 3 meses',action:()=>mergeCtx({timeframe:'Até 3 meses'})&&finishSearch(chatCtx)},{label:'3 a 6 meses',action:()=>mergeCtx({timeframe:'3 a 6 meses'})&&finishSearch(chatCtx)},{label:'Mais de 6 meses',action:()=>mergeCtx({timeframe:'Mais de 6 meses'})&&finishSearch(chatCtx)},{label:'Ainda não sei',action:()=>mergeCtx({timeframe:'A definir'})&&finishSearch(chatCtx)}]);return}
  finishSearch(ctx);
};
const parseNatural=(raw)=>{
  const t=norm(raw); const patch={};
  if(/\b(alugar|aluguel|locacao|locar|alugo|alugasse)\b/.test(t)){patch.interest='Aluguel';patch.type='aluguel'}
  else if(/\b(comprar|compra|compro|adquirir|investir|investimento)\b/.test(t)){patch.interest='Compra';patch.type='venda'}
  if(/\b(anunciar|vender|venda|vendo|anuncio)\b/.test(t))patch.intent='sell';
  if(/\b(avaliacao|ptam|avaliar|valorizar)\b/.test(t))patch.intent='valuation';
  if(/\b(pericia|assistencia tecnica|assistencia)\b/.test(t))patch.intent='expert';
  if(/\b(whatsapp|falar com fabio|contato|corretor)\b/.test(t))patch.intent='contact';
  if(/\b(casa|sobrado|chale)\b/.test(t))patch.propertyType='Casa';
  else if(/\b(apartamento|apto|flat|studio)\b/.test(t))patch.propertyType='Apartamento';
  else if(/\b(terreno|lote)\b/.test(t))patch.propertyType='Terreno';
  else if(/\b(comercial|sala comercial|loja|galpao)\b/.test(t))patch.propertyType='Comercial';
  const regions=[['lauro de freitas','Lauro de Freitas'],['vilas do atlantico','Vilas do Atlântico'],['vilas','Vilas do Atlântico'],['camaçari','Camaçari'],['camacari','Camaçari'],['salvador','Salvador'],['alphaville','Alphaville'],['pitangueiras','Pitangueiras'],['buraquinho','Buraquinho'],['ipitang','Ipitanga']];
  const rg=regions.find(([key])=>t.includes(key)); if(rg)patch.region=rg[1];
  const q=t.match(/(\d+)\s*(?:quartos?|dormitorios?|dorms?)/); if(q)patch.bedrooms=Number(q[1]); else if(/\b(4|5|6|7|8)\s*(?:ou mais|\+)\b/.test(t))patch.bedrooms=4; else if(/\b(sem|nao importa|indiferente)\b.*quarto/.test(t))patch.bedrooms=0;
  const money=t.match(/(?:ate|até)\s*r?\$?\s*([\d.,]+)\s*(milhao|milhoes|mil|k)?/); const range=t.match(/([\d.,]+)\s*(?:a|-|ate)\s*([\d.,]+)\s*(mil|milhao|milhoes)?/);
  const val=n=>{let x=Number(String(n).replace(/\./g,'').replace(',','.'));return x};
  if(money){let n=val(money[1]);if(/milhao/.test(money[2]||''))n*=1000000;else if(/mil/.test(money[2]||'')||/k$/.test(money[2]||''))n*=1000;patch.budgetMax=n;patch.budgetMin=0;patch.budgetLabel=`até R$ ${n.toLocaleString('pt-BR')}`}
  else if(range){let a=val(range[1]),b=val(range[2]);if(/milhao/.test(range[3]||'')){a*=1000000;b*=1000000}else if(/mil/.test(range[3]||'')){a*=1000;b*=1000}if(a>b)[a,b]=[b,a];patch.budgetMin=a;patch.budgetMax=b;patch.budgetLabel=`R$ ${a.toLocaleString('pt-BR')} a R$ ${b.toLocaleString('pt-BR')}`}
  if(/imediato|agora|ja|já/.test(t))patch.timeframe='Imediato';else if(/3\s*(?:a|ate|até|-)?\s*mes/.test(t))patch.timeframe='Até 3 meses';else if(/6\s*(?:mes|meses)/.test(t))patch.timeframe='3 a 6 meses';
  return patch;
};
const text=t=>{
  const raw=String(t||'').trim(); if(!raw)return;
  const p=parseNatural(raw);
  if(p.intent==='sell')return sell(); if(p.intent==='valuation')return valuation(); if(p.intent==='expert')return expert(); if(p.intent==='contact')return contact();
  delete p.intent; mergeCtx(p);
  const meaningful=Object.keys(p).length>0;
  if(!meaningful){add('Entendi. 😊 Pode me dizer, por exemplo: “quero comprar uma casa de 3 quartos em Vilas até R$ 1 milhão”.');buttons([{label:'🔎 Encontrar imóvel',action:()=>{resetCtx();buy()}},{label:'🔑 Alugar',action:()=>{resetCtx();rent()}},{label:'📊 Avaliação / PTAM',action:valuation},{label:'💬 Falar com o corretor',action:contact}]);return}
  const parts=[]; if(chatCtx.interest)parts.push(chatCtx.interest.toLowerCase());if(chatCtx.propertyType)parts.push(chatCtx.propertyType.toLowerCase());if(chatCtx.region)parts.push(`em ${chatCtx.region}`);if(chatCtx.bedrooms)parts.push(`${chatCtx.bedrooms}+ quartos`);if(chatCtx.budgetLabel)parts.push(chatCtx.budgetLabel);
  add(`Perfeito! Entendi ${parts.length?'que você procura '+parts.join(', ')+'.':'sua necessidade.'} Vou usar essas informações e pedir só o que estiver faltando. 😊`);setTimeout(()=>nextQuestion(chatCtx),120);
};
const getSeasonBookingContext=()=>{
  const ci=document.getElementById('modal-season-checkin')?.value||'';
  const co=document.getElementById('modal-season-checkout')?.value||'';
  const guests=Number(document.getElementById('modal-season-guests')?.value||2);
  const totalEl=document.getElementById('modal-season-total');
  const totalText=totalEl?.innerText||'';
  const estimatedTotal=Number(totalEl?.dataset?.estimatedTotal||0);
  const valid=!!ci&&!!co&&co>ci&&estimatedTotal>=0&&(!totalText.includes('Indisponíveis')&&!totalText.includes('indisponíveis')&&!totalText.includes('Período inválido')&&!totalText.includes('Mínimo')&&!totalText.includes('acima do limite'));
  return {checkin:ci,checkout:co,guests,totalText,estimatedTotal,valid};
};
const propertyInterest=(p)=>{
  if(!p) return;
  const interest = p.type==='temporada' ? 'Temporada' : (p.type==='aluguel' ? 'Aluguel' : 'Compra');
  const booking=p.type==='temporada'?getSeasonBookingContext():{};
  const ctx={interest,type:p.type||'venda',region:p.location||'',propertyType:p.meta?.[0]||'',bedrooms:Number(p.bedrooms||0),budgetLabel:p.price_label||'',propertyId:p.id,timeframe:null,propertyTitle:p.title,propertyLocation:p.location,propertyPrice:p.price_label||'',checkin:booking.checkin||'',checkout:booking.checkout||'',guests:booking.guests||0,estimatedTotal:booking.estimatedTotal||null,estimatedTotalLabel:booking.totalText||''};
  resetCtx();
  mergeCtx(ctx);
  panel.classList.add('open'); panel.setAttribute('aria-hidden','false');
  const launcher = document.getElementById('aelo-chat-launcher');
  if (launcher) { launcher.style.display='none'; launcher.style.visibility='hidden'; }
  if(p.type==='temporada'){
    const period=ctx.checkin&&ctx.checkout?` de <strong>${esc(ctx.checkin)}</strong> a <strong>${esc(ctx.checkout)}</strong>`:' para as datas que você selecionou';
    const guests=ctx.guests?` para <strong>${ctx.guests} hóspede${ctx.guests===1?'':'s'}</strong>`:'';
    add(`Você está falando com a AELO sobre <strong>${esc(p.title)}</strong>. ${period}${guests}. 😊`,'bot',true);
    if(!ctx.checkin||!ctx.checkout){
      add('Antes de solicitar a reserva, precisamos selecionar o período da hospedagem. Volte ao imóvel e escolha as datas.','bot');
      buttons([{label:'📅 Voltar para as datas',action:()=>{shut();openModal(p.id)}},{label:'📱 Falar com o corretor',action:()=>wa(`Olá! Tenho interesse no imóvel ${p.title}${p.location?` em ${p.location}`:''} para aluguel por temporada.`)}]);
      return;
    }
    add('Posso continuar com a sua solicitação de hospedagem. Você quer avançar para o atendimento da AELO?','bot');
    buttons([
      {label:'🏡 Sim, quero solicitar',action:()=>seasonClosingStart(p,ctx)},
      {label:'💬 Quero tirar uma dúvida',action:()=>seasonQuestionStep(p,ctx)},
      {label:'📸 Ver fotos novamente',action:()=>{shut();openModal(p.id)}},
      {label:'📍 Saber sobre a localização',action:()=>{add(`O imóvel está localizado em <strong>${esc(p.location||'localização informada no anúncio')}</strong>.`,'bot',true);buttons([{label:'🏡 Continuar solicitação',action:()=>seasonClosingStart(p,ctx)},{label:'↩️ Voltar',action:()=>propertyInterest(p)}])}}
    ]);
    return;
  }
  add(`Você está falando com a AELO sobre <strong>${esc(p.title)}</strong>. Como posso ajudar? 😊`,'bot',true);
  buttons([
    {label:'📋 Quero mais informações',action:()=>collectLead(interest,ctx)},
    {label:'📅 Quero agendar uma visita',action:()=>collectLead('Agendamento de visita',{...ctx,timeframe:'Solicitação de visita'})},
    {label:'📸 Ver fotos novamente',action:()=>{shut();openModal(p.id)}},
    {label:'📍 Quero saber sobre a localização',action:()=>{add(`Este imóvel está localizado em <strong>${esc(p.location||'localização informada no anúncio')}</strong>.`,'bot',true);buttons([{label:'📋 Tenho interesse',action:()=>collectLead(interest,ctx)},{label:'📅 Agendar visita',action:()=>collectLead('Agendamento de visita',{...ctx,timeframe:'Solicitação de visita'})},{label:'↩️ Voltar',action:()=>propertyInterest(p)}])}},
    {label:'💬 Continuar pelo WhatsApp',action:()=>wa(`Olá! Falei com o Assistente AELO pelo site e tenho interesse no imóvel ${p.title}${p.location?` em ${p.location}`:''}${p.price_label?` — ${p.price_label}`:''}. Como posso receber mais informações?`)}
  ]);
};
const seasonQuestionStep=(p,ctx)=>{
  add('Claro. O que você gostaria de saber sobre esta hospedagem?','bot');
  buttons([
    {label:'💰 Sobre o valor',action:()=>{add('A tarifa é apresentada como estimativa e pode variar conforme o período. A AELO confirma o valor final antes da reserva.','bot');buttons([{label:'🏡 Continuar solicitação',action:()=>seasonClosingStart(p,ctx)},{label:'↩️ Voltar',action:()=>propertyInterest(p)}])}},
    {label:'📅 Sobre disponibilidade',action:()=>{add('As datas selecionadas serão verificadas pela AELO antes da confirmação. O calendário do anúncio serve para consulta de disponibilidade.','bot');buttons([{label:'🏡 Solicitar esta hospedagem',action:()=>seasonClosingStart(p,ctx)},{label:'↩️ Voltar',action:()=>propertyInterest(p)}])}},
    {label:'🏠 Sobre o imóvel',action:()=>{add(`Este anúncio é o <strong>${esc(p.title)}</strong>, em <strong>${esc(p.location||'localização informada')}</strong>.`,'bot',true);buttons([{label:'🏡 Quero solicitar',action:()=>seasonClosingStart(p,ctx)},{label:'📸 Ver fotos',action:()=>{shut();openModal(p.id)}}])}},
    {label:'💬 Falar com o corretor',action:()=>wa(seasonWaMessage(p,ctx))}
  ]);
};
const seasonClosingStart=(p,ctx)=>{
  add('Ótimo. Vamos concluir sua solicitação de hospedagem em poucos passos. Primeiro, como posso chamar você?','bot');
  const wrap=document.createElement('div'); wrap.className='aelo-season-lead-step';
  wrap.innerHTML=`<label>Seu nome<input class="season-lead-name" type="text" autocomplete="name" placeholder="Digite seu nome"></label><button type="button" class="aelo-lead-submit season-next-name">Continuar</button><p class="aelo-lead-status" role="status"></p>`;
  quick.innerHTML=''; quick.appendChild(wrap); requestAnimationFrame(()=>{quick.scrollTop=quick.scrollHeight;});
  wrap.querySelector('.season-next-name').onclick=()=>{const name=wrap.querySelector('.season-lead-name').value.trim(); if(!name){wrap.querySelector('.aelo-lead-status').textContent='Informe seu nome para continuar.';return;} seasonClosingPhone(p,{...ctx,name});};
};
const seasonClosingPhone=(p,ctx)=>{
  add(`Prazer, ${esc(ctx.name.split(' ')[0])}! Agora me informe seu WhatsApp para a AELO confirmar a disponibilidade e retornar para você.`,'bot',true);
  const wrap=document.createElement('div'); wrap.className='aelo-season-lead-step';
  wrap.innerHTML=`<label>WhatsApp<input class="season-lead-phone" type="tel" autocomplete="tel" placeholder="(71) 99999-9999"></label><button type="button" class="aelo-lead-submit season-next-phone">Continuar</button><p class="aelo-lead-status" role="status"></p>`;
  quick.innerHTML=''; quick.appendChild(wrap); requestAnimationFrame(()=>{quick.scrollTop=quick.scrollHeight;});
  wrap.querySelector('.season-next-phone').onclick=()=>{const phone=wrap.querySelector('.season-lead-phone').value.trim(); if(!phone){wrap.querySelector('.aelo-lead-status').textContent='Informe seu WhatsApp para continuar.';return;} seasonClosingNote(p,{...ctx,phone});};
};
const seasonClosingNote=(p,ctx)=>{
  add('Última pergunta: existe alguma observação ou necessidade especial para essa estadia?','bot');
  buttons([{label:'✅ Não, pode prosseguir',action:()=>seasonClosingReview(p,{...ctx,note:''})},{label:'📝 Quero informar',action:()=>{const wrap=document.createElement('div');wrap.className='aelo-season-lead-step';wrap.innerHTML=`<label>Observação <span>(opcional)</span><textarea class="season-lead-note" rows="3" placeholder="Ex.: criança, horário previsto de chegada, necessidade específica..."></textarea></label><button type="button" class="aelo-lead-submit season-next-note">Continuar</button>`;quick.innerHTML='';quick.appendChild(wrap);wrap.querySelector('.season-next-note').onclick=()=>seasonClosingReview(p,{...ctx,note:wrap.querySelector('.season-lead-note').value.trim()});}}]);
};
const seasonClosingReview=(p,ctx)=>{
  add('Perfeito. Confira sua solicitação antes de eu encaminhar para a AELO:','bot');
  const period=ctx.checkin&&ctx.checkout?`${ctx.checkin} → ${ctx.checkout}`:'datas a confirmar';
  const summary=`<div class="aelo-lead-card"><strong>${esc(p.title)}</strong><small>${esc(p.location||'')}<br>📅 ${esc(period)}<br>👥 ${ctx.guests||'A definir'} hóspede${Number(ctx.guests)===1?'':'s'}${ctx.estimatedTotal!==null&&ctx.estimatedTotal!==undefined?`<br>💰 ${fmtBRL(Number(ctx.estimatedTotal))} estimados`:''}<br>👤 ${esc(ctx.name)}<br>📱 ${esc(ctx.phone)}</small>${ctx.note?`<small>📝 ${esc(ctx.note)}</small>`:''}</div>`;
  add(summary,'bot',true);
  buttons([{label:'📨 Enviar solicitação',action:()=>seasonSubmitLead(p,ctx)},{label:'💬 Continuar pelo WhatsApp',action:()=>wa(seasonWaMessage(p,ctx))},{label:'↩️ Alterar informações',action:()=>seasonClosingStart(p,ctx)}]);
};
const seasonWaMessage=(p,ctx)=>`Olá, Fábio! Vim pelo site AELO e gostaria de solicitar a hospedagem do imóvel ${p.title}${p.location?` em ${p.location}`:''}. Período: ${ctx.checkin||'a definir'} a ${ctx.checkout||'a definir'}. Hóspedes: ${ctx.guests||'a definir'}. ${ctx.estimatedTotal!==null&&ctx.estimatedTotal!==undefined?`Valor estimado informado no site: ${fmtBRL(Number(ctx.estimatedTotal))}. `:''}Meu nome é ${ctx.name||'a informar'} e meu WhatsApp é ${ctx.phone||'a informar'}.${ctx.note?` Observação: ${ctx.note}`:''}`;
const calculateSeasonReservationEstimate=async(p,ctx)=>{
  const ci=ctx.checkin||'', co=ctx.checkout||'';
  const guests=Number(ctx.guests||2);
  if(!ci||!co||co<=ci) return null;
  if(Number(p.max_guests||0)>0 && guests>Number(p.max_guests)) return null;
  const availability=await loadSeasonAvailability(p.id);
  const nights=nightsBetween(ci,co);
  if(!nights || Number(p.min_nights||0)>nights) return null;
  let total=0;
  for(let i=0;i<nights;i++){
    const d=new Date(dateOnly(ci)); d.setDate(d.getDate()+i);
    const iso=d.toISOString().slice(0,10);
    if(dayBlocked(iso,availability.blocks)) return null;
    total+=rateForNight(p,iso,availability.rates).value;
  }
  return total+Number(p.cleaning_fee||0);
};
const seasonSubmitLead=async(p,ctx)=>{
  add('Enviando sua solicitação para a AELO...','bot');
  const client=getSupabaseClient();
  if(!client){add('Não consegui conectar ao atendimento agora. Você pode continuar pelo WhatsApp.','bot');buttons([{label:'💬 Abrir WhatsApp',action:()=>wa(seasonWaMessage(p,ctx))}]);return;}
  const calculatedEstimate=await calculateSeasonReservationEstimate(p,ctx);
  const finalEstimate=Number(ctx.estimatedTotal)>0?Number(ctx.estimatedTotal):calculatedEstimate;
  const detail=[`Imóvel: ${p.title}`,`Localização: ${p.location||'não informada'}`,`Check-in: ${ctx.checkin||'a definir'}`,`Check-out: ${ctx.checkout||'a definir'}`,`Hóspedes: ${ctx.guests||'a definir'}`,finalEstimate?`Valor estimado: ${fmtBRL(finalEstimate)}`:null,ctx.note?`Observação: ${ctx.note}`:null].filter(Boolean).join(' | ');
  const {data:lead,error:leadError}=await client.from('leads').insert({name:ctx.name,whatsapp:ctx.phone,interest:'Solicitação de reserva - Temporada',region:p.location||null,message:detail,source:'site-temporada',bedrooms:Number(p.bedrooms||0),property_id:p.id}).select('id').single();
  if(leadError){console.error(leadError);add('Não foi possível registrar a solicitação agora. Mas seus dados já estão preenchidos para continuar pelo WhatsApp.','bot');buttons([{label:'💬 Continuar pelo WhatsApp',action:()=>wa(seasonWaMessage(p,ctx))},{label:'↩️ Tentar novamente',action:()=>seasonClosingReview(p,ctx)}]);return;}
  const reservationPayload={property_id:p.id,lead_id:lead?.id||null,guest_name:ctx.name,guest_whatsapp:ctx.phone,checkin:ctx.checkin||null,checkout:ctx.checkout||null,guests:Number(ctx.guests||2),estimated_total:finalEstimate||null,note:ctx.note||null,status:'solicitada'};
  const {error:reservationError}=await client.from('season_reservations').insert(reservationPayload);
  if(reservationError){console.error(reservationError);add('Seu contato foi registrado, mas não consegui criar a solicitação de reserva automaticamente. A AELO poderá continuar pelo WhatsApp.','bot');buttons([{label:'💬 Continuar pelo WhatsApp',action:()=>wa(seasonWaMessage(p,ctx))},{label:'↩️ Tentar novamente',action:()=>seasonClosingReview(p,ctx)}]);return;}
  add(`Solicitação enviada com sucesso, ${esc(ctx.name.split(' ')[0])}! 🎉 A AELO recebeu sua solicitação de hospedagem e ela agora está na Central de Reservas para confirmação.`,'bot',true);
  buttons([{label:'💬 Confirmar pelo WhatsApp',action:()=>wa(seasonWaMessage(p,ctx))},{label:'📸 Continuar vendo o imóvel',action:()=>{shut();openModal(p.id)}},{label:'↩️ Voltar ao menu',action:()=>{shut();closeModal();main()}}]);
};
window.aeloStartPropertyInterest=propertyInterest;
launcher.onclick=open;close.onclick=shut;
})();

