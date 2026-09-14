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
  const gallery_urls = Array.isArray(p.gallery_urls) && p.gallery_urls.length ? p.gallery_urls : (p.image_url ? [p.image_url] : []);
  return { ...p, gallery_urls, image_url: gallery_urls[0] || p.image_url || "logo.png", badge: p.badge || String(p.type || "").toUpperCase(), price_label: p.price_label || formatPrice(p.price, p.type), meta };
}

function formatPrice(value, type) {
  const n = Number(value || 0);
  const base = n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return type === "aluguel" ? `${base}/mês` : base;
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

function renderProperties(filter = "todos") {
  const list = filter === "todos" ? properties : properties.filter(p => p.type === filter);
  grid.innerHTML = list.map(p => `
    <article class="property-card" data-id="${p.id}">
      <div class="property-image">
        <img src="${p.image_url}" alt="${p.title}" loading="lazy">
        <span class="badge">${p.badge}</span>${p.commercial_status==='vendido'?`<span class="sold-badge">✓ IMÓVEL VENDIDO</span>`:''}
      </div>
      <div class="property-info">
        <h3>${p.title}</h3>
        <p class="location">${p.location}</p>
        <div class="price">${p.price_label}</div>
        <div class="meta">${p.meta.map(item => `<span>${item}</span>`).join("")}</div>
      </div>
    </article>`).join("");

  if (!list.length) grid.innerHTML = `<div style="grid-column:1/-1;padding:30px 0;color:#697384">Nenhum imóvel encontrado nesta categoria.</div>`;
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
  document.getElementById("modal-description").textContent = p.description || "Entre em contato com a Aelo para mais informações.";
  renderGalleryThumbs();
  showGalleryImage();
  modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
}

function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

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
  closeModal();
  if (p && typeof window.aeloStartPropertyInterest === "function") window.aeloStartPropertyInterest(p);
  else {
    const launcher = document.getElementById("aelo-chat-launcher");
    if (launcher) launcher.click();
  }
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

loadProperties();


/* V32.1 — Assistente AELO: qualificação na ordem região > tipo > quartos > valor > prazo */
(function initAeloAssistant(){
const launcher=document.getElementById('aelo-chat-launcher'),panel=document.getElementById('aelo-chat'),close=document.getElementById('aelo-chat-close'),messages=document.getElementById('aelo-chat-messages'),quick=document.getElementById('aelo-chat-quick'); if(!launcher||!panel)return; let started=false;
const add=(text,who='bot',html=false)=>{const e=document.createElement('div');e.className='aelo-chat-msg '+who;html?e.innerHTML=text:e.textContent=text;messages.appendChild(e);messages.scrollTop=messages.scrollHeight};
const buttons=items=>{quick.innerHTML='';items.forEach(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.label;b.onclick=()=>{add(x.label,'user');x.action()};quick.appendChild(b)})};
const open=()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false');if(!started){started=true;add('Olá! Sou o Assistente AELO. 👋\nPosso ajudar você a encontrar um imóvel, anunciar sua propriedade ou solicitar uma avaliação imobiliária. Escolha uma opção abaixo para começarmos.');main()}};
const shut=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
const main=()=>buttons([{label:'🔎 Encontrar imóvel',action:buy},{label:'🔑 Alugar imóvel',action:rent},{label:'💰 Anunciar imóvel',action:sell},{label:'📊 Avaliação / PTAM',action:valuation},{label:'⚖️ Perícia / assistência',action:expert},{label:'📱 Falar com Fabio',action:contact}]);
const buy=()=>{add('Ótimo. Vamos qualificar seu perfil em poucos passos. Em qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Lauro de Freitas'})},{label:'Camaçari',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Camaçari'})},{label:'Salvador',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Salvador'})},{label:'Outra região',action:()=>freeRegionStep({interest:'Compra',type:'venda'})}])};
const rent=()=>{add('Perfeito. Vamos qualificar seu perfil em poucos passos. Em qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Lauro de Freitas'})},{label:'Camaçari',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Camaçari'})},{label:'Salvador',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Salvador'})},{label:'Outra região',action:()=>freeRegionStep({interest:'Aluguel',type:'aluguel'})}])};
const freeRegionStep=(ctx)=>{add('Sem problema. Escolha uma das regiões disponíveis ou fale diretamente com o Fábio para uma busca personalizada.');buttons([{label:'Vilas do Atlântico',action:()=>propertyTypeStep({...ctx,region:'Vilas do Atlântico'})},{label:'Buraquinho',action:()=>propertyTypeStep({...ctx,region:'Buraquinho'})},{label:'Ipitanga',action:()=>propertyTypeStep({...ctx,region:'Ipitanga'})},{label:'Pitangueiras',action:()=>propertyTypeStep({...ctx,region:'Pitangueiras'})},{label:'Alphaville',action:()=>propertyTypeStep({...ctx,region:'Alphaville'})},{label:'📱 Falar com Fábio',action:()=>wa('Olá, Fabio! Estou procurando um imóvel em outra região e gostaria de receber opções.') }])};
const propertyTypeStep=(ctx)=>{add('Que tipo de imóvel você procura?');buttons([{label:'🏠 Casa',action:()=>bedroomStep({...ctx,propertyType:'Casa'})},{label:'🏢 Apartamento',action:()=>bedroomStep({...ctx,propertyType:'Apartamento'})},{label:'🌳 Terreno',action:()=>bedroomStep({...ctx,propertyType:'Terreno'})},{label:'🏬 Comercial',action:()=>bedroomStep({...ctx,propertyType:'Comercial'})},{label:'🔎 Outro / indiferente',action:()=>bedroomStep({...ctx,propertyType:'Outro / indiferente'})}])};
const bedroomStep=(ctx)=>{add('Quantos quartos você precisa?');buttons([{label:'1 quarto',action:()=>budgetStep({...ctx,bedrooms:1})},{label:'2 quartos',action:()=>budgetStep({...ctx,bedrooms:2})},{label:'3 quartos',action:()=>budgetStep({...ctx,bedrooms:3})},{label:'4+ quartos',action:()=>budgetStep({...ctx,bedrooms:4})},{label:'Não é importante',action:()=>budgetStep({...ctx,bedrooms:0})}])};
const budgetStep=(ctx)=>{if(ctx.type==='aluguel'){add('Qual é o valor mensal máximo?');buttons([{label:'Até R$ 3 mil',action:()=>timeframeStep({...ctx,budgetLabel:'até R$ 3 mil/mês',budgetMax:3000,budgetMin:0})},{label:'R$ 3 mil a R$ 6 mil',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 3 mil a R$ 6 mil/mês',budgetMax:6000,budgetMin:3000})},{label:'Acima de R$ 6 mil',action:()=>timeframeStep({...ctx,budgetLabel:'acima de R$ 6 mil/mês',budgetMax:Infinity,budgetMin:6000})},{label:'Ainda não sei',action:()=>timeframeStep({...ctx,budgetLabel:'a definir',budgetMax:Infinity,budgetMin:0})}])}else{add('Qual faixa de valor você pretende investir?');buttons([{label:'Até R$ 300 mil',action:()=>timeframeStep({...ctx,budgetLabel:'até R$ 300 mil',budgetMax:300000,budgetMin:0})},{label:'R$ 300 mil a R$ 500 mil',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 300 mil a R$ 500 mil',budgetMax:500000,budgetMin:300000})},{label:'R$ 500 mil a R$ 800 mil',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 500 mil a R$ 800 mil',budgetMax:800000,budgetMin:500000})},{label:'R$ 800 mil a R$ 1 milhão',action:()=>timeframeStep({...ctx,budgetLabel:'R$ 800 mil a R$ 1 milhão',budgetMax:1000000,budgetMin:800000})},{label:'Acima de R$ 1 milhão',action:()=>timeframeStep({...ctx,budgetLabel:'acima de R$ 1 milhão',budgetMax:Infinity,budgetMin:1000000})},{label:'Ainda não defini',action:()=>timeframeStep({...ctx,budgetLabel:'a definir',budgetMax:Infinity,budgetMin:0})}])}};
const timeframeStep=(ctx)=>{add('E qual é o seu prazo?');buttons([{label:'Imediato',action:()=>finishSearch({...ctx,timeframe:'Imediato'})},{label:'Até 3 meses',action:()=>finishSearch({...ctx,timeframe:'Até 3 meses'})},{label:'3 a 6 meses',action:()=>finishSearch({...ctx,timeframe:'3 a 6 meses'})},{label:'Mais de 6 meses',action:()=>finishSearch({...ctx,timeframe:'Mais de 6 meses'})},{label:'Ainda não sei',action:()=>finishSearch({...ctx,timeframe:'A definir'})}])};
const finishSearch=(ctx)=>{const regionTerm=String(ctx.region||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); const list=properties.filter(p=>p.type===ctx.type&&Number(p.price||0)>=Number(ctx.budgetMin||0)&&Number(p.price||0)<=Number(ctx.budgetMax||Infinity)&&(!ctx.bedrooms||Number(p.bedrooms||0)>=ctx.bedrooms)&&(!regionTerm||regionTerm==='não informada'||String(p.location||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(regionTerm))); trackAeloEvent('search',{interest:ctx.interest||null,type:ctx.type||null,region:ctx.region||null,budget:ctx.budgetLabel||null,bedrooms:ctx.bedrooms||null,timeframe:ctx.timeframe||null,results:list.length}); show(list,`${ctx.interest} • ${ctx.region}`,ctx.interest,ctx)};
const sell=()=>{add('Posso encaminhar seu interesse diretamente ao Fabio.');buttons([{label:'📋 Deixar contato',action:()=>collectLead('Anunciar imóvel')},{label:'📱 Abrir WhatsApp',action:()=>wa('Olá, Fabio! Gostaria de anunciar meu imóvel para venda.')}])};
const valuation=()=>{add('O serviço de Corretor Avaliador inclui PTAM e análise de mercado. Para solicitar uma avaliação, informe a localização do imóvel e o objetivo da avaliação.');buttons([{label:'📋 Solicitar atendimento',action:()=>collectLead('Avaliação / PTAM')},{label:'📱 Solicitar avaliação',action:()=>wa('Olá, Fabio! Gostaria de solicitar uma avaliação imobiliária / PTAM.')}])};
const expert=()=>{add('A atuação inclui Perícia Judicial e Assistência Técnica em avaliações imobiliárias.');buttons([{label:'📋 Deixar contato',action:()=>collectLead('Perícia / Assistência Técnica')},{label:'📱 Falar com Fabio',action:()=>wa('Olá, Fabio! Gostaria de informações sobre Perícia Judicial ou Assistência Técnica em avaliação imobiliária.')}])};
const contact=()=>{add('Claro. O contato profissional é pelo WhatsApp ou pelo e-mail fabio.aelo@creci.org.br.');buttons([{label:'📋 Deixar contato',action:()=>collectLead('Atendimento geral')},{label:'📱 WhatsApp',action:()=>wa('Olá, Fabio! Vim pelo site AELO e gostaria de falar com você.')},{label:'✉️ Enviar e-mail',action:()=>location.href='mailto:fabio.aelo@creci.org.br'}])};
const region=(type,interest)=>{add('Qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>searchRegion(type,'lauro de freitas',interest)},{label:'Camaçari',action:()=>searchRegion(type,'camaçari',interest)},{label:'Salvador',action:()=>searchRegion(type,'salvador',interest)}])};
const search=(type,pred,label,interest)=>{const list=properties.filter(p=>p.type===type&&pred(Number(p.price||0))); trackAeloEvent('search',{interest,type,budget:label,results:list.length}); show(list,label,interest,{interest,type,budgetLabel:label});};
const searchRegion=(type,term,interest)=>{const list=properties.filter(p=>p.type===type&&String(p.location||'').toLowerCase().includes(term)); trackAeloEvent('search',{interest,type,region:term,budget:'a definir',results:list.length}); show(list,term,interest,{interest,type,region:term,budgetLabel:'a definir'});};
const show=(list,label,interest,ctx={})=>{if(!list.length){add(`Não encontrei imóveis publicados para esse perfil. Posso encaminhar seu pedido ao Fabio para receber outras opções.`);buttons([{label:'📋 Quero receber opções',action:()=>collectLead(interest||'Compra',ctx)},{label:'📱 Falar com Fabio',action:()=>wa('Olá, Fabio! Vim pelo Assistente AELO e gostaria de receber opções de imóveis.')},{label:'↩️ Voltar',action:main}]);return} add(`Encontrei ${list.length} opção(ões) que combinam com seu perfil. Veja abaixo:`);list.slice(0,4).forEach(p=>{add(`<div class="aelo-chat-property"><img src="${esc(p.image_url||'logo.png')}" alt="${esc(p.title)}"><strong>${esc(p.title)}</strong><small>${esc(p.location||'')}<br>${esc(p.meta.join(' • '))}</small><b>${esc(p.price_label||'')}</b><br><a href="#imoveis" data-prop-id="${esc(p.id)}">Ver imóvel →</a></div>`,'bot',true)});document.querySelectorAll('[data-prop-id]').forEach(a=>a.onclick=e=>{e.preventDefault();shut();openModal(a.dataset.propId)});buttons([{label:'📋 Quero receber opções',action:()=>collectLead(interest||'Compra',ctx)},{label:'📱 Tenho interesse',action:()=>wa(`Olá, Fabio! Vi opções no site AELO. Meu interesse é ${interest||'imóvel'}.`)},{label:'↩️ Nova busca',action:main}])};
const collectLead=(interest,ctx={})=>{quick.innerHTML=''; const wrap=document.createElement('div'); wrap.className='aelo-lead-card'; const summary=(ctx.region||ctx.budgetLabel||ctx.bedrooms||ctx.propertyType||ctx.timeframe)?`<div class="lead-qualification"><b>Perfil qualificado</b><span>${esc(ctx.region||'Região a definir')}</span><span>${esc(ctx.budgetLabel||'Faixa a definir')}</span><span>${esc(ctx.propertyType||'Tipo não definido')}</span><span>${ctx.bedrooms?`${ctx.bedrooms}+ quartos`:'Quartos não definidos'}</span><span>${esc(ctx.timeframe||'Prazo a definir')}</span></div>`:''; wrap.innerHTML=`<strong>Vamos deixar seu contato?</strong><small>Assim o Fabio pode retornar com atendimento personalizado.</small>${summary}<label>Nome<input class="lead-name" type="text" autocomplete="name" placeholder="Seu nome"></label><label>WhatsApp<input class="lead-phone" type="tel" autocomplete="tel" placeholder="(71) 99999-9999"></label><label>Região de interesse<input class="lead-region" type="text" value="${esc(ctx.region||'')}" placeholder="Ex.: Lauro de Freitas"></label><label>Mensagem <span>(opcional)</span><textarea class="lead-message" rows="2" placeholder="Conte brevemente o que procura"></textarea></label><button type="button" class="aelo-lead-submit">Enviar meu contato</button><p class="aelo-lead-status" role="status"></p>`; quick.appendChild(wrap); requestAnimationFrame(()=>{quick.scrollTop=quick.scrollHeight;}); const btn=wrap.querySelector('.aelo-lead-submit'); btn.onclick=async()=>{const name=wrap.querySelector('.lead-name').value.trim(),phone=wrap.querySelector('.lead-phone').value.trim(),regionValue=wrap.querySelector('.lead-region').value.trim(),message=wrap.querySelector('.lead-message').value.trim(),status=wrap.querySelector('.aelo-lead-status'); if(!name||!phone){status.textContent='Informe seu nome e WhatsApp.';return} btn.disabled=true;btn.textContent='Enviando...'; const client=getSupabaseClient(); if(!client){status.textContent='Não foi possível conectar ao atendimento. Use o WhatsApp.';btn.disabled=false;btn.textContent='Enviar meu contato';return} const qualification=[ctx.propertyType&&`Tipo: ${ctx.propertyType}`,ctx.timeframe&&`Prazo: ${ctx.timeframe}`,ctx.budgetLabel&&`Faixa: ${ctx.budgetLabel}`,ctx.bedrooms?`Quartos: ${ctx.bedrooms}+`:null].filter(Boolean).join(' • '); const finalMessage=[qualification&&`Perfil qualificado — ${qualification}`,message].filter(Boolean).join(' | '); const {error}=await client.from('leads').insert({name,whatsapp:phone,interest,region:regionValue||null,message:finalMessage||null,budget:ctx.budgetLabel||null,source:'site-chatbot',bedrooms:Number(ctx.bedrooms||0),property_id:ctx.propertyId||null}); if(error){console.error(error);status.textContent='Não foi possível registrar agora. Você pode falar pelo WhatsApp.';btn.disabled=false;btn.textContent='Tentar novamente';return} add(`Perfeito, ${name.split(' ')[0]}! Seu contato foi recebido com as preferências registradas. O Fabio poderá retornar pelo WhatsApp. 📲`); buttons([{label:'📱 Falar com Fabio',action:()=>wa(`Olá, Fabio! Acabei de deixar meu contato pelo site AELO. Meu nome é ${name}. Interesse: ${interest}. ${ctx.region?`Região: ${ctx.region}. `:''}${ctx.budgetLabel?`Faixa: ${ctx.budgetLabel}. `:''}${ctx.bedrooms?`Quartos: ${ctx.bedrooms}+.`:''}` )},{label:'↩️ Menu principal',action:main}]); }};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const wa=m=>window.open('https://wa.me/5571992961212?text='+encodeURIComponent(m),'_blank');
let chatCtx={interest:null,type:null,region:null,propertyType:null,bedrooms:null,budgetLabel:null,budgetMin:0,budgetMax:Infinity,timeframe:null};
const resetCtx=()=>{chatCtx={interest:null,type:null,region:null,propertyType:null,bedrooms:null,budgetLabel:null,budgetMin:0,budgetMax:Infinity,timeframe:null}};
const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const mergeCtx=(patch={})=>{chatCtx={...chatCtx,...patch};return chatCtx};
const nextQuestion=ctx=>{
  if(!ctx.interest){add('Posso ajudar. Você está procurando um imóvel para comprar, alugar ou quer outro serviço?');buttons([{label:'🔎 Comprar',action:()=>mergeCtx({interest:'Compra',type:'venda'})&&nextQuestion(chatCtx)},{label:'🔑 Alugar',action:()=>mergeCtx({interest:'Aluguel',type:'aluguel'})&&nextQuestion(chatCtx)},{label:'💰 Anunciar imóvel',action:sell},{label:'📊 Avaliação / PTAM',action:valuation},{label:'⚖️ Perícia / assistência',action:expert}]);return}
  if(!ctx.region){add('Perfeito. Em qual região você procura? Pode digitar uma cidade ou bairro.');buttons([{label:'Lauro de Freitas',action:()=>mergeCtx({region:'Lauro de Freitas'})&&nextQuestion(chatCtx)},{label:'Vilas do Atlântico',action:()=>mergeCtx({region:'Vilas do Atlântico'})&&nextQuestion(chatCtx)},{label:'Camaçari',action:()=>mergeCtx({region:'Camaçari'})&&nextQuestion(chatCtx)},{label:'Salvador',action:()=>mergeCtx({region:'Salvador'})&&nextQuestion(chatCtx)}]);return}
  if(!ctx.propertyType){add('Que tipo de imóvel você procura?');buttons([{label:'🏠 Casa',action:()=>mergeCtx({propertyType:'Casa'})&&nextQuestion(chatCtx)},{label:'🏢 Apartamento',action:()=>mergeCtx({propertyType:'Apartamento'})&&nextQuestion(chatCtx)},{label:'🌳 Terreno',action:()=>mergeCtx({propertyType:'Terreno'})&&nextQuestion(chatCtx)},{label:'🏬 Comercial',action:()=>mergeCtx({propertyType:'Comercial'})&&nextQuestion(chatCtx)},{label:'🔎 Outro / indiferente',action:()=>mergeCtx({propertyType:'Outro / indiferente'})&&nextQuestion(chatCtx)}]);return}
  if(ctx.bedrooms===null){add('Quantos quartos você gostaria de ter?');buttons([{label:'1 quarto',action:()=>mergeCtx({bedrooms:1})&&nextQuestion(chatCtx)},{label:'2 quartos',action:()=>mergeCtx({bedrooms:2})&&nextQuestion(chatCtx)},{label:'3 quartos',action:()=>mergeCtx({bedrooms:3})&&nextQuestion(chatCtx)},{label:'4+ quartos',action:()=>mergeCtx({bedrooms:4})&&nextQuestion(chatCtx)},{label:'Não é importante',action:()=>mergeCtx({bedrooms:0})&&nextQuestion(chatCtx)}]);return}
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
  if(!meaningful){add('Entendi. 😊 Pode me dizer, por exemplo: “quero comprar uma casa de 3 quartos em Vilas até R$ 1 milhão”.');buttons([{label:'🔎 Encontrar imóvel',action:()=>{resetCtx();buy()}},{label:'🔑 Alugar',action:()=>{resetCtx();rent()}},{label:'📊 Avaliação / PTAM',action:valuation},{label:'💬 Falar com Fabio',action:contact}]);return}
  const parts=[]; if(chatCtx.interest)parts.push(chatCtx.interest.toLowerCase());if(chatCtx.propertyType)parts.push(chatCtx.propertyType.toLowerCase());if(chatCtx.region)parts.push(`em ${chatCtx.region}`);if(chatCtx.bedrooms)parts.push(`${chatCtx.bedrooms}+ quartos`);if(chatCtx.budgetLabel)parts.push(chatCtx.budgetLabel);
  add(`Perfeito! Entendi ${parts.length?'que você procura '+parts.join(', ')+'.':'sua necessidade.'} Vou usar essas informações e pedir só o que estiver faltando. 😊`);setTimeout(()=>nextQuestion(chatCtx),120);
};
const propertyInterest=(p)=>{
  if(!p) return;
  const interest = p.type==='aluguel' ? 'Aluguel' : 'Compra';
  const ctx={interest,type:p.type||'venda',region:p.location||'',propertyType:p.meta?.[0]||'',bedrooms:Number(p.bedrooms||0),budgetLabel:p.price_label||'',propertyId:p.id,timeframe:null,propertyTitle:p.title,propertyLocation:p.location,propertyPrice:p.price_label||''};
  resetCtx();
  mergeCtx(ctx);
  panel.classList.add('open'); panel.setAttribute('aria-hidden','false');
  add(`Você está falando com a AELO sobre <strong>${esc(p.title)}</strong>. Como posso ajudar? 😊`,'bot',true);
  buttons([
    {label:'📋 Quero mais informações',action:()=>collectLead(interest,ctx)},
    {label:'📅 Quero agendar uma visita',action:()=>collectLead('Agendamento de visita',{...ctx,timeframe:'Solicitação de visita'})},
    {label:'📸 Ver fotos novamente',action:()=>{shut();openModal(p.id)}},
    {label:'📍 Quero saber sobre a localização',action:()=>{add(`Este imóvel está localizado em <strong>${esc(p.location||'localização informada no anúncio')}</strong>.`,'bot',true);buttons([{label:'📋 Tenho interesse',action:()=>collectLead(interest,ctx)},{label:'📅 Agendar visita',action:()=>collectLead('Agendamento de visita',{...ctx,timeframe:'Solicitação de visita'})},{label:'↩️ Voltar',action:()=>propertyInterest(p)}])}},
    {label:'💬 Continuar pelo WhatsApp',action:()=>wa(`Olá! Falei com o Assistente AELO pelo site e tenho interesse no imóvel ${p.title}${p.location?` em ${p.location}`:''}${p.price_label?` — ${p.price_label}`:''}. Como posso receber mais informações?`)}
  ]);
};
window.aeloStartPropertyInterest=propertyInterest;
launcher.onclick=open;close.onclick=shut;
})();

