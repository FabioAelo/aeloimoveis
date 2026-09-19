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

let partnerBrokers=[];
let partnerTableAvailable=true;
function partnerErrorText(error){const msg=String(error?.message||'');return /relation .*partner_brokers.* does not exist|could not find the table|42P01/i.test(msg);}
async function loadPartnerBrokers(){const list=$('partnerList');if(!client)return;const {data,error}=await client.from('partner_brokers').select('id,name,creci,whatsapp,email,is_active,created_at').order('is_active',{ascending:false}).order('name');if(error){partnerBrokers=[];partnerTableAvailable=false;if(list)list.innerHTML=partnerErrorText(error)?'<div class="partner-setup-note"><strong>Cadastro de parceiros ainda não ativado.</strong><span>Execute o SQL <b>corretores_parceiros_v51_11.sql</b> no Supabase. Enquanto isso, o cadastro manual do parceiro continua disponível no imóvel.</span></div>':`<div class="partner-setup-note">${escapeHtml(error.message)}</div>`;renderPartnerSelect();return;}partnerTableAvailable=true;partnerBrokers=data||[];renderPartnerSelect();renderPartnerList();}
function renderPartnerSelect(selectedId=''){const select=$('partnerBrokerSelect');if(!select)return;const active=partnerBrokers.filter(p=>p.is_active!==false);select.innerHTML='<option value="">Selecione um parceiro cadastrado</option>'+active.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}${p.creci?' · '+escapeHtml(p.creci):''}</option>`).join('')+'<option value="__manual__">Outro / digitar manualmente</option>';if(selectedId)select.value=active.some(p=>p.id===selectedId)?selectedId:'__manual__';}
function renderPartnerList(){const box=$('partnerList');if(!box)return;if(!partnerBrokers.length){box.innerHTML='<div class="partner-empty">Nenhum corretor parceiro cadastrado ainda.</div>';return;}box.innerHTML=partnerBrokers.map(p=>`<div class="partner-row"><div class="partner-main"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.creci||'CRECI não informado')}${p.whatsapp?' · '+escapeHtml(p.whatsapp):''}</span></div><span class="partner-status ${p.is_active===false?'inactive':'active'}">${p.is_active===false?'Inativo':'Ativo'}</span><div class="partner-actions"><button type="button" class="ghost mini" data-edit-partner="${p.id}">Editar</button><button type="button" class="ghost mini danger" data-delete-partner="${p.id}">Excluir</button></div></div>`).join('');box.querySelectorAll('[data-edit-partner]').forEach(b=>b.onclick=()=>editPartnerBroker(b.dataset.editPartner));box.querySelectorAll('[data-delete-partner]').forEach(b=>b.onclick=()=>deletePartnerBroker(b.dataset.deletePartner));}
function clearPartnerForm(){['partnerBrokerId','partnerBrokerName','partnerBrokerCreci','partnerBrokerWhatsapp','partnerBrokerEmail'].forEach(id=>{const el=$(id);if(el)el.value='';});if($('partnerBrokerActive'))$('partnerBrokerActive').checked=true;}
function editPartnerBroker(id){const p=partnerBrokers.find(x=>x.id===id);if(!p)return;$('partnerBrokerId').value=p.id;$('partnerBrokerName').value=p.name||'';$('partnerBrokerCreci').value=p.creci||'';$('partnerBrokerWhatsapp').value=p.whatsapp||'';$('partnerBrokerEmail').value=p.email||'';$('partnerBrokerActive').checked=p.is_active!==false;$('partnersContent')?.classList.remove('hidden-section');$('partnerBrokerName')?.focus();}
async function deletePartnerBroker(id){const p=partnerBrokers.find(x=>x.id===id);if(!p)return;if(!confirm(`Excluir o cadastro de ${p.name}? Isso não apaga imóveis nem reservas.`))return;const {error}=await client.from('partner_brokers').delete().eq('id',id);if(error){showMsg('partnerMsg',error.message);return;}clearPartnerForm();showMsg('partnerMsg','Corretor parceiro excluído.');loadPartnerBrokers();}
async function savePartnerBroker(){const name=$('partnerBrokerName')?.value.trim();if(!name){showMsg('partnerMsg','Informe o nome do corretor.');return;}const payload={name,creci:$('partnerBrokerCreci')?.value.trim()||null,whatsapp:$('partnerBrokerWhatsapp')?.value.trim()||null,email:$('partnerBrokerEmail')?.value.trim()||null,is_active:$('partnerBrokerActive')?.checked!==false};const id=$('partnerBrokerId')?.value;const result=id?await client.from('partner_brokers').update(payload).eq('id',id):await client.from('partner_brokers').insert(payload);if(result.error){showMsg('partnerMsg',result.error.message);return;}showMsg('partnerMsg',id?'Corretor atualizado.':'Corretor cadastrado.');clearPartnerForm();loadPartnerBrokers();}
function syncPartnerSelection(){const select=$('partnerBrokerSelect'),id=select?.value;if(!id||id==='__manual__')return;const p=partnerBrokers.find(x=>x.id===id);if(!p)return;$('partnerName').value=p.name||'';$('partnerCreci').value=p.creci||'';}
function initPartnerManager(){$('savePartnerBroker')?.addEventListener('click',savePartnerBroker);$('cancelPartnerBroker')?.addEventListener('click',()=>{clearPartnerForm();showMsg('partnerMsg','');});$('refreshPartners')?.addEventListener('click',loadPartnerBrokers);$('partnerBrokerSelect')?.addEventListener('change',()=>{syncPartnerSelection();syncSoldFields();});}


/* V52.2 — Processos de venda */
const SALE_STAGES=[
 {id:'captacao',label:'Captação',tasks:['Proprietário identificado','Dados do proprietário conferidos','Valor pretendido definido','Comissão acordada','Autorização de venda assinada']},
 {id:'documentacao',label:'Documentação',tasks:['Matrícula atualizada','Certidão de ônus conferida','IPTU / quitação conferidos','Condomínio / quitação conferidos, se aplicável','Averbações e regularização conferidas']},
 {id:'cadastro',label:'Cadastro do imóvel',tasks:['Fotos conferidas','Descrição revisada','Características conferidas','Localização conferida','Valor de venda conferido']},
 {id:'divulgacao',label:'Divulgação',tasks:['Site AELO publicado','Instagram / redes divulgado','WhatsApp divulgado','Portais/parceiros definidos']},
 {id:'comprador',label:'Comprador',tasks:['Comprador identificado','WhatsApp conferido','Perfil e capacidade de compra levantados','Forma de pagamento definida']},
 {id:'visita',label:'Visita',tasks:['Visita agendada','Visita realizada','Retorno do cliente registrado']},
 {id:'proposta',label:'Proposta',tasks:['Proposta recebida','Valor da proposta registrado','Condições registradas','Prazo de validade conferido']},
 {id:'negociacao',label:'Negociação',tasks:['Contraproposta registrada, se houver','Condições finais acordadas','Aceite das partes registrado']},
 {id:'documentacao_comprador',label:'Documentação do comprador',tasks:['Documentos pessoais recebidos','Comprovantes recebidos','Documentação do cônjuge, se aplicável','Análise documental concluída']},
 {id:'contrato',label:'Contrato',tasks:['Minuta preparada','Minuta revisada','Assinatura do vendedor','Assinatura do comprador']},
 {id:'financiamento',label:'Financiamento / pagamento',tasks:['Banco definido, se aplicável','Análise de crédito concluída','Avaliação do imóvel concluída, se aplicável','Contrato bancário / pagamento conferido']},
 {id:'registro',label:'Escritura / registro',tasks:['ITBI / tributos conferidos, se aplicável','Escritura assinada, se aplicável','Registro protocolado','Registro concluído']},
 {id:'conclusao',label:'Entrega e conclusão',tasks:['Pagamento confirmado','Chaves entregues','Documentos finais arquivados','Comissão conferida','Imóvel marcado como vendido','Processo encerrado']}
];
function defaultSaleChecklist(){return SALE_STAGES.map(s=>({stage:s.id,label:s.label,tasks:s.tasks.map(t=>({label:t,done:false}))}));}
function saleChecklistStats(checklist){const all=(checklist||[]).flatMap(s=>s.tasks||[]);const done=all.filter(t=>t.done).length;return {total:all.length,done,percent:all.length?Math.round(done/all.length*100):0};}
let saleProcesses=[]; let saleProperties=[]; let saleSaveNotice='';
function saleStatusMeta(s){return s==='concluido'?['Concluído','done']:s==='pausado'?['Pausado','paused']:s==='cancelado'?['Cancelado','cancelled']:['Em andamento','active'];}
function saleMoney(v){return v==null||v===''?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function renderSalePropertyOptions(){const el=$('salePropertySelect');if(!el)return;el.innerHTML='<option value="">Selecione o imóvel</option>'+saleProperties.map(p=>`<option value="${p.id}">${escapeHtml(p.title)}${p.location?' — '+escapeHtml(p.location):''}</option>`).join('');}
function renderSalePartnerOptions(){const el=$('salePartnerSelect');if(!el)return;const active=partnerBrokers.filter(p=>p.is_active!==false);el.innerHTML='<option value="">Nenhum / AELO</option>'+active.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}${p.creci?' · '+escapeHtml(p.creci):''}</option>`).join('');}
async function loadSaleProperties(){if(!client)return;const {data,error}=await client.from('properties').select('id,title,location').order('title');if(!error){saleProperties=data||[];renderSalePropertyOptions();}}
function renderSaleProcessList(){const box=$('saleProcessList'),count=$('saleProcessCount');if(!box)return;if(count)count.textContent=`${saleProcesses.length} ${saleProcesses.length===1?'processo':'processos'}`;if(!saleProcesses.length){box.innerHTML='<div class="sale-empty">Nenhum processo de venda cadastrado. Clique em “+ Nova venda”.</div>';return;}box.innerHTML=saleProcesses.map(p=>{const st=saleStatusMeta(p.status),stats=saleChecklistStats(p.checklist);return `<article class="sale-process-row"><div class="sale-process-main"><strong>${escapeHtml(p.property?.title||'Imóvel')}</strong><span>${escapeHtml(p.buyer_name||'Comprador ainda não informado')} · ${escapeHtml(p.property?.location||'')} · ${stats.done}/${stats.total} tarefas</span><div class="sale-process-progress"><i style="width:${stats.percent}%"></i></div></div><div class="sale-process-actions"><span class="sale-status ${st[1]}">${st[0]}</span><button type="button" class="ghost mini" data-open-sale="${p.id}">Abrir processo</button></div></article>`}).join('');box.querySelectorAll('[data-open-sale]').forEach(b=>b.onclick=()=>openSaleProcess(b.dataset.openSale));}
async function loadSaleProcesses(){if(!client)return;const {data,error}=await client.from('sale_processes').select('*,property:properties(id,title,location)').order('updated_at',{ascending:false});if(error){$('saleProcessList').innerHTML=`<div class="sale-empty">Não foi possível carregar os processos: ${escapeHtml(error.message)}<br><small>Verifique se a tabela <b>sale_processes</b> foi exposta na Data API.</small></div>`;return;}saleProcesses=data||[];renderSaleProcessList();}
function clearSaleForm(){$('saleProcessId').value='';$('salePropertySelect').value='';$('saleResponsibleName').value='';$('saleBuyerName').value='';$('saleBuyerWhatsapp').value='';$('saleBuyerEmail').value='';$('salePartnerSelect').value='';$('saleAskingPrice').value='';$('saleOfferPrice').value='';$('saleFinancing').checked=false;$('saleExchange').checked=false;$('saleNotes').value='';}
function openNewSaleProcess(){clearSaleForm();$('saleProcessForm').classList.remove('hidden-section');$('saleProcessDetail').classList.add('hidden-section');$('saleProcessMsg').textContent='';$('salePropertySelect')?.focus();}
function renderSaleDetail(p){
  const box=$('saleProcessDetail');
  if(!box)return;
  const stats=saleChecklistStats(p.checklist),st=saleStatusMeta(p.status);
  const current=SALE_STAGES.findIndex(s=>s.id===p.current_stage);
  const notice=saleSaveNotice;
  saleSaveNotice='';
  box.classList.remove('hidden-section');
  const property=p.property||{};
  const stageNav=SALE_STAGES.map((s,i)=>{
    const stage=(p.checklist||[]).find(x=>x.stage===s.id);
    const done=(stage?.tasks||[]).filter(t=>t.done).length;
    const total=(stage?.tasks||[]).length;
    return `<button type="button" class="sale-stage-nav ${i===current?'current':''} ${total&&done===total?'done':''}" data-sale-stage="${escapeHtml(s.id)}"><span>${i+1}. ${escapeHtml(s.label)}</span><b>${done}/${total}</b></button>`;
  }).join('');
  const stagesHtml=(p.checklist||[]).map((stage,si)=>`<section class="sale-stage-card" id="sale-stage-${escapeHtml(stage.stage)}"><header><strong>${si+1}. ${escapeHtml(stage.label)}</strong><span>${(stage.tasks||[]).filter(t=>t.done).length}/${(stage.tasks||[]).length} concluídas</span></header>${(stage.tasks||[]).map((task,ti)=>`<div class="sale-task ${task.done?'done':''}"><input type="checkbox" data-sale-task="${si}:${ti}" ${task.done?'checked':''}><label>${escapeHtml(task.label)}</label>${task.done?'<span class="sale-task-ok">✓</span>':''}</div>`).join('')}</section>`).join('');
  box.innerHTML=`
    ${notice?`<div class="sale-save-success" role="status">✓ ${escapeHtml(notice)}</div>`:''}
    <div class="sale-fixed-header">
      <div class="sale-property-header">
        <div class="sale-property-identity">
          <div>
            <p class="eyebrow">PROCESSO DE VENDA</p>
            <h3>${escapeHtml(property.title||'Imóvel')}</h3>
            <div class="sale-detail-meta"><span>${escapeHtml(property.location||'')}</span><span>•</span><span>Comprador: ${escapeHtml(p.buyer_name||'não informado')}</span></div>
          </div>
          <span class="sale-status ${st[1]}">${st[0]}</span>
        </div>
        <div class="sale-detail-kpis">
          <div><small>Progresso</small><b>${stats.percent}%</b><i class="sale-kpi-progress"><em style="width:${stats.percent}%"></em></i></div>
          <div><small>Valor anunciado</small><b>${saleMoney(p.asking_price)}</b></div>
          <div><small>Proposta</small><b>${saleMoney(p.offer_price)}</b></div>
          <div><small>Responsável</small><b>${escapeHtml(p.responsible_name||'AELO')}</b></div>
        </div>
        <div class="sale-stage-progress">${SALE_STAGES.slice(0,7).map((s,i)=>`<div class="sale-stage-step ${i<current?'done ':''}${i===current?'current':''}">${escapeHtml(s.label)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="sale-scroll-workspace">
      <aside class="sale-stage-sidebar">
        <div class="sale-sidebar-title">ETAPAS DA VENDA</div>
        <div class="sale-stage-nav-list">${stageNav}</div>
      </aside>
      <main class="sale-checklist-scroll">
        <div class="sale-checklist-inner">
          <div class="sale-checklist-top"><div><strong>Checklist da venda</strong><span>${stats.done} de ${stats.total} tarefas concluídas</span></div><span class="sale-status ${st[1]}">${st[0]}</span></div>
          <div class="sale-checklist">${stagesHtml}</div>
          <div class="sale-detail-actions sale-detail-actions-sticky-end">
            <select id="saleDetailStatus" style="max-width:180px"><option value="em_andamento" ${p.status==='em_andamento'?'selected':''}>Em andamento</option><option value="pausado" ${p.status==='pausado'?'selected':''}>Pausado</option><option value="concluido" ${p.status==='concluido'?'selected':''}>Concluído</option><option value="cancelado" ${p.status==='cancelado'?'selected':''}>Cancelado</option></select>
            <button type="button" class="primary" id="saveSaleChecklist">Salvar checklist</button>
            <button type="button" class="ghost" id="closeSaleDetail">Fechar</button>
          </div>
        </div>
      </main>
    </div>`;
  box.querySelectorAll('[data-sale-task]').forEach(el=>el.addEventListener('change',()=>{
    const [si,ti]=el.dataset.saleTask.split(':').map(Number);
    p.checklist[si].tasks[ti].done=el.checked;
    p.current_stage=firstIncompleteSaleStage(p.checklist);
    renderSaleDetail(p);
  }));
  box.querySelectorAll('[data-sale-stage]').forEach(el=>el.addEventListener('click',()=>{
    const target=box.querySelector('#sale-stage-'+el.dataset.saleStage);
    if(target){target.scrollIntoView({behavior:'smooth',block:'start'});}
  }));
  $('saveSaleChecklist').onclick=async()=>{
    const btn=$('saveSaleChecklist');
    const status=$('saleDetailStatus').value;
    const completed=saleChecklistStats(p.checklist).percent===100;
    const payload={checklist:p.checklist,current_stage:firstIncompleteSaleStage(p.checklist),status,closed_at:(status==='concluido'||completed)?(p.closed_at||new Date().toISOString()):null};
    if(btn){btn.disabled=true;btn.dataset.originalText=btn.textContent;btn.textContent='Salvando...';}
    const {error}=await client.from('sale_processes').update(payload).eq('id',p.id);
    if(error){if(btn){btn.disabled=false;btn.textContent=btn.dataset.originalText||'Salvar checklist';}alert(error.message);return;}
    saleSaveNotice='Checklist e status salvos com sucesso.';
    await loadSaleProcesses();
    openSaleProcess(p.id);
  };
  $('closeSaleDetail').onclick=()=>box.classList.add('hidden-section');
}
function firstIncompleteSaleStage(checklist){for(const stage of checklist||[]){if((stage.tasks||[]).some(t=>!t.done))return stage.stage;}return 'conclusao';}
async function openSaleProcess(id){const p=saleProcesses.find(x=>x.id===id);if(p)renderSaleDetail(p);else{const {data}=await client.from('sale_processes').select('*,property:properties(id,title,location)').eq('id',id).single();if(data)renderSaleDetail(data);}}
async function saveSaleProcess(){const btn=$('saveSaleProcess');const propertyId=$('salePropertySelect').value;if(!propertyId){$('saleProcessMsg').textContent='Selecione o imóvel.';return;}if(btn){btn.disabled=true;btn.dataset.originalText=btn.textContent;btn.textContent='Salvando...';}const payload={property_id:propertyId,buyer_name:$('saleBuyerName').value.trim()||null,buyer_whatsapp:$('saleBuyerWhatsapp').value.trim()||null,buyer_email:$('saleBuyerEmail').value.trim()||null,responsible_name:$('saleResponsibleName').value.trim()||null,partner_broker_id:$('salePartnerSelect').value||null,asking_price:Number($('saleAskingPrice').value||0)||null,offer_price:Number($('saleOfferPrice').value||0)||null,financing:$('saleFinancing').checked,exchange_property:$('saleExchange').checked,notes:$('saleNotes').value.trim()||null};const id=$('saleProcessId').value;let result;if(id)result=await client.from('sale_processes').update(payload).eq('id',id);else{payload.checklist=defaultSaleChecklist();payload.current_stage='captacao';result=await client.from('sale_processes').insert(payload);}if(result.error){if(btn){btn.disabled=false;btn.textContent=btn.dataset.originalText||'Salvar processo';}$('saleProcessMsg').textContent=result.error.message;return;}if(btn){btn.textContent='✓ Salvo';}saleSaveNotice=id?'Processo atualizado com sucesso.':'Processo criado com sucesso.';$('saleProcessMsg').textContent=saleSaveNotice;$('saleProcessForm').classList.add('hidden-section');await loadSaleProcesses();}
function initSaleProcesses(){$('newSaleProcess')?.addEventListener('click',openNewSaleProcess);$('cancelSaleProcess')?.addEventListener('click',()=>{$('saleProcessForm').classList.add('hidden-section');clearSaleForm();});$('saveSaleProcess')?.addEventListener('click',saveSaleProcess);$('refreshSaleProcesses')?.addEventListener('click',async()=>{await loadSaleProperties();await loadSaleProcesses();});loadSaleProperties();loadSaleProcesses();}
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
  $('partnerBrokerWrap')?.classList.toggle('hidden',!partner);
  const manual=$('partnerBrokerSelect')?.value==='__manual__' || !partner;
  $('partnerNameWrap')?.classList.toggle('hidden',!partner || !manual);
  $('partnerCreciWrap')?.classList.toggle('hidden',!partner || !manual);
  if(partner && $('partnerBrokerSelect')?.value && $('partnerBrokerSelect').value!=='__manual__') syncPartnerSelection();
}
function syncSeasonFields(){
  const season=$('type')?.value==='temporada';
  $('seasonFields')?.classList.toggle('hidden',!season);
  const label=$('priceFieldLabel'); if(label) label.textContent=season?'Diária':'Preço';
  const p=$('price'); if(p) p.placeholder=season?'650':'2480000';
  const pl=$('priceLabel'); if(pl) pl.placeholder=season?'Opcional — ex.: R$ 650/noite':'Opcional — ex.: R$ 2.480.000';
}
async function loadSeasonManagers(propertyId){
  const blocksBox=$('seasonBlocksList'), ratesBox=$('seasonRatesList');
  if(!propertyId){if(blocksBox)blocksBox.innerHTML='<small>Salve o imóvel primeiro para ativar o calendário.</small>';if(ratesBox)ratesBox.innerHTML='<small>Salve o imóvel primeiro para cadastrar tarifas especiais.</small>';return;}
  const [b,r]=await Promise.all([client.from('season_blocks').select('id,start_date,end_date,status').eq('property_id',propertyId).order('start_date'),client.from('season_rate_periods').select('id,start_date,end_date,nightly_rate').eq('property_id',propertyId).order('start_date')]);
  if(blocksBox) blocksBox.innerHTML=b.error?`<small>${b.error.message}</small>`:(b.data?.length?b.data.map(x=>`<div class="season-block-row"><span>📅 ${new Date(x.start_date+'T12:00:00').toLocaleDateString('pt-BR')} → ${new Date(x.end_date+'T12:00:00').toLocaleDateString('pt-BR')} · ${x.status}</span><button type="button" data-del-block="${x.id}">Excluir</button></div>`).join(''):'<small>Nenhum período bloqueado.</small>');
  if(ratesBox) ratesBox.innerHTML=r.error?`<small>${r.error.message}</small>`:(r.data?.length?r.data.map(x=>`<div class="season-block-row"><span>☀️ ${new Date(x.start_date+'T12:00:00').toLocaleDateString('pt-BR')} → ${new Date(x.end_date+'T12:00:00').toLocaleDateString('pt-BR')} · ${Number(x.nightly_rate).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}/noite</span><button type="button" data-del-rate="${x.id}">Excluir</button></div>`).join(''):'<small>Nenhuma tarifa especial.</small>');
  blocksBox?.querySelectorAll('[data-del-block]').forEach(btn=>btn.onclick=async()=>{const {error}=await client.from('season_blocks').delete().eq('id',btn.dataset.delBlock);if(error)showMsg('saveMsg',error.message);else loadSeasonManagers(propertyId);});
  ratesBox?.querySelectorAll('[data-del-rate]').forEach(btn=>btn.onclick=async()=>{const {error}=await client.from('season_rate_periods').delete().eq('id',btn.dataset.delRate);if(error)showMsg('saveMsg',error.message);else loadSeasonManagers(propertyId);});
}
function initSeasonManagers(){
  $('addSeasonBlock')?.addEventListener('click',async()=>{const id=$('propertyId')?.value;if(!id){showMsg('saveMsg','Salve o imóvel antes de cadastrar períodos.');return;}const start=$('seasonBlockStart').value,end=$('seasonBlockEnd').value,status=$('seasonBlockStatus').value;if(!start||!end||end<=start){showMsg('saveMsg','Informe um período válido.');return;}const {data:{user}}=await client.auth.getUser();const {error}=await client.from('season_blocks').insert({property_id:id,start_date:start,end_date:end,status,created_by:user.id});if(error)showMsg('saveMsg',error.message);else{showMsg('saveMsg','Período bloqueado.');loadSeasonManagers(id);}});
  $('addSeasonRate')?.addEventListener('click',async()=>{const id=$('propertyId')?.value;if(!id){showMsg('saveMsg','Salve o imóvel antes de cadastrar tarifas.');return;}const start=$('seasonRateStart').value,end=$('seasonRateEnd').value,value=Number($('seasonRateValue').value||0);if(!start||!end||end<start||value<=0){showMsg('saveMsg','Informe período e diária válida.');return;}const {data:{user}}=await client.auth.getUser();const {error}=await client.from('season_rate_periods').insert({property_id:id,start_date:start,end_date:end,nightly_rate:value,created_by:user.id});if(error)showMsg('saveMsg',error.message);else{showMsg('saveMsg','Tarifa especial adicionada.');loadSeasonManagers(id);}});
}
initSeasonManagers();

async function refresh() {
  const { data, error } = await client.from("properties").select("*").order("created_at", { ascending:false });
  if (error) return showMsg("saveMsg", error.message);
  $("propertyList").innerHTML = data.length ? data.map(p => `
    <article class="admin-row">
      <img src="${p.image_url || 'logo.png'}" alt="">
      <div><h3>${p.title}</h3><p>${p.location} • ${p.type==='temporada'?'Temporada':p.type==='aluguel'?'Aluguel residencial':p.type} • ${p.is_published ? 'Publicado' : 'Rascunho'}</p><p>${commercialLabel(p)}${p.price_label ? ' • '+p.price_label : ''}</p></div>
      <div class="row-actions"><button class="ghost" onclick="editProperty('${p.id}')">Editar</button><button class="ghost danger" onclick="deleteProperty('${p.id}')">Excluir</button></div>
    </article>`).join("") : `<div class="card"><p>Nenhum imóvel cadastrado ainda. Clique em “+ Novo imóvel”.</p></div>`;
}


let allLeads = [];
let allInteractions = [];

const STATUS_META = {
  novo:{label:'Novo',icon:'🟡'}, atendimento:{label:'Em atendimento',icon:'🔵'}, visita:{label:'Visita agendada',icon:'🟢'}, proposta:{label:'Proposta',icon:'🟣'}, fechado:{label:'Negócio fechado',icon:'✅'}, sem_interesse:{label:'Sem interesse',icon:'⚫'}
};
function renderCommercialIntelligence(){
  const box=document.getElementById('commercialIntelligence'); if(!box) return;
  const leads=(typeof allLeads!=='undefined' ? allLeads : []);
  const total=leads.length;
  const count=s=>leads.filter(l=>(l.status||'novo')===s).length;
  const novos=count('novo'), atendimento=count('atendimento'), visita=count('visita'), proposta=count('proposta'), fechado=count('fechado'), semInteresse=count('sem_interesse');
  const abertos=Math.max(0,total-fechado-semInteresse);
  const negociacao=visita+proposta;
  const fechamento=total ? (fechado/total*100) : 0;
  const aproveitamento=total ? ((fechado+proposta+visita)/total*100) : 0;
  const stages=[
    ['🟡','Novo',novos],['🔵','Em atendimento',atendimento],['🟢','Visita agendada',visita],['🟣','Proposta',proposta],['✅','Fechado',fechado]
  ];
  box.innerHTML=`<div class="commercial-intel-head"><div><strong>Visão da carteira</strong><span>Indicadores calculados sobre os leads cadastrados no painel.</span></div></div>
  <div class="commercial-kpis">
    <div><b>${total}</b><span>Total de leads</span></div>
    <div><b>${abertos}</b><span>Oportunidades abertas</span></div>
    <div><b>${negociacao}</b><span>Em visita / proposta</span></div>
    <div><b>${fechado}</b><span>Negócios fechados</span></div>
  </div>
  <div class="commercial-rates">
    <div><b>${fechamento.toFixed(1)}%</b><span>Taxa de fechamento</span><small>fechados ÷ todos os leads</small></div>
    <div><b>${aproveitamento.toFixed(1)}%</b><span>Em etapa comercial</span><small>visita + proposta + fechado</small></div>
  </div>
  <div class="commercial-path"><strong>Caminho comercial</strong><div class="commercial-stage-list">${stages.map(([icon,label,n])=>`<div class="commercial-stage"><span>${icon} ${label}</span><b>${n}</b></div>`).join('')}</div></div>
  <div class="commercial-intel-note">ℹ️ Esta leitura considera o status atual de cada lead. Ela não afirma que uma visita do site virou um lead específico, porque os eventos de acesso são anônimos.</div>`;
}

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
window.focusLead=id=>{
  // Garante que o lead esteja visível mesmo se a lista estiver filtrada ou recolhida.
  const openSection=target=>{
    const panel=document.getElementById(target);
    if(panel && panel.classList.contains('hidden-section')){
      document.querySelector(`.section-toggle[data-target="${target}"]`)?.click();
    }
  };
  openSection('opportunitiesContent');
  openSection('myLeadsContent');
  ['leadSearch','leadStatusFilter','leadInterestFilter','leadRegionFilter','leadBedroomsFilter'].forEach(k=>{
    const el=document.getElementById(k); if(el) el.value='todos'===k?'todos':'';
  });
  if(document.getElementById('leadStatusFilter')) document.getElementById('leadStatusFilter').value='todos';
  if(document.getElementById('leadInterestFilter')) document.getElementById('leadInterestFilter').value='todos';
  if(document.getElementById('leadRegionFilter')) document.getElementById('leadRegionFilter').value='todos';
  if(document.getElementById('leadBedroomsFilter')) document.getElementById('leadBedroomsFilter').value='todos';
  if(document.getElementById('leadSearch')) document.getElementById('leadSearch').value='';
  setQuickFilter('todos');
  const findAndOpen=()=>{
    const details=document.getElementById('lead-details-'+id);
    const btn=document.querySelector(`.lead-compact-header[onclick="toggleLeadCard('${id}')"]`);
    const card=btn?.closest('.lead-admin');
    if(!details || !btn || !card) return false;
    if(details.classList.contains('hidden-section')) toggleLeadCard(id);
    requestAnimationFrame(()=>{
      card.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>document.getElementById('status-'+id)?.focus({preventScroll:true}),350);
    });
    return true;
  };
  if(findAndOpen()) return;
  requestAnimationFrame(()=>{ applyLeadFilters(); requestAnimationFrame(()=>{ if(!findAndOpen()) setTimeout(findAndOpen,120); }); });
};

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
  const rf=document.getElementById('leadRegionFilter')?.value||'todos';
  const bf=document.getElementById('leadBedroomsFilter')?.value||'todos';
  const filtered=allLeads.filter(l=>{
    const hay=[l.name,l.whatsapp,l.region,l.message,l.budget,l.interest,l.bedrooms,l.notes].filter(Boolean).join(' ').toLowerCase();
    let quick=true;
    if(activeQuickFilter==='novos') quick=(l.status||'novo')==='novo';
    if(activeQuickFilter==='urgentes') quick=leadNeedsAttention(l);
    if(activeQuickFilter==='hoje') quick=leadFollowState(l)==='today' && leadIsOpen(l);
    if(activeQuickFilter==='sem-contato') quick=!leadHasContact(l) && leadIsOpen(l);
    if(['agora','hoje','novo','atendimento','acompanhamento'].includes(activeQuickFilter)) quick=leadIsOpen(l) && getLeadPriority(l).key===activeQuickFilter;
    const bedrooms=Number(l.bedrooms||0);
    return quick && (!search||hay.includes(search)) && (sf==='todos'||(l.status||'novo')===sf) && (inf==='todos'||String(l.interest||'').toLowerCase()===inf.toLowerCase()) && (rf==='todos'||String(l.region||'')===rf) && (bf==='todos'||bedrooms>=Number(bf));
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
  const compactStatus = meta.label;
  const compactQual = [l.interest, l.region, l.budget].filter(Boolean).join(" • ");
  return `<article class="lead-admin status-${status}"><button type="button" class="lead-compact-header" onclick="toggleLeadCard('${l.id}')" aria-expanded="false"><span class="lead-compact-main"><strong>${escapeHtml(l.name||'Sem nome')}</strong><small>${escapeHtml(compactQual||'Sem qualificação registrada')}</small></span><span class="lead-compact-right"><span class="priority-pill priority-${priorityMeta.key}">${priorityMeta.label}</span><span class="lead-compact-status">${meta.icon} ${escapeHtml(compactStatus)}</span><span class="lead-open-label">Ver ficha ›</span></span></button><div id="lead-details-${l.id}" class="lead-expanded-content hidden-section"><time>${dt}</time><div class="lead-priority-line"><span class="priority-pill priority-${priorityMeta.key}">${priorityMeta.label}</span></div>${profileHtml}<div class="lead-main"><div><p><strong>Mensagem:</strong> ${escapeHtml(l.message||'—')}</p><p><strong>Origem:</strong> ${escapeHtml(l.source==='site-chatbot'?'Assistente AELO':(l.source||'Site'))}</p>${followLabel?`<span class="followup-status ${followClass}">${followLabel}</span>`:''}${attentionLabel?`<span class="attention-status">${attentionLabel}</span>`:''}${lastContact?`<span class="last-contact">Último contato: ${escapeHtml(lastContact)}</span>`:'<span class="last-contact muted-contact">Nenhum contato registrado ainda</span>'}</div><span class="lead-interest">${meta.icon} ${meta.label}</span></div><div class="lead-tools"><label>Status<select id="status-${l.id}"><option value="novo" ${status==='novo'?'selected':''}>🟡 Novo</option><option value="atendimento" ${status==='atendimento'?'selected':''}>🔵 Em atendimento</option><option value="visita" ${status==='visita'?'selected':''}>🟢 Visita agendada</option><option value="proposta" ${status==='proposta'?'selected':''}>🟣 Proposta</option><option value="fechado" ${status==='fechado'?'selected':''}>✅ Negócio fechado</option><option value="sem_interesse" ${status==='sem_interesse'?'selected':''}>⚫ Sem interesse</option></select></label><div class="followup-box"><label>Próximo retorno<input id="follow-${l.id}" type="datetime-local" value="${follow?formatDateTimeLocal(follow):''}"><span class="followup-quick"><button type="button" class="ghost mini" onclick="setFollowUpQuick('${l.id}','today')">Hoje</button><button type="button" class="ghost mini" onclick="setFollowUpQuick('${l.id}','tomorrow')">Amanhã</button><button type="button" class="ghost mini" onclick="setFollowUpQuick('${l.id}','7days')">+7 dias</button><button type="button" class="ghost mini" onclick="clearFollowUp('${l.id}')">Limpar</button></span></label><label>Registro deste contato<input id="interaction-${l.id}" type="text" placeholder="Ex.: Cliente pediu visita no sábado."></label></div><label>Observações<textarea id="notes-${l.id}" rows="3" placeholder="Registre aqui o andamento do atendimento...">${escapeHtml(l.notes||'')}</textarea></label>${history}<div class="lead-actions"><button class="primary" onclick="saveLead('${l.id}')">Salvar atualização</button>${follow?`<button class="ghost success" onclick="completeFollowUp('${l.id}')">✅ Retorno realizado</button>`:''}${wa?`<button class="ghost whatsapp-btn" onclick="openWhatsAppLead('${l.id}')">📱 Abrir WhatsApp</button>`:''}${status!=='fechado'&&status!=='sem_interesse'&&!hasContact?`<button class="ghost success" onclick="markLeadContacted('${l.id}')">📌 Marcar como contatado</button>`:''}<button class="ghost danger" onclick="deleteLead('${l.id}')">🗑️ Excluir lead</button></div></div></article>`;
}
window.toggleLeadCard = id => { const details=document.getElementById("lead-details-"+id); const btn=document.querySelector(`.lead-compact-header[onclick="toggleLeadCard('${id}')"]`); if(!details||!btn)return; const open=btn.getAttribute("aria-expanded")==="true"; btn.setAttribute("aria-expanded",String(!open)); btn.classList.toggle("is-open",!open); details.classList.toggle("hidden-section",open); const card=btn.closest(".lead-admin"); if(card) card.classList.toggle("is-expanded",!open); };
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

  const evolution=document.getElementById('analyticsEvolution');
  if(evolution){
    const dayMap={};
    const dayKey=d=>{const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
    const labelDay=k=>{const [y,m,d]=k.split('-'); return `${d}/${m}`;};
    rows.forEach(r=>{const k=dayKey(r.created_at); if(!dayMap[k]) dayMap[k]={views:0,searches:0,visitors:new Set()}; if(r.event_type==='page_view'){dayMap[k].views++; dayMap[k].visitors.add(r.visitor_id);} if(r.event_type==='search') dayMap[k].searches++;});
    const leadMap={};
    (typeof allLeads!=='undefined' ? allLeads : []).forEach(l=>{if(l.created_at){const k=dayKey(l.created_at); leadMap[k]=(leadMap[k]||0)+1;}});
    const now=new Date();
    const daysToShow=Math.min(Number(days)||30,30);
    const keys=[];
    for(let i=daysToShow-1;i>=0;i--){const d=new Date(now); d.setHours(12,0,0,0); d.setDate(d.getDate()-i); keys.push(dayKey(d));}
    const maxVal=Math.max(1,...keys.map(k=>Math.max(dayMap[k]?.views||0,dayMap[k]?.searches||0)));
    const rowsHtml=keys.map(k=>{const v=dayMap[k]?.views||0; const q=dayMap[k]?.searches||0; const l=leadMap[k]||0; const leadLabel=l?`<span class="analytics-day-leads">📋 ${l} lead${l===1?'':'s'}</span>`:''; return `<div class="analytics-day" title="${labelDay(k)} — ${v} visita(s), ${q} pesquisa(s), ${l} lead(s)"><div class="analytics-day-bars"><div class="analytics-bar-wrap"><i class="analytics-bar views" style="height:${Math.max(v?4:0,Math.round(v/maxVal*100))}%"></i></div><div class="analytics-bar-wrap"><i class="analytics-bar searches" style="height:${Math.max(q?4:0,Math.round(q/maxVal*100))}%"></i></div></div>${leadLabel}<span class="analytics-day-label">${labelDay(k)}</span></div>`;}).join('');
    const searchRate=views?((searchRows.length/views)*100):0;
    const leadRate=views?((leadsInPeriod/views)*100):0;
    evolution.innerHTML=`<div class="analytics-evolution-head"><div><strong>Evolução e conversão.</strong><span>Visitas e pesquisas por dia. Os percentuais são aproximados e usam os leads recebidos no período.</span></div><div class="analytics-legend"><span><i class="legend-dot views"></i>Visitas</span><span><i class="legend-dot searches"></i>Pesquisas</span></div></div><div class="analytics-conversion"><div><b>${searchRate.toFixed(1)}%</b><span>Pesquisa / visita</span></div><div><b>${leadRate.toFixed(1)}%</b><span>Lead / visita</span></div><div><b>${visitors}</b><span>Visitantes únicos estimados</span></div></div><div class="analytics-chart">${rowsHtml}</div><div class="analytics-chart-note">Cada coluna representa um dia do período selecionado. Passe o mouse sobre as barras para ver os números.</div>`;
  }
}
document.getElementById('analyticsPeriod')?.addEventListener('change',e=>loadAnalytics(e.target.value));

let allReservations = [];

const TEST_RESERVATION_KEY='aelo_test_reservations_v1';
function getMarkedTestReservations(){try{return JSON.parse(localStorage.getItem(TEST_RESERVATION_KEY)||'[]')}catch{return[]}}
function setMarkedTestReservations(ids){localStorage.setItem(TEST_RESERVATION_KEY,JSON.stringify(ids))}
function isTestReservation(r){
  if(!r) return false;
  const hay=[r.guest_name,r.note].filter(Boolean).join(' ').toLowerCase();
  return r.is_test===true || getMarkedTestReservations().includes(r.id) || hay.includes('teste');
}
async function markReservationAsTest(id){
  const r=allReservations.find(x=>x.id===id); if(!r||!client)return;
  const {error}=await client.from('season_reservations').update({is_test:true}).eq('id',id);
  if(error){alert(`Não foi possível marcar como teste: ${error.message}`);return;}
  const ids=getMarkedTestReservations();if(!ids.includes(id)){ids.push(id);setMarkedTestReservations(ids)};r.is_test=true;renderReservations();if(reservationDetailId===id)renderReservationDetailTestActions();
}
async function unmarkReservationAsTest(id){
  const r=allReservations.find(x=>x.id===id); if(!r||!client)return;
  if(!confirm('Remover a marca de TESTE deste registro? Ele deixará de poder ser excluído como teste.')) return;
  const {error}=await client.from('season_reservations').update({is_test:false}).eq('id',id);
  if(error){alert(`Não foi possível remover a marca: ${error.message}`);return;}
  setMarkedTestReservations(getMarkedTestReservations().filter(x=>x!==id));r.is_test=false;renderReservations();if(reservationDetailId===id)renderReservationDetailTestActions();
}
async function deleteTestReservation(id){
  const r=allReservations.find(x=>x.id===id); if(!r||!isTestReservation(r)) return;
  const label=`${r.guest_name||'sem nome'} — ${reservationDate(r.checkin)} → ${reservationDate(r.checkout)}`;
  if(!confirm(`Excluir SOMENTE o registro de TESTE?\n\n${label}\n\nA reserva e o bloqueio automático deste teste serão removidos. O Lead será mantido. Reservas reais não são afetadas.`)) return;
  // Converte a antiga marca local em marca persistente no banco antes de excluir.
  if(!r.is_test){
    const {error:markError}=await client.from('season_reservations').update({is_test:true}).eq('id',id);
    if(markError){alert(`Não foi possível preparar a exclusão segura do teste: ${markError.message}`);return;}
  }
  const {error}=await client.from('season_reservations').delete().eq('id',id).eq('is_test',true);
  if(error){alert(`Não foi possível excluir o teste: ${error.message}`);return;}
  if(r.property_id&&r.checkin&&r.checkout){
    const {error:blockError}=await client.from('season_blocks').delete().eq('property_id',r.property_id).eq('start_date',dateKey(r.checkin)).eq('end_date',dateKey(r.checkout)).eq('status','reservado');
    if(blockError) console.warn('bloqueio do teste não removido',blockError);
  }
  setMarkedTestReservations(getMarkedTestReservations().filter(x=>x!==id));
  allReservations=allReservations.filter(x=>x.id!==id);
  if(reservationDetailId===id) closeReservationDetail();
  renderReservations();
  await refreshReservations();
  if(allReservations.some(x=>x.id===id)) alert('O teste ainda está no banco. Verifique a política de exclusão no Supabase.');
}
function renderReservationDetailTestActions(){
  const box=document.getElementById('reservationDetailTestActions'); if(!box)return;
  const r=allReservations.find(x=>x.id===reservationDetailId); if(!r){box.innerHTML='';return;}
  if(isTestReservation(r)) box.innerHTML=`<button type="button" class="reservation-test-delete" id="reservationDetailDeleteTest">🗑️ Excluir registro de TESTE</button><button type="button" class="reservation-test-unmark" id="reservationDetailUnmarkTest">Remover marca de teste</button>`;
  else box.innerHTML=`<button type="button" class="reservation-test-mark" id="reservationDetailMarkTest">Marcar como TESTE</button>`;
  box.querySelector('#reservationDetailDeleteTest')?.addEventListener('click',()=>deleteTestReservation(r.id));
  box.querySelector('#reservationDetailUnmarkTest')?.addEventListener('click',()=>unmarkReservationAsTest(r.id));
  box.querySelector('#reservationDetailMarkTest')?.addEventListener('click',()=>markReservationAsTest(r.id));
}
const RES_STATUS = {
  solicitada:{label:'Solicitada',icon:'🟡'}, em_analise:{label:'Em análise',icon:'🔵'}, confirmada:{label:'Confirmada',icon:'🟢'}, aguardando_pagamento:{label:'Aguardando pagamento',icon:'💳'}, reservada:{label:'Reservada',icon:'🏡'}, concluida:{label:'Concluída',icon:'✅'}, cancelada:{label:'Cancelada',icon:'⚫'}
};
function reservationDate(v){return v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'): '—';}
function renderReservations(){
  const box=document.getElementById('reservationList'); if(!box) return;
  const search=(document.getElementById('reservationSearch')?.value||'').trim().toLowerCase();
  const status=document.getElementById('reservationStatusFilter')?.value||'todos';
  const filtered=allReservations.filter(r=>{
    const hay=[r.guest_name,r.guest_whatsapp,r.property?.title,r.property?.location].filter(Boolean).join(' ').toLowerCase();
    return (!search||hay.includes(search)) && (status==='todos'||r.status===status);
  });
  const count=document.getElementById('reservationResultCount'); if(count) count.textContent=`${filtered.length} ${filtered.length===1?'solicitação':'solicitações'}`;
  if(!filtered.length){box.innerHTML='<div class="reservation-empty">Nenhuma solicitação de reserva encontrada.</div>';return;}
  box.innerHTML=filtered.map(r=>{
    const meta=RES_STATUS[r.status]||{label:r.status||'Solicitação',icon:'📌'};
    const calculatedTotal=(r.estimated_total!==null&&r.estimated_total!==undefined&&Number(r.estimated_total)>0)?Number(r.estimated_total):null;
    const total=calculatedTotal!==null?`R$ ${calculatedTotal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'Valor a confirmar';
    return `<article class="reservation-card" data-open-reservation="${r.id}"><div class="reservation-main"><div class="reservation-title"><strong>${escapeHtml(r.property?.title||'Imóvel de temporada')}</strong><span>${meta.icon} ${meta.label}</span></div><div class="reservation-grid"><div><small>Hóspede</small><b>${escapeHtml(r.guest_name||'Não informado')}</b><span>📱 ${escapeHtml(r.guest_whatsapp||'—')}</span></div><div><small>Período</small><b>${reservationDate(r.checkin)} → ${reservationDate(r.checkout)}</b><span>👥 ${r.guests||'—'} hóspedes${r.adults||r.children||r.babies?` · ${r.adults||0}A / ${r.children||0}C / ${r.babies||0}B`:''}</span></div><div><small>Valor estimado</small><b>${escapeHtml(total)}</b><span>${escapeHtml(r.property?.location||'')}</span></div></div>${r.note?`<div class="reservation-note">📝 ${escapeHtml(r.note)}</div>`:''}</div><div class="reservation-actions"><label>Status<select data-res-status="${r.id}">${Object.entries(RES_STATUS).map(([k,v])=>`<option value="${k}" ${r.status===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}</select></label><button type="button" class="primary" data-save-res="${r.id}">Salvar status</button><button type="button" class="ghost" data-res-wa="${r.id}">💬 WhatsApp</button>${isTestReservation(r)?`<button type="button" class="reservation-test-delete" data-delete-test="${r.id}">🗑️ Excluir teste</button>`:`<button type="button" class="reservation-test-mark" data-mark-test="${r.id}">Marcar como teste</button>`}<button type="button" class="reservation-open-btn" data-open-reservation="${r.id}">Abrir reserva e calendário →</button></div></article>`;
  }).join('');
  box.querySelectorAll('[data-open-reservation]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();openReservationDetail(btn.dataset.openReservation);});
  box.querySelectorAll('[data-save-res]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.saveRes;const status=document.querySelector(`[data-res-status="${id}"]`)?.value;if(!status)return;await saveReservationStatus(id,status,btn);});
  box.querySelectorAll('[data-delete-test]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();deleteTestReservation(btn.dataset.deleteTest);});
  box.querySelectorAll('[data-mark-test]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();markReservationAsTest(btn.dataset.markTest);});
  box.querySelectorAll('[data-res-wa]').forEach(btn=>btn.onclick=()=>{const r=allReservations.find(x=>x.id===btn.dataset.resWa);if(!r)return;const n=String(r.guest_whatsapp||'').replace(/\D/g,'');if(n.length<10||n.length>11)return alert('WhatsApp inválido ou incompleto.');const msg=`Olá, ${r.guest_name||''}! Aqui é o Fábio Aelo. Recebi sua solicitação para ${r.property?.title||'a hospedagem'} no período de ${reservationDate(r.checkin)} a ${reservationDate(r.checkout)}, para ${r.guests||'a definir'} hóspedes. Vou confirmar a disponibilidade e os próximos passos.`;window.open(`https://wa.me/55${n}?text=${encodeURIComponent(msg)}`,'_blank','noopener');});
  const missing=filtered.filter(r=>!(r.estimated_total!==null&&r.estimated_total!==undefined&&Number(r.estimated_total)>0));
  if(missing.length && client){
    Promise.all(missing.map(r=>ensureReservationEstimate(r).catch(error=>{console.error('estimate',r.id,error);return null;}))).then(()=>{
      if(missing.some(r=>r.estimated_total!==null&&r.estimated_total!==undefined&&Number(r.estimated_total)>0)) renderReservations();
    });
  }
}
async function refreshReservations(){
  const box=document.getElementById('reservationList'); if(!box) return;
  const {data,error}=await client.from('season_reservations').select('*, property:properties(title,location,nightly_price,weekend_price,cleaning_fee)').order('created_at',{ascending:false}).limit(200);
  if(error){box.innerHTML=`<div class="reservation-empty">Não foi possível carregar as reservas: ${escapeHtml(error.message)}</div>`;return;}
  allReservations=data||[]; renderReservations();
}
document.getElementById('reservationSearch')?.addEventListener('input',renderReservations);
document.getElementById('reservationStatusFilter')?.addEventListener('change',renderReservations);
document.getElementById('refreshReservations')?.addEventListener('click',refreshReservations);

let reservationDetailId=null;
let reservationDetailMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let reservationBlocks=[];

function dateKey(v){return v?String(v).slice(0,10):'';}
function addDaysKey(key,days){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}
function inRange(key,start,end){return !!start&&!!end&&key>=dateKey(start)&&key<dateKey(end);}
function brl(v){return (v===null||v===undefined||v==='')?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

async function calculateReservationTotal(r){
  if(!r?.checkin||!r?.checkout||!r?.property_id) return null;
  const start=dateKey(r.checkin), end=dateKey(r.checkout);
  if(!start||!end||end<=start) return null;
  const p=r.property||{};
  const guests=Number(r.guests||2);
  if(Number(p.max_guests||0)>0 && guests>Number(p.max_guests)) return null;
  const {data:rates,error}=await client.from('season_rate_periods').select('start_date,end_date,nightly_rate').eq('property_id',r.property_id);
  if(error) throw error;
  let total=0;
  for(let d=new Date(start+'T12:00:00'); d<new Date(end+'T12:00:00'); d.setDate(d.getDate()+1)){
    const iso=d.toISOString().slice(0,10);
    const special=(rates||[]).find(x=>iso>=dateKey(x.start_date)&&iso<=dateKey(x.end_date)&&Number(x.nightly_rate)>0);
    let rate=special?Number(special.nightly_rate):0;
    if(!rate){
      const dow=d.getDay();
      rate=((dow===5||dow===6)&&Number(p.weekend_price)>0)?Number(p.weekend_price):Number(p.nightly_price||p.price||0);
    }
    if(!rate) return null;
    total+=rate;
  }
  total+=Number(p.cleaning_fee||0);
  return total>0?total:null;
}

async function ensureReservationEstimate(r){
  if(!r) return null;
  if(r.estimated_total!==null&&r.estimated_total!==undefined&&Number(r.estimated_total)>0) return Number(r.estimated_total);
  const calculated=await calculateReservationTotal(r);
  if(calculated!==null){
    const {error}=await client.from('season_reservations').update({estimated_total:calculated}).eq('id',r.id);
    if(error) throw error;
    r.estimated_total=calculated;
  }
  return calculated;
}

async function openReservationDetail(id){
  const r=allReservations.find(x=>x.id===id); if(!r)return;
  reservationDetailId=id;
  const checkin=new Date((r.checkin||new Date().toISOString().slice(0,10))+'T12:00:00');
  reservationDetailMonth=new Date(checkin.getFullYear(),checkin.getMonth(),1);
  const modal=document.getElementById('reservationDetailModal');
  modal?.classList.add('is-open'); modal?.setAttribute('aria-hidden','false'); document.body.classList.add('reservation-detail-open');
  document.getElementById('reservationDetailTitle').textContent=r.property?.title||'Reserva de temporada';
  document.getElementById('reservationDetailSubtitle').textContent=`${reservationDate(r.checkin)} → ${reservationDate(r.checkout)} · ${r.guests||'—'} hóspedes`;
  document.getElementById('reservationPropertyTitle').textContent=r.property?.title||'Imóvel de temporada';
  document.getElementById('reservationPropertyLocation').textContent=r.property?.location||'Localização não informada';
  document.getElementById('reservationGuestName').textContent=r.guest_name||'Não informado';
  document.getElementById('reservationGuestPhone').textContent=r.guest_whatsapp||'—';
  document.getElementById('reservationCheckin').textContent=reservationDate(r.checkin);
  document.getElementById('reservationCheckout').textContent=reservationDate(r.checkout);
  document.getElementById('reservationGuests').textContent=`${r.guests||'—'} hóspede${Number(r.guests)===1?'':'s'}`;
  const guestProfile=[`${Number(r.adults||0)} adulto${Number(r.adults)===1?'':'s'}`,`${Number(r.children||0)} criança${Number(r.children)===1?'':'s'}`,`${Number(r.babies||0)} bebê${Number(r.babies)===1?'':'s'}`,r.has_pet?`🐾 ${Number(r.pet_count||1)} pet(s)${r.pet_size?` — ${r.pet_size}`:''}`:'🐾 Sem pet',r.has_smoker?'🚬 Fumante':'🚭 Não fumante'].join(' · ');
  document.getElementById('reservationGuestProfile').textContent=guestProfile;
  document.getElementById('reservationTotal').textContent='Calculando…';
  try{
    const estimate=await ensureReservationEstimate(r);
    document.getElementById('reservationTotal').textContent=brl(estimate);
  }catch(error){
    console.error(error);
    document.getElementById('reservationTotal').textContent=brl(r.estimated_total);
  }
  document.getElementById('reservationDetailNote').textContent=r.note||'Nenhuma observação informada.';
  document.getElementById('reservationDetailNoteWrap').classList.toggle('is-empty',!r.note);
  const sel=document.getElementById('reservationDetailStatus'); sel.innerHTML=Object.entries(RES_STATUS).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join(''); sel.value=r.status||'solicitada';
  await loadReservationBlocks(r.property_id);
  renderReservationCalendar();
  renderReservationDetailTestActions();
}
async function loadReservationBlocks(propertyId){
  reservationBlocks=[];
  if(!propertyId||!client)return;
  const {data}=await client.from('season_blocks').select('start_date,end_date,status').eq('property_id',propertyId).limit(200);
  reservationBlocks=data||[];
}
function closeReservationDetail(){
  document.getElementById('reservationDetailModal')?.classList.remove('is-open');
  document.getElementById('reservationDetailModal')?.setAttribute('aria-hidden','true');
  document.body.classList.remove('reservation-detail-open'); reservationDetailId=null;
}
function renderReservationCalendar(){
  const grid=document.getElementById('reservationCalendarGrid'), title=document.getElementById('reservationCalendarMonth'); if(!grid||!title)return;
  const y=reservationDetailMonth.getFullYear(), m=reservationDetailMonth.getMonth();
  title.textContent=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(reservationDetailMonth).replace(/^./,c=>c.toUpperCase());
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const cells=[]; const start=first.getDay(); const total=Math.ceil((start+last.getDate())/7)*7;
  const current=allReservations.find(x=>x.id===reservationDetailId);
  for(let i=0;i<total;i++){
    const d=new Date(y,m,1-start+i); const key=d.toISOString().slice(0,10); const other=allReservations.find(x=>x.id!==reservationDetailId&&x.property_id===current?.property_id&&inRange(key,x.checkin,x.checkout)&&!['cancelada','concluida'].includes(x.status));
    const block=reservationBlocks.find(x=>inRange(key,x.start_date,x.end_date));
    const selected=current&&inRange(key,current.checkin,current.checkout);
    const currentIsActive=current&&['confirmada','aguardando_pagamento','reservada'].includes(current.status);
    const outside=d.getMonth()!==m; const classes=['reservation-day']; if(outside)classes.push('is-outside'); if(selected && !currentIsActive)classes.push('is-selected'); if(other)classes.push('is-busy'); if(block)classes.push('is-blocked'); if(block?.status==='reservado')classes.push('is-reserved'); if(selected && currentIsActive)classes.push('is-reserved'); if(key===dateKey(current?.checkin))classes.push('is-checkin'); if(key===dateKey(current?.checkout))classes.push('is-checkout');
    let titleText='Disponível'; if(block)titleText=block.status==='reservado'?'Reservado':'Bloqueado'; if(other)titleText=`${RES_STATUS[other.status]?.label||'Ocupado'} — ${other.guest_name||'Outra reserva'}`; if(selected)titleText=currentIsActive?'Período reservado':'Período desta solicitação';
    cells.push(`<button type="button" class="${classes.join(' ')}" title="${escapeHtml(titleText)}" ${outside?'tabindex="-1"':''}><span>${d.getDate()}</span>${selected?'<i>•</i>':''}</button>`);
  }
  grid.innerHTML=cells.join('');
}
document.getElementById('closeReservationDetail')?.addEventListener('click',closeReservationDetail);
document.getElementById('reservationPrevMonth')?.addEventListener('click',()=>{reservationDetailMonth.setMonth(reservationDetailMonth.getMonth()-1);renderReservationCalendar();});
document.getElementById('reservationNextMonth')?.addEventListener('click',()=>{reservationDetailMonth.setMonth(reservationDetailMonth.getMonth()+1);renderReservationCalendar();});
document.getElementById('reservationDetailModal')?.addEventListener('click',e=>{if(e.target.id==='reservationDetailModal')closeReservationDetail();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&reservationDetailId)closeReservationDetail();});
async function syncReservationBlock(id,status){
  if(!client||!id) return;
  const reservation=allReservations.find(x=>x.id===id);
  if(!reservation) return;
  const activeStatuses=['confirmada','reservada'];
  const shouldBlock=activeStatuses.includes(status) && reservation.checkin && reservation.checkout && reservation.property_id;
  const startDate=dateKey(reservation.checkin), endDate=dateKey(reservation.checkout);
  if(shouldBlock){
    const {data:existing,error:findError}=await client.from('season_blocks').select('id').eq('property_id',reservation.property_id).eq('start_date',startDate).eq('end_date',endDate).eq('status','reservado').limit(1);
    if(findError) throw findError;
    if(!existing?.length){
      const {data:{user}}=await client.auth.getUser();
      const {error}=await client.from('season_blocks').insert({property_id:reservation.property_id,start_date:startDate,end_date:endDate,status:'reservado',created_by:user?.id||null});
      if(error) throw error;
    }
  }else{
    const {error}=await client.from('season_blocks').delete().eq('property_id',reservation.property_id).eq('start_date',startDate).eq('end_date',endDate).eq('status','reservado');
    if(error) throw error;
  }
}

async function saveReservationStatus(id,status,btn){
  if(!id||!status||!client)return;
  const original=btn?.textContent||'Salvar status';
  if(btn){btn.disabled=true;btn.textContent='Salvando…';}
  try{
    // 1) Salva SOMENTE o status da reserva primeiro.
    // Não usamos .select() na mesma operação: isso evita que uma falha
    // de retorno do PostgREST seja confundida com falha de atualização.
    const {error:updateError}=await client
      .from('season_reservations')
      .update({status,updated_at:new Date().toISOString()})
      .eq('id',id);
    if(updateError) throw updateError;

    // 2) Confirma no banco que o status realmente foi gravado.
    const {data:check,error:checkError}=await client
      .from('season_reservations')
      .select('id,status')
      .eq('id',id)
      .maybeSingle();
    if(checkError) throw checkError;
    if(!check || check.status!==status){
      throw new Error('O status não foi confirmado pelo banco de dados. Verifique sua sessão administrativa e as permissões da reserva.');
    }

    const local=allReservations.find(x=>x.id===id);
    if(local) local.status=status;
    if(btn)btn.textContent='Status salvo ✓';

    // 3) Sincroniza o calendário separadamente. Se houver problema no
    // bloqueio, o status continua salvo e mostramos a informação ao usuário.
    let blockError=null;
    try{
      await syncReservationBlock(id,status);
    }catch(err){
      blockError=err;
      console.error('Falha ao sincronizar bloqueio:',err);
    }

    await refreshReservations();
    const updated=allReservations.find(x=>x.id===id);
    if(reservationDetailId===id && updated){
      const detail=document.getElementById('reservationDetailStatus');
      if(detail) detail.value=updated.status||status;
      await loadReservationBlocks(updated.property_id);
      renderReservationCalendar();
    }

    if(blockError){
      alert(`Status salvo com sucesso como “${RES_STATUS[status]?.label||status}”.\n\nO calendário não pôde sincronizar o bloqueio: ${blockError.message||blockError}`);
    }
    setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent=original;}},1200);
  }catch(error){
    if(btn){btn.disabled=false;btn.textContent=original;}
    alert(error?.message||'Não foi possível salvar o status.');
  }
}

document.getElementById('reservationDetailSave')?.addEventListener('click',async()=>{
  const r=allReservations.find(x=>x.id===reservationDetailId); if(!r)return; const status=document.getElementById('reservationDetailStatus')?.value; if(!status)return;
  await saveReservationStatus(r.id,status,document.getElementById('reservationDetailSave'));
});
document.getElementById('reservationDetailWhatsApp')?.addEventListener('click',()=>{
  const r=allReservations.find(x=>x.id===reservationDetailId); if(!r)return; const n=String(r.guest_whatsapp||'').replace(/\D/g,''); if(n.length<10||n.length>11)return alert('WhatsApp inválido ou incompleto.');
  const msg=`Olá, ${r.guest_name||''}! Aqui é o Fábio Aelo. Recebi sua solicitação para ${r.property?.title||'a hospedagem'} no período de ${reservationDate(r.checkin)} a ${reservationDate(r.checkout)}, para ${r.guests||'a definir'} hóspedes. Vou confirmar a disponibilidade e os próximos passos.`;
  window.open(`https://wa.me/55${n}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
});

async function refreshLeads(){
  const box=document.getElementById('leadList'); if(!box) return;
  const [leadRes, interactionRes] = await Promise.all([
    client.from('leads').select('*').order('created_at',{ascending:false}).limit(100),
    client.from('lead_interactions').select('*').order('created_at',{ascending:false}).limit(500)
  ]);
  if(leadRes.error){box.innerHTML=`<div class="lead-empty">Não foi possível carregar os leads: ${escapeHtml(leadRes.error.message)}</div>`; return;}
  allLeads=leadRes.data||[];
  allInteractions=interactionRes.error ? [] : (interactionRes.data||[]);
  populateLeadRegionFilter();
  renderLeadDashboard();
  renderCommercialIntelligence();
  loadAnalytics(Number(document.getElementById('analyticsPeriod')?.value || 30));
}
function populateLeadRegionFilter(){
  const sel=document.getElementById('leadRegionFilter'); if(!sel) return;
  const current=sel.value||'todos';
  const regions=[...new Set(allLeads.map(l=>String(l.region||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  sel.innerHTML='<option value="todos">Todas</option>'+regions.map(r=>`<option value="${escapeHtml(r).replace(/"/g,'&quot;')}">${escapeHtml(r)}</option>`).join('');
  if(regions.includes(current)) sel.value=current; else sel.value='todos';
}
['leadSearch','leadStatusFilter','leadInterestFilter','leadRegionFilter','leadBedroomsFilter'].forEach(id=>{document.getElementById(id)?.addEventListener('input',applyLeadFilters);document.getElementById(id)?.addEventListener('change',applyLeadFilters)});
document.querySelectorAll('.quick-filter').forEach(btn=>btn.addEventListener('click',()=>setQuickFilter(btn.dataset.quickFilter)));
document.getElementById('clearLeadFilters')?.addEventListener('click',()=>{document.getElementById('leadSearch').value='';document.getElementById('leadStatusFilter').value='todos';document.getElementById('leadInterestFilter').value='todos';document.getElementById('leadRegionFilter').value='todos';document.getElementById('leadBedroomsFilter').value='todos';setQuickFilter('todos');});

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
  if (session) { $("loginCard").classList.add("hidden"); $("dashboard").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden"); refresh(); refreshLeads(); refreshReservations(); loadPartnerBrokers(); initSaleProcesses(); }
  else { $("dashboard").classList.add("hidden"); $("editor").classList.add("hidden"); $("loginCard").classList.remove("hidden"); $("logoutBtn").classList.add("hidden"); }
}
function showMsg(id,text){$(id).textContent=text||""}

$("loginForm").addEventListener("submit", async e => { e.preventDefault(); showMsg("loginMsg","Entrando..."); const {error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value}); showMsg("loginMsg",error?error.message:""); });
$("logoutBtn").addEventListener("click",()=>client.auth.signOut());
$("newBtn").addEventListener("click",()=>openEditor());
$("cancelBtn").addEventListener("click",()=>$("editor").classList.add("hidden"));

function openEditor(p=null){
  $("editor").classList.remove("hidden"); $("dashboard").classList.add("hidden"); $("editorTitle").textContent=p?"Editar imóvel":"Novo imóvel"; $("propertyId").value=p?.id||"";
  $("title").value=p?.title||""; $("type").value=p?.type||"venda"; $("location").value=p?.location||""; $("price").value=p?.price||""; $("priceLabel").value=p?.price_label||""; $("bedrooms").value=p?.bedrooms||0; $("suites").value=p?.suites||0; $("parking").value=p?.parking||0; $("area").value=p?.area_m2||""; $("propertyCategory").value=p?.property_category||""; $("nightlyPrice").value=p?.type==='temporada'?(p?.price||''):(p?.nightly_price||''); $("weekendPrice").value=p?.weekend_price||''; $("highSeasonPrice").value=p?.high_season_price||''; $("cleaningFee").value=p?.cleaning_fee||''; $("minNights").value=p?.min_nights||1; $("maxGuests").value=p?.max_guests||''; $("checkinTime").value=p?.checkin_time||''; $("checkoutTime").value=p?.checkout_time||''; $("description").value=p?.description||""; $("published").checked=p?.is_published!==false; $("commercialStatus").value=p?.commercial_status||"disponivel"; $("soldBy").value=p?.sold_by||"aelo"; $("partnerName").value=p?.partner_name||""; $("partnerCreci").value=p?.partner_creci||""; renderPartnerSelect(); const matchedPartner=partnerBrokers.find(x=>x.name===p?.partner_name && (x.creci||"")===(p?.partner_creci||"")); $("partnerBrokerSelect").value=matchedPartner?.id||((p?.partner_name||p?.partner_creci)?"__manual__":""); syncSoldFields(); syncSeasonFields(); $("imageFile").value=""; const existingGallery=Array.isArray(p?.gallery_urls)?p.gallery_urls:(p?.image_url?[p.image_url]:[]); $("currentImage").textContent=existingGallery.length?`${existingGallery.length} foto(s) cadastrada(s). Escolha novas para substituir a galeria.`:""; $("propertyForm").dataset.imageUrl=p?.image_url||""; $("propertyForm").dataset.galleryUrls=JSON.stringify(existingGallery); renderPhotoPreviews([]); loadSeasonManagers(p?.id||""); window.scrollTo({top:0,behavior:"smooth"});
}
window.editProperty = async id => { const {data,error}=await client.from("properties").select("*").eq("id",id).single(); if(error) return alert(error.message); openEditor(data); };
window.deleteProperty = async id => { if(!confirm("Excluir este imóvel?")) return; const {error}=await client.from("properties").delete().eq("id",id); if(error) alert(error.message); else refresh(); };

function loadImageFromFile(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{ URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror=()=>{ URL.revokeObjectURL(img.src); reject(new Error('Não foi possível ler a imagem.')); };
    img.src=URL.createObjectURL(file);
  });
}
function loadImageFromUrl(url){
  return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=url+'?v=49.2'; });
}
async function createAeloWatermarkedPhoto(file, index=0){
  // V48.10: a logo is NOT burned into the uploaded image.
  // The original AELO logo is displayed as a separate overlay in the gallery.
  const img=await loadImageFromFile(file);
  const maxSide=1800;
  const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
  const h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,0,0,w,h);
  // Tratamento leve de imagem: preserva composição e características reais.
  if($('photoStudio')?.checked!==false){
    const imageData=ctx.getImageData(0,0,w,h); const d=imageData.data;
    for(let i=0;i<d.length;i+=4){
      d[i]=Math.min(255,Math.max(0,(d[i]-128)*1.035+130));
      d[i+1]=Math.min(255,Math.max(0,(d[i+1]-128)*1.035+130));
      d[i+2]=Math.min(255,Math.max(0,(d[i+2]-128)*1.035+130));
    }
    ctx.putImageData(imageData,0,0);
  }
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível processar a foto.')),'image/jpeg',0.90));
}
async function renderPhotoPreviews(files){
  const wrap=$('photoPreview'); if(!wrap) return;
  wrap.innerHTML=''; const selected=Array.from(files||[]);
  if(!selected.length){ wrap.innerHTML='<div class="photo-preview-empty">As fotos selecionadas aparecerão aqui antes de salvar.</div>'; return; }
  if(selected.length>10){ wrap.innerHTML='<div class="photo-preview-empty">Selecione no máximo 10 fotos.</div>'; return; }
  const studioEnabled=$('photoStudio')?.checked!==false;
  for(let i=0;i<selected.length;i++){
    const card=document.createElement('div'); card.className='photo-preview-card';
    const img=document.createElement('img'); img.alt=`Prévia da foto ${i+1}`;
    const caption=document.createElement('span'); caption.textContent=i===0?'Foto 1 • Principal':`Foto ${i+1}`;
    card.appendChild(img); card.appendChild(caption); wrap.appendChild(card);
    try{
      const processed=studioEnabled?await createAeloWatermarkedPhoto(selected[i],i):selected[i];
      img.src=URL.createObjectURL(processed);
    }catch(err){ caption.textContent=`Foto ${i+1} • não foi possível pré-visualizar`; }
  }
}

async function uploadImages(files,userId){
  const selected=Array.from(files||[]);
  if(!selected.length){
    const existing=JSON.parse($('propertyForm').dataset.galleryUrls||'[]');
    return existing.length?existing:($('propertyForm').dataset.imageUrl?[$('propertyForm').dataset.imageUrl]:[]);
  }
  if(selected.length>10) throw new Error('Escolha no máximo 10 fotos por imóvel.');
  const urls=[]; const studioEnabled=$('photoStudio')?.checked!==false;
  for(const file of selected){
    const uploadBlob=studioEnabled?await createAeloWatermarkedPhoto(file,0):file;
    const path=`${userId}/${crypto.randomUUID()}.jpg`;
    const {error}=await client.storage.from('property-images').upload(path,uploadBlob,{upsert:false,contentType:'image/jpeg'});
    if(error) throw error;
    const {data}=client.storage.from('property-images').getPublicUrl(path); urls.push(data.publicUrl);
  }
  return urls;
}

$("imageFile")?.addEventListener("change",e=>renderPhotoPreviews(e.target.files));
$("photoStudio")?.addEventListener("change",()=>renderPhotoPreviews($("imageFile")?.files||[]));
$("photoWatermark")?.addEventListener("change",()=>renderPhotoPreviews($("imageFile")?.files||[]));

$("propertyForm").addEventListener("submit",async e=>{
 e.preventDefault(); showMsg("saveMsg","Salvando...");
 const {data:{user}}=await client.auth.getUser(); if(!user){showMsg("saveMsg","Sessão expirada.");return;}
 try{
  const galleryUrls=await uploadImages($("imageFile").files,user.id);
  const imageUrl=galleryUrls[0] || null;
  const sold=$("commercialStatus").value==="vendido"; const partner=sold && $("soldBy").value==="parceiro"; const season=$("type").value==="temporada"; const price=season?Number($("nightlyPrice").value||$("price").value||0):Number($("price").value||0); const payload={owner_id:user.id,title:$("title").value.trim(),type:$("type").value,badge:season?"TEMPORADA":$("type").value.toUpperCase(),location:$("location").value.trim(),price,price_label:$("priceLabel").value.trim()||null,property_category:$("propertyCategory").value||null,nightly_price:season?price:null,weekend_price:season?(Number($("weekendPrice").value||0)||null):null,high_season_price:season?(Number($("highSeasonPrice").value||0)||null):null,cleaning_fee:season?(Number($("cleaningFee").value||0)||null):null,min_nights:season?(Number($("minNights").value||1)||1):null,max_guests:season?(Number($("maxGuests").value||0)||null):null,checkin_time:season?$("checkinTime").value.trim()||null:null,checkout_time:season?$("checkoutTime").value.trim()||null:null,allow_children:season?$("allowChildren").checked:null,allow_babies:season?$("allowBabies").checked:null,allow_pets:season?$("allowPets").checked:null,max_pet_size:season?$("maxPetSize").value||null:null,allow_smoking:season?$("allowSmoking").checked:null,allow_parties:season?$("allowParties").checked:null,season_rules:season?$("seasonRulesText").value.trim()||null:null,bedrooms:Number($("bedrooms").value||0),suites:Number($("suites").value||0),parking:Number($("parking").value||0),area_m2:Number($("area").value||0)||null,image_url:imageUrl,description:$("description").value.trim(),gallery_urls:galleryUrls,is_published:$("published").checked,commercial_status:$("commercialStatus").value,sold_by:sold ? $("soldBy").value : null,partner_name:partner ? $("partnerName").value.trim()||null : null,partner_creci:partner ? $("partnerCreci").value.trim()||null : null};
  const id=$("propertyId").value; if(id && payload.commercial_status==="vendido" && !payload.sold_at){ const {data:oldProp}=await client.from("properties").select("sold_at,commercial_status").eq("id",id).single(); payload.sold_at=oldProp?.sold_at||new Date().toISOString(); } if(id && payload.commercial_status!=="vendido") payload.sold_at=null; const result=id?await client.from("properties").update(payload).eq("id",id):await client.from("properties").insert(payload); if(result.error) throw result.error;
  $("editor").classList.add("hidden"); $("dashboard").classList.remove("hidden"); showMsg("saveMsg",""); refresh();
 }catch(err){showMsg("saveMsg",err.message)}
});
$("commercialStatus")?.addEventListener("change",syncSoldFields); $("soldBy")?.addEventListener("change",syncSoldFields); $("partnerBrokerSelect")?.addEventListener("change",()=>{syncPartnerSelection();syncSoldFields();}); $("type")?.addEventListener("change",syncSeasonFields); initPartnerManager();
start();
syncSeasonFields();

loadAnalytics(30);
