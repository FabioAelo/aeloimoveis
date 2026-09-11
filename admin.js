const cfg = window.AELO_SUPABASE_CONFIG || {};
const ready = window.supabase && cfg.url && cfg.anonKey && !String(cfg.url).startsWith("COLE_AQUI");
const client = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
const $ = id => document.getElementById(id);

if (!ready) {
  $("setupWarning").classList.remove("hidden");
  $("setupWarning").innerHTML = "<strong>Banco ainda não conectado.</strong><br>Abra <code>supabase-config.js</code> e informe a URL e a chave ANON/PUBLISHABLE do seu projeto Supabase. Depois execute o arquivo <code>database.sql</code> no SQL Editor do Supabase.";
  $("loginCard").classList.add("hidden");
}

async function refresh() {
  const { data, error } = await client.from("properties").select("*").order("created_at", { ascending:false });
  if (error) return showMsg("saveMsg", error.message);
  $("propertyList").innerHTML = data.length ? data.map(p => `
    <article class="admin-row">
      <img src="${p.image_url || 'logo.png'}" alt="">
      <div><h3>${p.title}</h3><p>${p.location} • ${p.type} • ${p.is_published ? 'Publicado' : 'Rascunho'}</p><p>${p.price_label || Number(p.price||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p></div>
      <div class="row-actions"><button class="ghost" onclick="editProperty('${p.id}')">Editar</button><button class="ghost danger" onclick="deleteProperty('${p.id}')">Excluir</button></div>
    </article>`).join("") : `<div class="card"><p>Nenhum imóvel cadastrado ainda. Clique em “+ Novo imóvel”.</p></div>`;
}


let allLeads = [];
let allInteractions = [];

const STATUS_META = {
  novo:{label:'Novo',icon:'🟡'}, atendimento:{label:'Em atendimento',icon:'🔵'}, visita:{label:'Visita agendada',icon:'🟢'}, proposta:{label:'Proposta',icon:'🟣'}, fechado:{label:'Negócio fechado',icon:'✅'}, sem_interesse:{label:'Sem interesse',icon:'⚫'}
};
function renderLeadDashboard(){
  const leads=allLeads;
  const counts={novo:0,atendimento:0,visita:0,proposta:0,fechado:0,sem_interesse:0};
  leads.forEach(l=>{const k=l.status||'novo'; if(counts[k]!==undefined) counts[k]++});
  const stats=document.getElementById('leadStats');
  if(stats) stats.innerHTML=`<div class="stat-total"><b>${leads.length}</b><span>Total</span></div><div><b>${counts.novo}</b><span>Novos</span></div><div><b>${counts.atendimento}</b><span>Em atendimento</span></div><div><b>${counts.visita}</b><span>Visitas</span></div><div><b>${counts.proposta}</b><span>Propostas</span></div><div><b>${counts.fechado}</b><span>Fechados</span></div>`;
  const conversion=leads.length?Math.round((counts.fechado/leads.length)*100):0;
  const conv=document.getElementById('leadConversion'); if(conv) conv.textContent=`${conversion}% de conversão`;
  const funnel=document.getElementById('leadFunnel');
  if(funnel){const max=Math.max(leads.length,1); funnel.innerHTML=['novo','atendimento','visita','proposta','fechado'].map(k=>{const m=STATUS_META[k]; const n=counts[k]; const pct=Math.max(n?Math.round((n/max)*100):0, n?8:0); return `<div class="funnel-row"><div class="funnel-label"><span>${m.icon} ${m.label}</span><b>${n}</b></div><div class="funnel-track"><i style="width:${pct}%"></i></div></div>`}).join('');}
  applyLeadFilters();
}
function applyLeadFilters(){
  const search=(document.getElementById('leadSearch')?.value||'').trim().toLowerCase();
  const sf=document.getElementById('leadStatusFilter')?.value||'todos';
  const inf=document.getElementById('leadInterestFilter')?.value||'todos';
  const filtered=allLeads.filter(l=>{
    const hay=[l.name,l.whatsapp,l.region,l.message,l.budget,l.interest].filter(Boolean).join(' ').toLowerCase();
    return (!search||hay.includes(search)) && (sf==='todos'||(l.status||'novo')===sf) && (inf==='todos'||String(l.interest||'').toLowerCase()===inf.toLowerCase());
  });
  const count=document.getElementById('leadResultCount'); if(count) count.textContent=`${filtered.length} ${filtered.length===1?'lead':'leads'}`;
  const box=document.getElementById('leadList'); if(!box) return;
  box.innerHTML=filtered.length ? filtered.map(l=>renderLeadCard(l)).join('') : `<div class="lead-empty">Nenhum lead corresponde aos filtros selecionados.</div>`;
}
function renderLeadCard(l){
  const dt=l.created_at?new Date(l.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
  const status=l.status||'novo'; const meta=STATUS_META[status]||STATUS_META.novo;
  const wa=String(l.whatsapp||'').replace(/\D/g,''); const waUrl=wa?`https://wa.me/55${wa}`:'#';
  const qual=[l.region&&`📍 ${l.region}`,l.budget&&`💰 ${l.budget}`,Number(l.bedrooms)>0&&`🛏️ ${l.bedrooms}+ quartos`].filter(Boolean).join(' • ');
  const follow=l.next_follow_up_at?new Date(l.next_follow_up_at):null;
  const now=new Date(); const dayNow=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let followClass='', followLabel='';
  if(follow){ const day=new Date(follow.getFullYear(),follow.getMonth(),follow.getDate()); const diff=Math.round((day-dayNow)/86400000); if(diff<0){followClass='overdue';followLabel='⚠️ Retorno atrasado'} else if(diff===0){followClass='today';followLabel='🔔 Retorno hoje'} else {followLabel=`🔔 Retorno ${follow.toLocaleDateString('pt-BR')}`;} }
  const interactions=allInteractions.filter(i=>i.lead_id===l.id).slice(0,5);
  const history=interactions.length?`<div class="interaction-history"><strong>Histórico recente</strong>${interactions.map(i=>`<div class="interaction-item"><time>${new Date(i.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time>${escapeHtml(i.note)}</div>`).join('')}</div>`:'';
  return `<article class="lead-admin status-${status}"><time>${dt}</time><div class="lead-main"><div><h3>${escapeHtml(l.name||'Sem nome')}</h3><p><strong>WhatsApp:</strong> ${escapeHtml(l.whatsapp||'—')} &nbsp; <strong>Interesse:</strong> ${escapeHtml(l.interest||'Atendimento')}</p>${qual?`<div class="lead-qual-summary">${escapeHtml(qual)}</div>`:''}<p><strong>Mensagem:</strong> ${escapeHtml(l.message||'—')}</p><p><strong>Origem:</strong> ${escapeHtml(l.source==='site-chatbot'?'Assistente AELO':(l.source||'Site'))}</p>${followLabel?`<span class="followup-status ${followClass}">${followLabel}</span>`:''}</div><span class="lead-interest">${meta.icon} ${meta.label}</span></div><div class="lead-tools"><label>Status<select id="status-${l.id}"><option value="novo" ${status==='novo'?'selected':''}>🟡 Novo</option><option value="atendimento" ${status==='atendimento'?'selected':''}>🔵 Em atendimento</option><option value="visita" ${status==='visita'?'selected':''}>🟢 Visita agendada</option><option value="proposta" ${status==='proposta'?'selected':''}>🟣 Proposta</option><option value="fechado" ${status==='fechado'?'selected':''}>✅ Negócio fechado</option><option value="sem_interesse" ${status==='sem_interesse'?'selected':''}>⚫ Sem interesse</option></select></label><div class="followup-box"><label>Próximo retorno<input id="follow-${l.id}" type="datetime-local" value="${follow?formatDateTimeLocal(follow):''}"></label><label>Registro deste contato<input id="interaction-${l.id}" type="text" placeholder="Ex.: Cliente pediu visita no sábado."></label></div><label>Observações<textarea id="notes-${l.id}" rows="3" placeholder="Registre aqui o andamento do atendimento...">${escapeHtml(l.notes||'')}</textarea></label>${history}<div class="lead-actions"><button class="primary" onclick="saveLead('${l.id}')">Salvar atualização</button>${wa?`<a class="ghost" target="_blank" rel="noopener" href="${waUrl}">📱 WhatsApp</a>`:''}<button class="ghost danger" onclick="deleteLead('${l.id}')">🗑️ Excluir lead</button></div></div></article>`;
}
function formatDateTimeLocal(d){ const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
async function refreshLeads(){
  const box=document.getElementById('leadList'); if(!box) return;
  const [leadRes, interactionRes] = await Promise.all([
    client.from('leads').select('*').order('created_at',{ascending:false}).limit(100),
    client.from('lead_interactions').select('*').order('created_at',{ascending:false}).limit(500)
  ]);
  if(leadRes.error){box.innerHTML=`<div class="lead-empty">Não foi possível carregar os leads: ${escapeHtml(leadRes.error.message)}</div>`; return;}
  allLeads=leadRes.data||[];
  allInteractions=interactionRes.error ? [] : (interactionRes.data||[]);
  renderLeadDashboard();
}
['leadSearch','leadStatusFilter','leadInterestFilter'].forEach(id=>{document.getElementById(id)?.addEventListener('input',applyLeadFilters);document.getElementById(id)?.addEventListener('change',applyLeadFilters)});

window.deleteLead = async id => {
  if (!confirm("Excluir este lead definitivamente? Esta ação não pode ser desfeita.")) return;
  const { error } = await client.from("leads").delete().eq("id", id);
  if (error) return alert("Não foi possível excluir o lead: " + error.message);
  await refreshLeads();
};
window.saveLead = async id => {
  const status = $("status-"+id)?.value || "novo";
  const notes = $("notes-"+id)?.value.trim() || null;
  const followRaw = $("follow-"+id)?.value || "";
  const next_follow_up_at = followRaw ? new Date(followRaw).toISOString() : null;
  const interactionNote = $("interaction-"+id)?.value.trim() || "";
  const { error } = await client.from("leads").update({status, notes, next_follow_up_at, last_contact_at: interactionNote ? new Date().toISOString() : (status!=='novo' ? new Date().toISOString() : null)}).eq("id", id);
  if (error) return alert(error.message);
  if(interactionNote){
    const {error: iError}=await client.from('lead_interactions').insert({lead_id:id,type:'contato',note:interactionNote});
    if(iError) return alert('Lead salvo, mas não foi possível registrar o histórico: '+iError.message);
  }
  await refreshLeads();
};
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}

async function start() {
  if (!client) return;
  const { data:{session} } = await client.auth.getSession();
  showSession(session);
  client.auth.onAuthStateChange((_event, session) => showSession(session));
}
function showSession(session) {
  if (session) { $("loginCard").classList.add("hidden"); $("dashboard").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden"); refresh(); refreshLeads(); }
  else { $("dashboard").classList.add("hidden"); $("editor").classList.add("hidden"); $("loginCard").classList.remove("hidden"); $("logoutBtn").classList.add("hidden"); }
}
function showMsg(id,text){$(id).textContent=text||""}

$("loginForm").addEventListener("submit", async e => { e.preventDefault(); showMsg("loginMsg","Entrando..."); const {error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value}); showMsg("loginMsg",error?error.message:""); });
$("logoutBtn").addEventListener("click",()=>client.auth.signOut());
$("newBtn").addEventListener("click",()=>openEditor());
$("cancelBtn").addEventListener("click",()=>$("editor").classList.add("hidden"));

function openEditor(p=null){
  $("editor").classList.remove("hidden"); $("dashboard").classList.add("hidden"); $("editorTitle").textContent=p?"Editar imóvel":"Novo imóvel"; $("propertyId").value=p?.id||"";
  $("title").value=p?.title||""; $("type").value=p?.type||"venda"; $("location").value=p?.location||""; $("price").value=p?.price||""; $("priceLabel").value=p?.price_label||""; $("bedrooms").value=p?.bedrooms||0; $("suites").value=p?.suites||0; $("parking").value=p?.parking||0; $("area").value=p?.area_m2||""; $("description").value=p?.description||""; $("published").checked=p?.is_published!==false; $("imageFile").value=""; const existingGallery=Array.isArray(p?.gallery_urls)?p.gallery_urls:(p?.image_url?[p.image_url]:[]); $("currentImage").textContent=existingGallery.length?`${existingGallery.length} foto(s) cadastrada(s). Escolha novas para substituir a galeria.`:""; $("propertyForm").dataset.imageUrl=p?.image_url||""; $("propertyForm").dataset.galleryUrls=JSON.stringify(existingGallery); window.scrollTo({top:0,behavior:"smooth"});
}
window.editProperty = async id => { const {data,error}=await client.from("properties").select("*").eq("id",id).single(); if(error) return alert(error.message); openEditor(data); };
window.deleteProperty = async id => { if(!confirm("Excluir este imóvel?")) return; const {error}=await client.from("properties").delete().eq("id",id); if(error) alert(error.message); else refresh(); };

async function uploadImages(files,userId){
  const selected=Array.from(files||[]);
  if(!selected.length){
    const existing=JSON.parse($("propertyForm").dataset.galleryUrls||"[]");
    return existing.length?existing:($("propertyForm").dataset.imageUrl?[ $("propertyForm").dataset.imageUrl ]:[]);
  }
  if(selected.length>10) throw new Error("Escolha no máximo 10 fotos por imóvel.");
  const urls=[];
  for(const file of selected){
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=`${userId}/${crypto.randomUUID()}.${ext}`;
    const {error}=await client.storage.from("property-images").upload(path,file,{upsert:false,contentType:file.type});
    if(error) throw error;
    const {data}=client.storage.from("property-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

$("propertyForm").addEventListener("submit",async e=>{
 e.preventDefault(); showMsg("saveMsg","Salvando...");
 const {data:{user}}=await client.auth.getUser(); if(!user){showMsg("saveMsg","Sessão expirada.");return;}
 try{
  const galleryUrls=await uploadImages($("imageFile").files,user.id);
  const imageUrl=galleryUrls[0] || null;
  const payload={owner_id:user.id,title:$("title").value.trim(),type:$("type").value,badge:$("type").value.toUpperCase(),location:$("location").value.trim(),price:Number($("price").value||0),price_label:$("priceLabel").value.trim()||null,bedrooms:Number($("bedrooms").value||0),suites:Number($("suites").value||0),parking:Number($("parking").value||0),area_m2:Number($("area").value||0)||null,image_url:imageUrl,description:$("description").value.trim(),gallery_urls:galleryUrls,is_published:$("published").checked};
  const id=$("propertyId").value; const result=id?await client.from("properties").update(payload).eq("id",id):await client.from("properties").insert(payload); if(result.error) throw result.error;
  $("editor").classList.add("hidden"); $("dashboard").classList.remove("hidden"); showMsg("saveMsg",""); refresh();
 }catch(err){showMsg("saveMsg",err.message)}
});
start();
