// V39 — Conclusão de retornos e follow-up
const cfg = window.AELO_SUPABASE_CONFIG || {};
const ready = window.supabase && cfg.url && cfg.anonKey && !String(cfg.url).startsWith("COLE_AQUI");
const client = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
const $ = id => document.getElementById(id);

if (!ready) {
  $("setupWarning").classList.remove("hidden");
  $("setupWarning").innerHTML = "<strong>Banco ainda não conectado.</strong><br>Abra <code>supabase-config.js</code> e informe a URL e a chave ANON/PUBLISHABLE do seu projeto Supabase. Depois execute o arquivo <code>database.sql</code> no SQL Editor do Supabase.";
  $("loginCard").classList.add("hidden");
}

function commercialLabel(p){
  const s=p.commercial_status||'disponivel';
  if(s==='vendido') return p.sold_by==='parceiro' ? `🔵 Vendido por corretor parceiro${p.partner_name ? ' — '+p.partner_name : ''}` : '🏆 Vendido pela AELO';
  if(s==='negociacao') return '🟡 Em negociação';
  if(s==='indisponivel') return '⚫ Indisponível';
  return '🟢 Disponível';
}
function syncSoldFields(){
  const sold=$('commercialStatus')?.value==='vendido';
  const partner=sold && $('soldBy')?.value==='parceiro';
  $('soldByWrap')?.classList.toggle('hidden',!sold);
  $('partnerNameWrap')?.classList.toggle('hidden',!partner);
  $('partnerCreciWrap')?.classList.toggle('hidden',!partner);
}
async function refresh() {
  const { data, error } = await client.from("properties").select("*").order("created_at", { ascending:false });
  if (error) return showMsg("saveMsg", error.message);
  $("propertyList").innerHTML = data.length ? data.map(p => `
    <article class="admin-row">
      <img src="${p.image_url || 'logo.png'}" alt="">
      <div><h3>${p.title}</h3><p>${p.location} • ${p.type} • ${p.is_published ? 'Publicado' : 'Rascunho'}</p><p>${commercialLabel(p)}${p.price_label ? ' • '+p.price_label : ''}</p></div>
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
  renderLeadPrioritySummary();
  const conversion=leads.length?Math.round((counts.fechado/leads.length)*100):0;
  const conv=document.getElementById('leadConversion'); if(conv) conv.textContent=`${conversion}% de conversão`;
  renderLeadAgenda();
  const funnel=document.getElementById('leadFunnel');
  if(funnel){const max=Math.max(leads.length,1); funnel.innerHTML=['novo','atendimento','visita','proposta','fechado'].map(k=>{const m=STATUS_META[k]; const n=counts[k]; const pct=Math.max(n?Math.round((n/max)*100):0, n?8:0); return `<div class="funnel-row"><div class="funnel-label"><span>${m.icon} ${m.label}</span><b>${n}</b></div><div class="funnel-track"><i style="width:${pct}%"></i></div></div>`}).join('');}
  applyLeadFilters();
}
function renderLeadAgenda(){
  const box=document.getElementById('leadAgenda'); if(!box) return;
  const now=new Date();
  const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const endToday=new Date(startToday.getTime()+86400000);
  const overdue=allLeads.filter(l=>l.next_follow_up_at && new Date(l.next_follow_up_at)<startToday && (l.status||'novo')!=='fechado' && (l.status||'novo')!=='sem_interesse').sort((a,b)=>new Date(a.next_follow_up_at)-new Date(b.next_follow_up_at));
  const today=allLeads.filter(l=>l.next_follow_up_at && new Date(l.next_follow_up_at)>=startToday && new Date(l.next_follow_up_at)<endToday && (l.status||'novo')!=='fechado' && (l.status||'novo')!=='sem_interesse').sort((a,b)=>new Date(a.next_follow_up_at)-new Date(b.next_follow_up_at));
  const upcoming=allLeads.filter(l=>l.next_follow_up_at && new Date(l.next_follow_up_at)>=endToday && (l.status||'novo')!=='fechado' && (l.status||'novo')!=='sem_interesse').sort((a,b)=>new Date(a.next_follow_up_at)-new Date(b.next_follow_up_at)).slice(0,8);
  const item=(l,kind)=>{const d=new Date(l.next_follow_up_at); const meta=STATUS_META[l.status||'novo']||STATUS_META.novo; const action=kind==='overdue'||kind==='today'?`<button type="button" class="ghost agenda-btn agenda-complete" onclick="completeFollowUp('${l.id}')">✅ Concluir retorno</button>`:''; return `<div class="agenda-item ${kind}"><div class="agenda-date"><b>${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</b><span>${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="agenda-info"><strong>${escapeHtml(l.name||'Sem nome')}</strong><span>${escapeHtml(l.interest||'Atendimento')} · ${escapeHtml(l.region||'Região não informada')}</span><small>${meta.icon} ${meta.label}</small></div><div class="agenda-actions"><button type="button" class="ghost agenda-btn" onclick="focusLead('${l.id}')">Abrir lead</button>${action}</div></div>`};
  const overdueAction=overdue.length?`<button type="button" class="ghost agenda-link" onclick="setQuickFilter('agora')">Ver todos</button>`:'';
  const todayAction=today.length?`<button type="button" class="ghost agenda-link" onclick="setQuickFilter('hoje')">Ver todos</button>`:'';
  box.innerHTML=`<div class="agenda-head"><div><strong>Agenda de retornos</strong><span>Organize os próximos contatos sem deixar oportunidades para trás.</span></div><div class="agenda-badges"><span class="agenda-badge overdue">⚠️ ${overdue.length} atrasado${overdue.length===1?'':'s'}</span><span class="agenda-badge today">🔔 ${today.length} hoje</span><span class="agenda-badge upcoming">📅 ${upcoming.length} próximos</span></div></div><div class="agenda-grid"><section><div class="agenda-section-head"><h3>⚠️ Atrasados</h3>${overdueAction}</div>${overdue.length?overdue.slice(0,5).map(l=>item(l,'overdue')).join(''):'<p class="agenda-empty">Nenhum retorno atrasado.</p>'}</section><section><div class="agenda-section-head"><h3>🔔 Hoje</h3>${todayAction}</div>${today.length?today.map(l=>item(l,'today')).join(''):'<p class="agenda-empty">Nenhum retorno agendado para hoje.</p>'}</section><section><div class="agenda-section-head"><h3>📅 Próximos</h3></div>${upcoming.length?upcoming.map(l=>item(l,'upcoming')).join(''):'<p class="agenda-empty">Nenhum retorno futuro agendado.</p>'}</section></div>`;
}
window.focusLead=id=>{const el=document.getElementById('status-'+id); if(el){el.scrollIntoView({behavior:'smooth',block:'center'}); el.focus();}};

let activeQuickFilter='todos';
function leadIsOpen(l){const s=l.status||'novo'; return s!=='fechado' && s!=='sem_interesse';}
function leadFollowState(l){
  if(!l.next_follow_up_at) return 'none';
  const d=new Date(l.next_follow_up_at); if(Number.isNaN(d.getTime())) return 'none';
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()); const day=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  if(day<today) return 'overdue'; if(day.getTime()===today.getTime()) return 'today'; return 'upcoming';
}
function leadHasContact(l){return !!l.last_contact_at || allInteractions.some(i=>i.lead_id===l.id && ['contato','retorno'].includes(String(i.type||'').toLowerCase()));}
function leadNeedsAttention(l){return leadIsOpen(l) && (leadFollowState(l)==='overdue' || (l.status||'novo')==='novo');}
function getLeadPriority(l){
  const status=l.status||'novo';
  if(status==='fechado') return {key:'fechado',label:'✅ Negócio fechado',rank:5};
  if(status==='sem_interesse') return {key:'sem_interesse',label:'⚫ Sem interesse',rank:6};
  const follow=leadFollowState(l);
  if(follow==='overdue') return {key:'agora',label:'🔴 Atender agora',rank:0};
  if(follow==='today') return {key:'hoje',label:'🟠 Retornar hoje',rank:1};
  if(status==='novo' && !l.last_contact_at) return {key:'novo',label:'🟡 Novo lead',rank:2};
  if(status==='novo') return {key:'novo',label:'🟡 Novo lead',rank:2};
  if(status==='atendimento') return {key:'atendimento',label:'🔵 Em atendimento',rank:3};
  if(status==='visita' || status==='proposta') return {key:'acompanhamento',label:'🟣 Em acompanhamento',rank:4};
  return {key:'acompanhamento',label:'🔵 Em acompanhamento',rank:4};
}
function renderLeadPrioritySummary(){
  const box=document.getElementById('leadPrioritySummary'); if(!box) return;
  const open=allLeads.filter(leadIsOpen);
  const counts={agora:0,hoje:0,novo:0,atendimento:0,acompanhamento:0,fechado:0};
  open.forEach(l=>{counts[getLeadPriority(l).key]=(counts[getLeadPriority(l).key]||0)+1});
  const labels=[['agora','🔴 Atender agora'],['hoje','🟠 Retornar hoje'],['novo','🟡 Novos leads'],['atendimento','🔵 Em atendimento'],['acompanhamento','🟣 Acompanhamento']];
  box.innerHTML=labels.map(([k,label])=>`<button type="button" class="priority-tile priority-${k}" onclick="setQuickFilter('${k}')"><b>${counts[k]||0}</b><span>${label}</span></button>`).join('');
}
function applyLeadFilters(){
  const search=(document.getElementById('leadSearch')?.value||'').trim().toLowerCase();
  const sf=document.getElementById('leadStatusFilter')?.value||'todos';
  const inf=document.getElementById('leadInterestFilter')?.value||'todos';
  const filtered=allLeads.filter(l=>{
    const hay=[l.name,l.whatsapp,l.region,l.message,l.budget,l.interest,l.bedrooms,l.notes].filter(Boolean).join(' ').toLowerCase();
    let quick=true;
    if(activeQuickFilter==='novos') quick=(l.status||'novo')==='novo';
    if(activeQuickFilter==='urgentes') quick=leadNeedsAttention(l);
    if(activeQuickFilter==='hoje') quick=leadFollowState(l)==='today' && leadIsOpen(l);
    if(activeQuickFilter==='sem-contato') quick=!leadHasContact(l) && leadIsOpen(l);
    if(['agora','hoje','novo','atendimento','acompanhamento'].includes(activeQuickFilter)) quick=leadIsOpen(l) && getLeadPriority(l).key===activeQuickFilter;
    return quick && (!search||hay.includes(search)) && (sf==='todos'||(l.status||'novo')===sf) && (inf==='todos'||String(l.interest||'').toLowerCase()===inf.toLowerCase());
  });
  filtered.sort((a,b)=>{const pa=getLeadPriority(a).rank,pb=getLeadPriority(b).rank;if(pa!==pb)return pa-pb;return new Date(b.created_at||0)-new Date(a.created_at||0);});
  const count=document.getElementById('leadResultCount'); if(count) count.textContent=`${filtered.length} ${filtered.length===1?'lead':'leads'}`;
  const box=document.getElementById('leadList'); if(!box) return;
  box.innerHTML=filtered.length ? filtered.map(l=>renderLeadCard(l)).join('') : `<div class="lead-empty">Nenhum lead corresponde aos filtros selecionados.</div>`;
}
function setQuickFilter(value){activeQuickFilter=value;document.querySelectorAll('.quick-filter').forEach(btn=>btn.classList.toggle('active',btn.dataset.quickFilter===value));applyLeadFilters();}

function extractProfile(lead){
  const text=String(lead.message||'');
  const pick=(label)=>{const re=new RegExp(label+'\\s*:\\s*([^•|]+)','i'); const m=text.match(re); return m?m[1].trim():'';};
  return {type:pick('Tipo'), prazo:pick('Prazo'), faixa:pick('Faixa'), quartos:pick('Quartos')};
}
function renderLeadCard(l){
  const dt=l.created_at?new Date(l.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
  const status=l.status||'novo'; const meta=STATUS_META[status]||STATUS_META.novo; const priorityMeta=getLeadPriority(l);
  const wa=String(l.whatsapp||'').replace(/\D/g,''); const waUrl=wa?`https://wa.me/55${wa}`:'#';
  const qual=[l.region&&`📍 ${l.region}`,l.budget&&`💰 ${l.budget}`,Number(l.bedrooms)>0&&`🛏️ ${l.bedrooms}+ quartos`].filter(Boolean).join(' • ');
  const follow=l.next_follow_up_at?new Date(l.next_follow_up_at):null;
  const now=new Date(); const dayNow=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let followClass='', followLabel='';
  if(follow){ const day=new Date(follow.getFullYear(),follow.getMonth(),follow.getDate()); const diff=Math.round((day-dayNow)/86400000); if(diff<0){followClass='overdue';followLabel='⚠️ Retorno atrasado'} else if(diff===0){followClass='today';followLabel='🔔 Retorno hoje'} else {followLabel=`🔔 Retorno ${follow.toLocaleDateString('pt-BR')}`;} }
  const interactions=allInteractions.filter(i=>i.lead_id===l.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const hasContact=leadHasContact(l);
  const attentionLabel=followClass==='overdue'?'⚠️ Prioridade de atendimento':((status==='novo'&&!hasContact)?'📞 Ainda não contatado':'');
  const lastContact=l.last_contact_at?new Date(l.last_contact_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
  const interactionMeta={
    whatsapp:{icon:'📱',label:'WhatsApp iniciado',cls:'whatsapp'},
    contato:{icon:'📌',label:'Contato',cls:'contato'},
    retorno:{icon:'🔔',label:'Retorno realizado',cls:'retorno'},
    status:{icon:'🔄',label:'Status alterado',cls:'status'},
    agendamento:{icon:'📅',label:'Retorno agendado',cls:'agendamento'},
    observacao:{icon:'📝',label:'Observação',cls:'observacao'}
  };
  const history=interactions.length?`<div class="interaction-history timeline"><div class="timeline-head"><strong>Linha do tempo do atendimento</strong><span>${interactions.length} ${interactions.length===1?'registro':'registros'}</span></div><div class="timeline-list">${interactions.map(i=>{const m=interactionMeta[i.type]||{icon:'•',label:'Registro',cls:'default'};const dt=new Date(i.created_at);return `<div class="timeline-item ${m.cls}"><div class="timeline-dot">${m.icon}</div><div class="timeline-content"><div class="timeline-meta"><strong>${m.label}</strong><time>${dt.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time></div><div class="timeline-note">${escapeHtml(i.note)}</div></div></div>`;}).join('')}</div></div>`:'<div class="interaction-history timeline-empty"><strong>Linha do tempo do atendimento</strong><span>Nenhum registro de atendimento ainda.</span></div>';
  const profile=extractProfile(l);
  const profileItems=[['Interesse',l.interest||'—'],['Região',l.region||'—'],['Tipo',profile.type||'—'],['Faixa',l.budget||profile.faixa||'—'],['Quartos',Number(l.bedrooms)>0?`${l.bedrooms}+`:profile.quartos||'—'],['Prazo',profile.prazo||'—']];
  const profileHtml=`<div class="client-sheet"><div class="client-sheet-head"><div><span class="sheet-eyebrow">FICHA DO CLIENTE</span><strong>${escapeHtml(l.name||'Sem nome')}</strong></div><button type="button" class="ghost copy-sheet" onclick="copyLeadSummary('${l.id}')">📋 Copiar ficha</button></div><div class="client-grid">${profileItems.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div><div class="client-phone"><span>WhatsApp</span><strong>${escapeHtml(l.whatsapp||'—')}</strong>${wa?`<button type="button" class="ghost copy-phone" onclick="copyLeadPhone('${l.id}')">Copiar número</button>`:''}</div></div>`;
  return `<article class="lead-admin status-${status}"><time>${dt}</time><div class="lead-priority-line"><span class="priority-pill priority-${priorityMeta.key}">${priorityMeta.label}</span></div>${profileHtml}<div class="lead-main"><div><p><strong>Mensagem:</strong> ${escapeHtml(l.message||'—')}</p><p><strong>Origem:</strong> ${escapeHtml(l.source==='site-chatbot'?'Assistente AELO':(l.source||'Site'))}</p>${followLabel?`<span class="followup-status ${followClass}">${followLabel}</span>`:''}${attentionLabel?`<span class="attention-status">${attentionLabel}</span>`:''}${lastContact?`<span class="last-contact">Último contato: ${escapeHtml(lastContact)}</span>`:'<span class="last-contact muted-contact">Nenhum contato registrado ainda</span>'}</div><span class="lead-interest">${meta.icon} ${meta.label}</span></div><div class="lead-tools"><label>Status<select id="status-${l.id}"><option value="novo" ${status==='novo'?'selected':''}>🟡 Novo</option><option value="atendimento" ${status==='atendimento'?'selected':''}>🔵 Em atendimento</option><option value="visita" ${status==='visita'?'selected':''}>🟢 Visita agendada</option><option value="proposta" ${status==='proposta'?'selected':''}>🟣 Proposta</option><option value="fechado" ${status==='fechado'?'selected':''}>✅ Negócio fechado</option><option value="sem_interesse" ${status==='sem_interesse'?'selected':''}>⚫ Sem interesse</option></select></label><div class="followup-box"><label>Próximo retorno<input id="follow-${l.id}" type="datetime-local" value="${follow?formatDateTimeLocal(follow):''}"><span class="followup-quick"><button type="button" class="ghost mini" onclick="setFollowUpQuick('${l.id}','today')">Hoje</button><button type="button" class="ghost mini" onclick="setFollowUpQuick('${l.id}','tomorrow')">Amanhã</button><button type="button" class="ghost mini" onclick="setFollowUpQuick('${l.id}','7days')">+7 dias</button><button type="button" class="ghost mini" onclick="clearFollowUp('${l.id}')">Limpar</button></span></label><label>Registro deste contato<input id="interaction-${l.id}" type="text" placeholder="Ex.: Cliente pediu visita no sábado."></label></div><label>Observações<textarea id="notes-${l.id}" rows="3" placeholder="Registre aqui o andamento do atendimento...">${escapeHtml(l.notes||'')}</textarea></label>${history}<div class="lead-actions"><button class="primary" onclick="saveLead('${l.id}')">Salvar atualização</button>${follow?`<button class="ghost success" onclick="completeFollowUp('${l.id}')">✅ Retorno realizado</button>`:''}${wa?`<button class="ghost whatsapp-btn" onclick="openWhatsAppLead('${l.id}')">📱 Abrir WhatsApp</button>`:''}${status!=='fechado'&&status!=='sem_interesse'&&!hasContact?`<button class="ghost success" onclick="markLeadContacted('${l.id}')">📌 Marcar como contatado</button>`:''}<button class="ghost danger" onclick="deleteLead('${l.id}')">🗑️ Excluir lead</button></div></div></article>`;
}
window.copyLeadPhone=async id=>{const lead=allLeads.find(l=>l.id===id);if(!lead)return;const phone=String(lead.whatsapp||'').replace(/\D/g,'');if(!phone)return;await copyText(phone);};
window.copyLeadSummary=async id=>{const lead=allLeads.find(l=>l.id===id);if(!lead)return;const p=extractProfile(lead);const lines=[`Cliente: ${lead.name||'Sem nome'}`,`WhatsApp: ${lead.whatsapp||'—'}`,`Interesse: ${lead.interest||'—'}`,`Região: ${lead.region||'—'}`,`Tipo: ${p.type||'—'}`,`Faixa: ${lead.budget||p.faixa||'—'}`,`Quartos: ${Number(lead.bedrooms)>0?lead.bedrooms+'+':p.quartos||'—'}`,`Prazo: ${p.prazo||'—'}`,`Mensagem: ${lead.message||'—'}`];await copyText(lines.join('\n'));};
async function copyText(text){try{await navigator.clipboard.writeText(text);alert('Copiado para a área de transferência.');}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('Copiado para a área de transferência.');}}

function formatDateTimeLocal(d){ const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
window.setFollowUpQuick = (id, preset) => {
  const input = document.getElementById('follow-'+id); if(!input) return;
  const d = new Date();
  if(preset==='today') d.setHours(Math.min(d.getHours()+1,20),0,0,0);
  if(preset==='tomorrow'){ d.setDate(d.getDate()+1); d.setHours(9,0,0,0); }
  if(preset==='7days'){ d.setDate(d.getDate()+7); d.setHours(9,0,0,0); }
  input.value = formatDateTimeLocal(d);
  input.dispatchEvent(new Event('change',{bubbles:true}));
};
window.clearFollowUp = id => { const input=document.getElementById('follow-'+id); if(input) input.value=''; };


// V43 — Analytics do site
async function loadAnalytics(days=30){
  const stats=document.getElementById('analyticsStats');
  const searches=document.getElementById('analyticsSearches');
  if(!stats || !client) return;
  const since=new Date(Date.now()-Number(days)*86400000).toISOString();
  stats.innerHTML='<div class="analytics-loading">Atualizando indicadores...</div>';
  const {data,error}=await client.from('site_events').select('visitor_id,event_type,details,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(10000);
  if(error){
    const msg=String(error.message||'Erro desconhecido');
    stats.innerHTML=`<div class="analytics-error"><strong>Não foi possível carregar os indicadores agora.</strong><small>${escapeHtml(msg)}</small><button type="button" class="ghost" onclick="loadAnalytics(${Number(days)||30})">Tentar novamente</button></div>`;
    if(searches) searches.innerHTML='';
    return;
  }
  const rows=data||[];
  const visitors=new Set(rows.filter(r=>r.event_type==='page_view').map(r=>r.visitor_id)).size;
  const views=rows.filter(r=>r.event_type==='page_view').length;
  const searchRows=rows.filter(r=>r.event_type==='search');
  const leadsInPeriod=(typeof allLeads!=='undefined' ? allLeads.filter(l=>l.created_at && new Date(l.created_at)>=new Date(since)).length : 0);
  const cards=[['👥','Visitantes estimados',visitors],['👁️','Visitas ao site',views],['🔎','Pesquisas realizadas',searchRows.length],['📋','Leads recebidos',leadsInPeriod]];
  stats.innerHTML=cards.map(c=>`<div class="analytics-card"><span>${c[0]}</span><b>${c[2]}</b><small>${c[1]}</small></div>`).join('');
  const groups={};
  searchRows.forEach(r=>{const d=r.details||{}; const key=[d.type||'imóvel',d.region||'região não informada',d.bedrooms?`${d.bedrooms}+ quartos`:null].filter(Boolean).join(' · '); groups[key]=(groups[key]||0)+1;});
  const top=Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(searches) searches.innerHTML=top.length?top.map(([k,n])=>`<div class="analytics-search-row"><span>${escapeHtml(k)}</span><b>${n}</b></div>`).join(''):'<p class="analytics-empty">Ainda não há pesquisas registradas neste período.</p>';
}
document.getElementById('analyticsPeriod')?.addEventListener('change',e=>loadAnalytics(e.target.value));

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
  loadAnalytics(Number(document.getElementById('analyticsPeriod')?.value || 30));
}
['leadSearch','leadStatusFilter','leadInterestFilter'].forEach(id=>{document.getElementById(id)?.addEventListener('input',applyLeadFilters);document.getElementById(id)?.addEventListener('change',applyLeadFilters)});
document.querySelectorAll('.quick-filter').forEach(btn=>btn.addEventListener('click',()=>setQuickFilter(btn.dataset.quickFilter)));
document.getElementById('clearLeadFilters')?.addEventListener('click',()=>{document.getElementById('leadSearch').value='';document.getElementById('leadStatusFilter').value='todos';document.getElementById('leadInterestFilter').value='todos';setQuickFilter('todos');});

window.deleteLead = async id => {
  if (!confirm("Excluir este lead definitivamente? Esta ação não pode ser desfeita.")) return;
  const { error } = await client.from("leads").delete().eq("id", id);
  if (error) return alert("Não foi possível excluir o lead: " + error.message);
  await refreshLeads();
};

window.markLeadContacted = async id => {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  const now = new Date().toISOString();
  const currentStatus = lead.status || 'novo';
  const nextStatus = currentStatus === 'novo' ? 'atendimento' : currentStatus;
  const { error } = await client.from('leads').update({
    last_contact_at: now,
    status: nextStatus
  }).eq('id', id);
  if (error) return alert('Não foi possível registrar o contato: ' + error.message);
  const { error: iError } = await client.from('lead_interactions').insert({
    lead_id: id,
    type: 'contato',
    note: 'Contato registrado manualmente no painel'
  });
  if (iError) return alert('Contato registrado, mas não foi possível registrar o histórico: ' + iError.message);
  await refreshLeads();
};
window.completeFollowUp = async id => {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  if (!confirm(`Concluir o retorno de ${lead.name || 'este cliente'}?`)) return;
  const note = prompt('Como foi o retorno? (opcional)', '') || '';
  const now = new Date().toISOString();
  const nextStatus = (lead.status || 'novo') === 'novo' ? 'atendimento' : (lead.status || 'novo');
  const { error } = await client.from('leads').update({
    next_follow_up_at: null,
    last_contact_at: now,
    status: nextStatus
  }).eq('id', id);
  if (error) return alert('Não foi possível concluir o retorno: ' + error.message);
  const historyNote = note.trim() ? `Retorno realizado — ${note.trim()}` : 'Retorno realizado';
  const { error: iError } = await client.from('lead_interactions').insert({
    lead_id: id,
    type: 'retorno',
    note: historyNote
  });
  if (iError) return alert('Retorno concluído, mas não foi possível registrar o histórico: ' + iError.message);
  await refreshLeads();
};

function getWhatsAppTemplate(lead){
  const name=(lead.name||'').trim().split(/\s+/)[0] || 'cliente';
  const interest=String(lead.interest||'').toLowerCase();
  if(interest.includes('avalia')) return `Olá, ${name}! Aqui é o Fábio Aelo. Recebi seu interesse em avaliação imobiliária. Posso entender melhor o imóvel e o objetivo da avaliação para orientar você sobre os próximos passos?`;
  if(interest.includes('perícia') || interest.includes('assist')) return `Olá, ${name}! Aqui é o Fábio Aelo. Recebi seu contato sobre perícia/assistência imobiliária. Posso entender melhor sua situação e explicar como posso atuar no atendimento?`;
  if(interest.includes('alug')) return `Olá, ${name}! Aqui é o Fábio Aelo. Recebi seu interesse em aluguel de imóvel. Posso conhecer um pouco melhor o que você procura e apresentar opções compatíveis?`;
  if(interest.includes('venda')) return `Olá, ${name}! Aqui é o Fábio Aelo. Recebi seu contato sobre a venda do seu imóvel. Posso entender melhor o imóvel e conversar sobre a melhor estratégia para comercialização?`;
  return `Olá, ${name}! Aqui é o Fábio Aelo. Recebi seu interesse em imóveis. Posso conhecer um pouco melhor o que você procura e ajudar a encontrar opções compatíveis?`;
}
window.openWhatsAppLead = async id => {
  const lead=allLeads.find(l=>l.id===id); if(!lead) return;
  const wa=String(lead.whatsapp||'').replace(/\D/g,''); if(!wa) return alert('Este lead não possui WhatsApp cadastrado.');
  if(wa.length < 10 || wa.length > 11) return alert('O número de WhatsApp deste lead parece incompleto. Confira o cadastro antes de abrir o WhatsApp.');
  const message=prompt('Mensagem pronta para o WhatsApp. Você pode editar antes de enviar:',getWhatsAppTemplate(lead));
  if(message===null) return;
  const finalMessage=message.trim(); if(!finalMessage) return;
  const {error}=await client.from('lead_interactions').insert({lead_id:id,type:'whatsapp',note:`WhatsApp aberto — ${finalMessage}`});
  if(error) return alert('Não foi possível registrar o contato no histórico: '+error.message);
  const waWindow = window.open(`https://wa.me/55${wa}?text=${encodeURIComponent(finalMessage)}`,'_blank','noopener');
  if(!waWindow) { alert('O navegador bloqueou a abertura do WhatsApp. Permita pop-ups para este site e tente novamente.'); return; }
  alert('WhatsApp aberto. A mensagem está preparada na conversa; clique em Enviar no WhatsApp para concluir o envio.');
  await refreshLeads();
};

window.saveLead = async id => {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  const status = $("status-"+id)?.value || "novo";
  const notes = $("notes-"+id)?.value.trim() || null;
  const followRaw = $("follow-"+id)?.value || "";
  const next_follow_up_at = followRaw ? new Date(followRaw).toISOString() : null;
  const interactionNote = $("interaction-"+id)?.value.trim() || "";
  const oldStatus = lead.status || 'novo';
  const oldFollow = lead.next_follow_up_at || null;
  const now = new Date().toISOString();
  const last_contact_at = interactionNote ? now : (status!=='novo' ? (lead.last_contact_at || now) : (lead.last_contact_at || null));
  const { error } = await client.from("leads").update({status, notes, next_follow_up_at, last_contact_at}).eq("id", id);
  if (error) return alert(error.message);

  const records=[];
  if(interactionNote) records.push({lead_id:id,type:'contato',note:interactionNote});
  if(oldStatus!==status){
    const labels={novo:'Novo',atendimento:'Em atendimento',visita:'Visita agendada',proposta:'Proposta',fechado:'Negócio fechado',sem_interesse:'Sem interesse'};
    records.push({lead_id:id,type:'status',note:`Status alterado: ${labels[oldStatus]||oldStatus} → ${labels[status]||status}`});
  }
  if((oldFollow||'')!==(next_follow_up_at||'')){
    records.push({lead_id:id,type:'agendamento',note:next_follow_up_at?`Próximo retorno agendado para ${new Date(next_follow_up_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`:'Próximo retorno removido'});
  }
  if(records.length){
    const {error:iError}=await client.from('lead_interactions').insert(records);
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
  $("title").value=p?.title||""; $("type").value=p?.type||"venda"; $("location").value=p?.location||""; $("price").value=p?.price||""; $("priceLabel").value=p?.price_label||""; $("bedrooms").value=p?.bedrooms||0; $("suites").value=p?.suites||0; $("parking").value=p?.parking||0; $("area").value=p?.area_m2||""; $("description").value=p?.description||""; $("published").checked=p?.is_published!==false; $("commercialStatus").value=p?.commercial_status||"disponivel"; $("soldBy").value=p?.sold_by||"aelo"; $("partnerName").value=p?.partner_name||""; $("partnerCreci").value=p?.partner_creci||""; syncSoldFields(); $("imageFile").value=""; const existingGallery=Array.isArray(p?.gallery_urls)?p.gallery_urls:(p?.image_url?[p.image_url]:[]); $("currentImage").textContent=existingGallery.length?`${existingGallery.length} foto(s) cadastrada(s). Escolha novas para substituir a galeria.`:""; $("propertyForm").dataset.imageUrl=p?.image_url||""; $("propertyForm").dataset.galleryUrls=JSON.stringify(existingGallery); window.scrollTo({top:0,behavior:"smooth"});
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
  const sold=$("commercialStatus").value==="vendido"; const partner=sold && $("soldBy").value==="parceiro"; const payload={owner_id:user.id,title:$("title").value.trim(),type:$("type").value,badge:$("type").value.toUpperCase(),location:$("location").value.trim(),price:Number($("price").value||0),price_label:$("priceLabel").value.trim()||null,bedrooms:Number($("bedrooms").value||0),suites:Number($("suites").value||0),parking:Number($("parking").value||0),area_m2:Number($("area").value||0)||null,image_url:imageUrl,description:$("description").value.trim(),gallery_urls:galleryUrls,is_published:$("published").checked,commercial_status:$("commercialStatus").value,sold_by:sold ? $("soldBy").value : null,partner_name:partner ? $("partnerName").value.trim()||null : null,partner_creci:partner ? $("partnerCreci").value.trim()||null : null};
  const id=$("propertyId").value; if(id && payload.commercial_status==="vendido" && !payload.sold_at){ const {data:oldProp}=await client.from("properties").select("sold_at,commercial_status").eq("id",id).single(); payload.sold_at=oldProp?.sold_at||new Date().toISOString(); } if(id && payload.commercial_status!=="vendido") payload.sold_at=null; const result=id?await client.from("properties").update(payload).eq("id",id):await client.from("properties").insert(payload); if(result.error) throw result.error;
  $("editor").classList.add("hidden"); $("dashboard").classList.remove("hidden"); showMsg("saveMsg",""); refresh();
 }catch(err){showMsg("saveMsg",err.message)}
});
$("commercialStatus")?.addEventListener("change",syncSoldFields); $("soldBy")?.addEventListener("change",syncSoldFields);
start();

loadAnalytics(30);
