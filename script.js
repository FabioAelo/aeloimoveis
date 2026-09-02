const properties = [
  {type:'Apartamento', location:'Lauro de Freitas', price:'Consulte o valor', text:'Oportunidade selecionada pela Aelo Imóveis.'},
  {type:'Casa', location:'Lauro de Freitas', price:'Consulte o valor', text:'Imóvel para morar com conforto e praticidade.'},
  {type:'Terreno', location:'Região Metropolitana', price:'Consulte o valor', text:'Excelente oportunidade para investimento.'}
];

function renderProperties(list=properties){
  const grid=document.getElementById('propertyGrid');
  grid.innerHTML=list.map(p=>`
    <article class="property-card">
      <div class="property-image"></div>
      <div class="property-body">
        <h3>${p.type}</h3>
        <p>${p.location}</p>
        <p>${p.text}</p>
        <div class="property-price">${p.price}</div>
      </div>
    </article>`).join('');
}

function searchProperties(){
  const type=document.getElementById('type').value;
  const location=document.getElementById('location').value.toLowerCase().trim();
  let result=properties.filter(p=>
    (type==='Todos os imóveis'||p.type===type) &&
    (!location||p.location.toLowerCase().includes(location))
  );
  renderProperties(result.length?result:[]);
  if(!result.length) document.getElementById('propertyGrid').innerHTML='<p>Nenhum imóvel encontrado com esses filtros. Fale conosco pelo WhatsApp para receber outras oportunidades.</p>';
}

function sendLead(event){
  event.preventDefault();
  const name=document.getElementById('name').value;
  const phone=document.getElementById('phone').value;
  const interest=document.getElementById('interest').value;
  const message=document.getElementById('message').value;
  const text=`Olá, sou ${name}. Meu telefone é ${phone}. ${interest}. ${message}`;
  window.open(`https://wa.me/5571992961212?text=${encodeURIComponent(text)}`,'_blank');
}

document.getElementById('ownerForm').addEventListener('submit',function(event){
  event.preventDefault();
  const text=`Olá, sou ${ownerName.value}. WhatsApp: ${ownerPhone.value}. Quero ${ownerPurpose.value.toLowerCase()} meu imóvel. Tipo: ${ownerType.value}. Localização: ${ownerLocation.value}. Detalhes: ${ownerMsg.value}`;
  window.open(`https://wa.me/5571992961212?text=${encodeURIComponent(text)}`,'_blank');
});

document.querySelectorAll('.search-tabs button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.search-tabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });
});

renderProperties();
