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
        <span class="badge">${p.badge}</span>
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

function showGalleryImage() {
  const img = document.getElementById("modal-image");
  const counter = document.getElementById("gallery-counter");
  if (!currentGallery.length) return;
  img.src = currentGallery[currentGalleryIndex];
  img.alt = document.getElementById("modal-title").textContent;
  counter.textContent = currentGallery.length > 1 ? `${currentGalleryIndex + 1} / ${currentGallery.length}` : "";
  document.querySelector(".gallery-prev").classList.toggle("hidden", currentGallery.length <= 1);
  document.querySelector(".gallery-next").classList.toggle("hidden", currentGallery.length <= 1);
}

function openModal(id) {
  const p = properties.find(item => String(item.id) === String(id));
  if (!p) return;
  currentGallery = p.gallery_urls?.length ? p.gallery_urls : [p.image_url];
  currentGalleryIndex = 0;
  document.getElementById("modal-type").textContent = p.badge + (dataSource === "demo" ? " • DEMONSTRATIVO" : "");
  document.getElementById("modal-title").textContent = p.title;
  document.getElementById("modal-location").textContent = p.location;
  document.getElementById("modal-meta").innerHTML = p.meta.join(" • ");
  document.getElementById("modal-description").textContent = p.description || "Entre em contato com a Aelo para mais informações.";
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


/* V24 — Assistente AELO: atendimento guiado e busca no catálogo */
(function initAeloAssistant(){
const launcher=document.getElementById('aelo-chat-launcher'),panel=document.getElementById('aelo-chat'),close=document.getElementById('aelo-chat-close'),messages=document.getElementById('aelo-chat-messages'),quick=document.getElementById('aelo-chat-quick'),form=document.getElementById('aelo-chat-form'),input=document.getElementById('aelo-chat-input'); if(!launcher||!panel)return; let started=false;
const add=(text,who='bot',html=false)=>{const e=document.createElement('div');e.className='aelo-chat-msg '+who;html?e.innerHTML=text:e.textContent=text;messages.appendChild(e);messages.scrollTop=messages.scrollHeight};
const buttons=items=>{quick.innerHTML='';items.forEach(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.label;b.onclick=()=>{add(x.label,'user');x.action()};quick.appendChild(b)})};
const open=()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false');if(!started){started=true;add('Olá! Sou o Assistente AELO. 👋\nPosso ajudar você a encontrar um imóvel, anunciar sua propriedade ou solicitar uma avaliação imobiliária. Como posso ajudar?');main()}input.focus()}; const shut=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
const main=()=>buttons([{label:'🔎 Encontrar imóvel',action:buy},{label:'🔑 Alugar imóvel',action:rent},{label:'💰 Anunciar imóvel',action:sell},{label:'📊 Avaliação / PTAM',action:valuation},{label:'⚖️ Perícia / assistência',action:expert},{label:'📱 Falar com Fabio',action:contact}]);
const buy=()=>{add('Ótimo. Posso procurar imóveis disponíveis no catálogo AELO. Qual faixa de valor você procura?');buttons([{label:'Até R$ 500 mil',action:()=>search('venda',p=>p<=500000,'até R$ 500 mil')},{label:'R$ 500 mil a R$ 1 milhão',action:()=>search('venda',p=>p>=500000&&p<=1000000,'R$ 500 mil a R$ 1 milhão')},{label:'Acima de R$ 1 milhão',action:()=>search('venda',p=>p>=1000000,'acima de R$ 1 milhão')},{label:'Escolher região',action:()=>region('venda')}])};
const rent=()=>{add('Perfeito. Vamos procurar imóveis para aluguel. Qual valor mensal máximo?');buttons([{label:'Até R$ 3 mil',action:()=>search('aluguel',p=>p<=3000,'até R$ 3 mil/mês')},{label:'R$ 3 mil a R$ 6 mil',action:()=>search('aluguel',p=>p>=3000&&p<=6000,'R$ 3 mil a R$ 6 mil/mês')},{label:'Acima de R$ 6 mil',action:()=>search('aluguel',p=>p>=6000,'acima de R$ 6 mil/mês')},{label:'Escolher região',action:()=>region('aluguel')}])};
const sell=()=>{add('Posso encaminhar seu interesse diretamente ao Fabio.');buttons([{label:'📱 Abrir WhatsApp',action:()=>wa('Olá, Fabio! Gostaria de anunciar meu imóvel para venda.')}])};
const valuation=()=>{add('O serviço de Corretor Avaliador inclui PTAM e análise de mercado. Para solicitar uma avaliação, informe a localização do imóvel e o objetivo da avaliação.');buttons([{label:'📱 Solicitar avaliação',action:()=>wa('Olá, Fabio! Gostaria de solicitar uma avaliação imobiliária / PTAM.')}])};
const expert=()=>{add('A atuação inclui Perícia Judicial e Assistência Técnica em avaliações imobiliárias.');buttons([{label:'📱 Falar com Fabio',action:()=>wa('Olá, Fabio! Gostaria de informações sobre Perícia Judicial ou Assistência Técnica em avaliação imobiliária.')}])};
const contact=()=>{add('Claro. O contato profissional é pelo WhatsApp ou pelo e-mail fabio.aelo@creci.org.br.');buttons([{label:'📱 WhatsApp',action:()=>wa('Olá, Fabio! Vim pelo site AELO e gostaria de falar com você.')},{label:'✉️ Enviar e-mail',action:()=>location.href='mailto:fabio.aelo@creci.org.br'}])};
const region=type=>{add('Qual região você procura?');buttons([{label:'Lauro de Freitas',action:()=>searchRegion(type,'lauro de freitas')},{label:'Camaçari',action:()=>searchRegion(type,'camaçari')},{label:'Salvador',action:()=>searchRegion(type,'salvador')}])};
const search=(type,pred,label)=>show(properties.filter(p=>p.type===type&&pred(Number(p.price||0))),label); const searchRegion=(type,term)=>show(properties.filter(p=>p.type===type&&String(p.location||'').toLowerCase().includes(term)),term);
const show=(list,label)=>{if(!list.length){add(`Não encontrei imóveis publicados no catálogo para “${label}”. Posso encaminhar você ao Fabio para receber outras opções.`);buttons([{label:'📱 Falar com Fabio',action:()=>wa('Olá, Fabio! Vim pelo Assistente AELO e gostaria de receber opções de imóveis.')},{label:'↩️ Voltar',action:main}]);return} add(`Encontrei ${list.length} opção(ões) para “${label}”. Veja abaixo:`);list.slice(0,4).forEach(p=>{add(`<div class="aelo-chat-property"><img src="${esc(p.image_url||'logo.png')}" alt="${esc(p.title)}"><strong>${esc(p.title)}</strong><small>${esc(p.location||'')}<br>${esc(p.meta.join(' • '))}</small><b>${esc(p.price_label||'')}</b><br><a href="#imoveis" data-prop-id="${esc(p.id)}">Ver imóvel →</a></div>`,'bot',true)});document.querySelectorAll('[data-prop-id]').forEach(a=>a.onclick=e=>{e.preventDefault();shut();openModal(a.dataset.propId)});buttons([{label:'📱 Tenho interesse',action:()=>wa('Olá, Fabio! Vi um imóvel no site AELO e gostaria de receber mais informações.')},{label:'↩️ Nova busca',action:main}])};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const wa=m=>window.open('https://wa.me/5571992961212?text='+encodeURIComponent(m),'_blank');
const text=t=>{t=t.toLowerCase().trim();if(/compr|casa|apartamento/.test(t))return buy();if(/alug|loca/.test(t))return rent();if(/vender|anunciar/.test(t))return sell();if(/avali|ptam/.test(t))return valuation();if(/per[ií]cia|assist[êe]ncia/.test(t))return expert();if(/whatsapp|falar|contato/.test(t))return contact();const r=['lauro de freitas','camaçari','camacari','salvador'].find(x=>t.includes(x));if(r)return searchRegion(/alug|loca/.test(t)?'aluguel':'venda',r);add('Posso ajudar com compra, aluguel, venda, avaliação/PTAM ou perícia/assistência técnica. Escolha uma opção abaixo ou escreva sua necessidade.');main()};
launcher.onclick=open;close.onclick=shut;form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(!t)return;add(t,'user');input.value='';setTimeout(()=>text(t),150)};
})();
