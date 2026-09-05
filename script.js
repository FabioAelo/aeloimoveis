const tabs=[...document.querySelectorAll('.tabs button')];
tabs.forEach(btn=>btn.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));btn.classList.add('active');}));
document.getElementById('searchBtn').addEventListener('click',()=>{
 const loc=document.getElementById('location').value.trim();
 const type=document.getElementById('type').value;
 const purpose=document.querySelector('.tabs .active').dataset.purpose;
 document.getElementById('searchMsg').textContent=loc ? `Busca preparada: ${purpose} • ${type} • ${loc}.` : `Escolha localização, tipo e finalidade para iniciar a busca.`;
});