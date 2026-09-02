const properties=[
 {type:"Apartamento",title:"Apartamento moderno",place:"Lauro de Freitas • BA",price:"R$ 485.000",beds:3,baths:2,area:"82 m²"},
 {type:"Casa",title:"Casa em condomínio",place:"Vilas do Atlântico • BA",price:"R$ 890.000",beds:4,baths:4,area:"180 m²"},
 {type:"Terreno",title:"Terreno para investimento",place:"Buraquinho • BA",price:"R$ 620.000",beds:"—",baths:"—",area:"300 m²"}
];
const grid=document.getElementById("propertyGrid");
function render(list=properties){
 grid.innerHTML=list.map(p=>`<article class="property"><div class="property-img"><span class="tag">${p.type}</span></div><div class="property-body"><h3>${p.title}</h3><p>📍 ${p.place}</p><div class="features"><span>🛏 ${p.beds}</span><span>🚿 ${p.baths}</span><span>▣ ${p.area}</span></div><div class="price">${p.price}</div></div></article>`).join("");
}
function searchProperties(){
 const loc=document.getElementById("location").value.toLowerCase();
 const type=document.getElementById("type").value;
 const result=properties.filter(p=>(!loc||p.place.toLowerCase().includes(loc))&&(type==="Todos os imóveis"||p.type===type));
 render(result);
 document.getElementById("imoveis").scrollIntoView({behavior:"smooth"});
}
document.querySelectorAll(".search-tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".search-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active")});
function sendLead(e){
 e.preventDefault();
 const name=document.getElementById("name").value;
 const phone=document.getElementById("phone").value;
 const interest=document.getElementById("interest").value;
 const msg=document.getElementById("message").value;
 const text=`Olá, sou ${name}. Meu telefone é ${phone}. ${interest}. ${msg}`;
 window.open("https://wa.me/5571999999999?text="+encodeURIComponent(text),"_blank");
}
render();

// Aelo Imóveis 2.0 premium search + owner lead capture
const AELO_WHATSAPP="5571999999999"; // TROQUE pelo WhatsApp comercial real.
let aeloMode="Venda";
document.querySelectorAll(".search-tabs button").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".search-tabs button").forEach(x=>x.classList.remove("active")); b.classList.add("active"); aeloMode=b.dataset.mode;
});
document.getElementById("pSearch").onclick=()=>{
 const type=document.getElementById("pType").value.toLowerCase();
 const loc=document.getElementById("pLocation").value.toLowerCase();
 const max=Number(document.getElementById("pPrice").value||Infinity);
 const cards=[...document.querySelectorAll(".property-card")];
 let n=0;
 cards.forEach(c=>{
   const text=c.innerText.toLowerCase();
   const price=(c.innerText.match(/r\$\s*[\d\.\,]+/i)||[""])[0];
   const num=Number(price.replace(/[^\d]/g,""))||0;
   const ok=(!type||text.includes(type))&&(!loc||text.includes(loc))&&(!document.getElementById("pPrice").value||num<=max);
   c.style.display=ok?"":"none"; if(ok)n++;
 });
 document.getElementById("pResult").textContent=n+" oportunidade(s) visível(is) no catálogo.";
 document.getElementById("imoveis").scrollIntoView({behavior:"smooth"});
};
document.getElementById("ownerForm").onsubmit=e=>{
 e.preventDefault();
 const q=`Olá, Aelo Imóveis! Quero anunciar meu imóvel.%0ANome: ${encodeURIComponent(ownerName.value)}%0AWhatsApp: ${encodeURIComponent(ownerPhone.value)}%0ATipo: ${encodeURIComponent(ownerType.value)}%0ALocalização: ${encodeURIComponent(ownerLocation.value)}%0AObjetivo: ${encodeURIComponent(ownerPurpose.value)}%0ADetalhes: ${encodeURIComponent(ownerMsg.value)}`;
 window.open(`https://wa.me/${AELO_WHATSAPP}?text=${q}`,"_blank");
};
