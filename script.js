const DEMO_PROPERTIES = [
  { id: "demo-1", type: "venda", badge: "VENDA", title: "Casa Áurea", location: "Alphaville • Salvador, BA", price_label: "R$ 2.480.000", meta: ["4 quartos", "4 suítes", "420 m²"], image_url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85", description: "Imóvel demonstrativo. Arquitetura contemporânea, integração entre ambientes e área externa generosa." },
  { id: "demo-2", type: "venda", badge: "VENDA", title: "Apartamento Vista Mar", location: "Ondina • Salvador, BA", price_label: "R$ 1.180.000", meta: ["3 quartos", "2 suítes", "138 m²"], image_url: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=85", description: "Exemplo demonstrativo de apartamento premium com varanda ampla, vista aberta e localização estratégica." },
  { id: "demo-3", type: "aluguel", badge: "ALUGUEL", title: "Casa Jardim Atlântico", location: "Vilão do Atlântico • Lauro de Freitas, BA", price_label: "R$ 9.800/mês", meta: ["4 quartos", "3 suítes", "310 m²"], image_url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85", description: "Exemplo demonstrativo de locação residencial de alto padrão, com jardim, piscina e ambientes integrados." },
  { id: "demo-4", type: "investimento", badge: "INVESTIMENTO", title: "Pátio Empresarial", location: "Paralela • Salvador, BA", price_label: "R$ 3.950.000", meta: ["12 salas", "8 vagas", "680 m²"], image_url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85", description: "Ativo comercial demonstrativo para a categoria de investimentos e oportunidades patrimoniais." },
  { id: "demo-5", type: "venda", badge: "VENDA", title: "Villa Serena", location: "Praia do Forte • Mata de São João, BA", price_label: "R$ 4.750.000", meta: ["5 quartos", "5 suítes", "510 m²"], image_url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85", description: "Casa demonstrativa de inspiração tropical contemporânea, pensada para representar o segmento de alto padrão." },
  { id: "demo-6", type: "aluguel", badge: "ALUGUEL", title: "Loft Alameda", location: "Caminho das Árvores • Salvador, BA", price_label: "R$ 5.900/mês", meta: ["2 quartos", "1 suíte", "96 m²"], image_url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85", description: "Exemplo demonstrativo de imóvel compacto e sofisticado para locação." }
];

const grid = document.getElementById("property-grid");
const modal = document.getElementById("property-modal");
let properties = [];
let dataSource = "demo";

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
    dataSource = "supabase";
    const note = document.getElementById("catalog-note");
    if (note) note.innerHTML = "Catálogo atualizado pela equipe Aelo através do painel administrativo.";
    renderProperties(document.querySelector(".filter.active")?.dataset.filter || "todos");
  } else {
    console.warn("Supabase não conectado; exibindo catálogo demonstrativo.", error);
  }
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
  currentGallery = p.gallery_urls?.length ? p.gallery_urls : [p.image_url];
  currentGalleryIndex = 0;
  document.getElementById("modal-type").textContent = p.badge + (p.commercial_status==='vendido' ? (p.sold_by==='terceiro' ? " • VENDIDO POR TERCEIRO" : " • VENDIDO PELA AELO") : "") + (dataSource === "demo" ? " • DEMONSTRATIVO" : "");
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
if (modalInterest) modalInterest.addEventListener("click", () => { closeModal(); });
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

properties = DEMO_PROPERTIES.map(normalizeProperty);
renderProperties();
loadProperties();


/* V32.1 — Assistente AELO: qualificação na ordem região > tipo > quartos > valor > prazo */
(function initAeloAssistant(){
const launcher=document.getElementById('aelo-chat-launcher'),panel=document.getElementById('aelo-chat'),close=document.getElementById('aelo-chat-close'),messages=document.getElementById('aelo-chat-messages'),quick=document.getElementById('aelo-chat-quick'),form=document.getElementById('aelo-chat-form'),input=document.getElementById('aelo-chat-input'); if(!launcher||!panel)return; let started=false;
const add=(text,who='bot',html=false)=>{const e=document.createElement('div');e.className='aelo-chat-msg '+who;html?e.innerHTML=text:e.textContent=text;messages.appendChild(e);messages.scrollTop=messages.scrollHeight};
const buttons=items=>{quick.innerHTML='';items.forEach(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.label;b.onclick=()=>{add(x.label,'user');x.action()};quick.appendChild(b)})};
const open=()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false');if(!started){started=true;add('Olá! Sou o Assistente AELO. 👋\nPosso ajudar você a encontrar um imóvel, anunciar sua propriedade ou solicitar uma avaliação imobiliária. Como posso ajudar?');main()}input.focus()};
const shut=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
const main=()=>buttons([{label:'🔎 Encontrar imóvel',action:buy},{label:'🔑 Alugar imóvel',action:rent},{label:'💰 Anunciar imóvel',action:sell},{label:'📊 Avaliação / PTAM',action:valuation},{label:'⚖️ Perícia / assistência',action:expert},{label:'📱 Falar com Fabio',action:contact}]);
const buy=()=>{add('Ótimo. Vamos qualificar seu perfil em poucos passos. Em qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Lauro de Freitas'})},{label:'Camaçari',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Camaçari'})},{label:'Salvador',action:()=>propertyTypeStep({interest:'Compra',type:'venda',region:'Salvador'})},{label:'Outra região',action:()=>freeRegionStep({interest:'Compra',type:'venda'})}])};
const rent=()=>{add('Perfeito. Vamos qualificar seu perfil em poucos passos. Em qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Lauro de Freitas'})},{label:'Camaçari',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Camaçari'})},{label:'Salvador',action:()=>propertyTypeStep({interest:'Aluguel',type:'aluguel',region:'Salvador'})},{label:'Outra região',action:()=>freeRegionStep({interest:'Aluguel',type:'aluguel'})}])};
const freeRegionStep=(ctx)=>{add('Digite a região que você procura no campo abaixo.');input.placeholder='Ex.: Vilas do Atlântico';buttons([{label:'Continuar',action:()=>{const region=(input.value||'').trim();input.value='';input.placeholder='Digite sua mensagem...';propertyTypeStep({...ctx,region:region||'Não informada'})}}])};
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
const text=t=>{t=t.toLowerCase().trim();if(/compr|casa|apartamento/.test(t))return buy();if(/alug|loca/.test(t))return rent();if(/vender|anunciar/.test(t))return sell();if(/avali|ptam/.test(t))return valuation();if(/per[ií]cia|assist[êe]ncia/.test(t))return expert();if(/whatsapp|falar|contato/.test(t))return contact();const r=['lauro de freitas','camaçari','camacari','salvador'].find(x=>t.includes(x));if(r)return searchRegion(/alug|loca/.test(t)?'aluguel':'venda',r,/alug|loca/.test(t)?'Aluguel':'Compra');add('Posso ajudar com compra, aluguel, venda, avaliação/PTAM ou perícia/assistência técnica. Escolha uma opção abaixo ou escreva sua necessidade.');main()};
launcher.onclick=open;close.onclick=shut;form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(!t)return;add(t,'user');input.value='';setTimeout(()=>text(t),150)};
})();

// V48.7 — apresentação cinematográfica a partir das fotos cadastradas
const filmOverlay = document.getElementById('film-overlay');
const filmImage = document.getElementById('film-image');
const filmTitle = document.getElementById('film-title');
const filmType = document.getElementById('film-type');
const filmLocation = document.getElementById('film-location');
const filmMeta = document.getElementById('film-meta');
const filmStatus = document.getElementById('film-status');
const filmProgress = document.getElementById('film-progress-bar');
const filmPlay = document.getElementById('film-play');
const filmGenerate = document.getElementById('film-generate');
let filmProperty = null, filmIndex = 0, filmTimer = null, filmPlaying = false;

function filmRender(){
  if(!filmProperty || !filmProperty.gallery_urls?.length) return;
  const total=filmProperty.gallery_urls.length;
  filmImage.src=filmProperty.gallery_urls[filmIndex];
  filmImage.alt=filmProperty.title || 'Imóvel';
  filmTitle.textContent=filmProperty.title || '';
  filmType.textContent=filmProperty.badge || '';
  filmLocation.textContent=filmProperty.location || '';
  filmMeta.textContent=[filmProperty.price_label,...(filmProperty.meta||[])].filter(Boolean).join(' • ');
  filmProgress.style.width=`${((filmIndex+1)/total)*100}%`;
}
function filmStop(){
  clearInterval(filmTimer); filmTimer=null; filmPlaying=false;
  if(filmPlay) filmPlay.textContent='▶ Reproduzir';
}
function filmStart(){
  if(!filmProperty || filmProperty.gallery_urls.length<1) return;
  filmStop(); filmPlaying=true; filmPlay.textContent='❚❚ Pausar';
  filmTimer=setInterval(()=>{filmIndex=(filmIndex+1)%filmProperty.gallery_urls.length;filmRender();},3500);
}
function openFilm(){
  const p=properties.find(item=>String(item.id)===String(document.getElementById('property-modal')?.dataset?.currentId));
  filmProperty=p||filmProperty;
  if(!filmProperty) return;
  filmIndex=0; filmRender(); filmOverlay.classList.add('open'); filmOverlay.setAttribute('aria-hidden','false'); filmStop();
}
function closeFilm(){filmStop();filmOverlay.classList.remove('open');filmOverlay.setAttribute('aria-hidden','true');}

// Mantém a referência do imóvel atualmente aberto.
const _openModalOriginal=openModal;
openModal=function(id){
  const p=properties.find(item=>String(item.id)===String(id));
  if(p){modal.dataset.currentId=p.id;filmProperty=p;}
  return _openModalOriginal(id);
};

const filmBtn=document.getElementById('modal-film-btn');
if(filmBtn) filmBtn.addEventListener('click',openFilm);
document.getElementById('film-close')?.addEventListener('click',closeFilm);
document.getElementById('film-prev')?.addEventListener('click',()=>{if(!filmProperty)return;filmStop();filmIndex=(filmIndex-1+filmProperty.gallery_urls.length)%filmProperty.gallery_urls.length;filmRender();});
document.getElementById('film-next')?.addEventListener('click',()=>{if(!filmProperty)return;filmStop();filmIndex=(filmIndex+1)%filmProperty.gallery_urls.length;filmRender();});
filmPlay?.addEventListener('click',()=>filmPlaying?filmStop():filmStart());
filmOverlay?.addEventListener('click',e=>{if(e.target===filmOverlay)closeFilm();});

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&filmOverlay?.classList.contains('open'))closeFilm();});

async function loadFilmImage(src){
  return await new Promise((resolve,reject)=>{
    const im=new Image(); im.crossOrigin='anonymous';
    im.onload=()=>resolve(im); im.onerror=()=>reject(new Error('Não foi possível carregar uma foto para o vídeo.'));
    im.src=src;
  });
}
async function drawFilmFrame(ctx,canvas,img,p,index,total,pauseMs){
  ctx.fillStyle='#0b1017';ctx.fillRect(0,0,canvas.width,canvas.height);
  const scale=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale,x=(canvas.width-w)/2,y=(canvas.height-h)/2;
  ctx.drawImage(img,x,y,w,h);
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(0,canvas.height-120,canvas.width,120);
  ctx.fillStyle='#d99a17';ctx.font='700 20px Arial';ctx.fillText((p.badge||'').toUpperCase(),42,canvas.height-82);
  ctx.fillStyle='#fff';ctx.font='700 42px Georgia';ctx.fillText(p.title||'',42,canvas.height-38);
  ctx.font='20px Arial';ctx.fillText(`${p.location||''}  •  ${p.price_label||''}`,42,canvas.height-8);
  try{
    const wm=await loadFilmImage('aelo-watermark-exact-transparent.png');
    const mw=92, mh=mw*(wm.naturalHeight/wm.naturalWidth);
    ctx.globalAlpha=.62; ctx.drawImage(wm,canvas.width-mw-38,canvas.height-mh-34,mw,mh); ctx.globalAlpha=1;
  }catch(e){}
}

async function generateFilmVideo(){
  if(!filmProperty || !filmProperty.gallery_urls?.length){return;}
  if(!window.MediaRecorder){filmStatus.textContent='Seu navegador não oferece geração de vídeo.';return;}
  filmGenerate.disabled=true; filmPlay.disabled=true; filmStatus.textContent='Preparando vídeo...';
  try{
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const ctx=canvas.getContext('2d');
    const stream=canvas.captureStream(30);
    const chunks=[]; const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':(MediaRecorder.isTypeSupported('video/webm')?'video/webm':'');
    const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const done=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=reject});
    rec.start();
    for(let i=0;i<filmProperty.gallery_urls.length;i++){
      filmStatus.textContent=`Gerando vídeo: foto ${i+1} de ${filmProperty.gallery_urls.length}...`;
      const im=await loadFilmImage(filmProperty.gallery_urls[i]);
      await drawFilmFrame(ctx,canvas,im,filmProperty,i,filmProperty.gallery_urls.length,3500);
      await new Promise(r=>setTimeout(r,3200));
    }
    rec.stop(); await done; stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:'video/webm'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`${(filmProperty.title||'imovel').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-aelo.webm`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);filmStatus.textContent='Vídeo gerado em WebM. Verifique a pasta de downloads.';
  }catch(err){console.error(err);filmStatus.textContent='Não foi possível gerar o vídeo. A apresentação continua disponível.';}
  finally{filmGenerate.disabled=false;filmPlay.disabled=false;}
}
filmGenerate?.addEventListener('click',generateFilmVideo);
