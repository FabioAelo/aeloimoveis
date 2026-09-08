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

async function start() {
  if (!client) return;
  const { data:{session} } = await client.auth.getSession();
  showSession(session);
  client.auth.onAuthStateChange((_event, session) => showSession(session));
}
function showSession(session) {
  if (session) { $("loginCard").classList.add("hidden"); $("dashboard").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden"); refresh(); }
  else { $("dashboard").classList.add("hidden"); $("editor").classList.add("hidden"); $("loginCard").classList.remove("hidden"); $("logoutBtn").classList.add("hidden"); }
}
function showMsg(id,text){$(id).textContent=text||""}

$("loginForm").addEventListener("submit", async e => { e.preventDefault(); showMsg("loginMsg","Entrando..."); const {error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value}); showMsg("loginMsg",error?error.message:""); });
$("logoutBtn").addEventListener("click",()=>client.auth.signOut());
$("newBtn").addEventListener("click",()=>openEditor());
$("cancelBtn").addEventListener("click",()=>$("editor").classList.add("hidden"));

function openEditor(p=null){
  $("editor").classList.remove("hidden"); $("dashboard").classList.add("hidden"); $("editorTitle").textContent=p?"Editar imóvel":"Novo imóvel"; $("propertyId").value=p?.id||"";
  $("title").value=p?.title||""; $("type").value=p?.type||"venda"; $("location").value=p?.location||""; $("price").value=p?.price||""; $("priceLabel").value=p?.price_label||""; $("bedrooms").value=p?.bedrooms||0; $("suites").value=p?.suites||0; $("parking").value=p?.parking||0; $("area").value=p?.area_m2||""; $("description").value=p?.description||""; $("published").checked=p?.is_published!==false; $("imageFile").value=""; $("currentImage").textContent=p?.image_url?"Foto atual cadastrada. Escolha outra para substituir.":""; $("propertyForm").dataset.imageUrl=p?.image_url||""; window.scrollTo({top:0,behavior:"smooth"});
}
window.editProperty = async id => { const {data,error}=await client.from("properties").select("*").eq("id",id).single(); if(error) return alert(error.message); openEditor(data); };
window.deleteProperty = async id => { if(!confirm("Excluir este imóvel?")) return; const {error}=await client.from("properties").delete().eq("id",id); if(error) alert(error.message); else refresh(); };

async function uploadImage(file,userId){
  if(!file) return $("propertyForm").dataset.imageUrl || null;
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase(); const path=`${userId}/${crypto.randomUUID()}.${ext}`;
  const {error}=await client.storage.from("property-images").upload(path,file,{upsert:false,contentType:file.type}); if(error) throw error;
  const {data}=client.storage.from("property-images").getPublicUrl(path); return data.publicUrl;
}

$("propertyForm").addEventListener("submit",async e=>{
 e.preventDefault(); showMsg("saveMsg","Salvando...");
 const {data:{user}}=await client.auth.getUser(); if(!user){showMsg("saveMsg","Sessão expirada.");return;}
 try{
  const imageUrl=await uploadImage($("imageFile").files[0],user.id);
  const payload={owner_id:user.id,title:$("title").value.trim(),type:$("type").value,badge:$("type").value.toUpperCase(),location:$("location").value.trim(),price:Number($("price").value||0),price_label:$("priceLabel").value.trim()||null,bedrooms:Number($("bedrooms").value||0),suites:Number($("suites").value||0),parking:Number($("parking").value||0),area_m2:Number($("area").value||0)||null,image_url:imageUrl,description:$("description").value.trim(),is_published:$("published").checked};
  const id=$("propertyId").value; const result=id?await client.from("properties").update(payload).eq("id",id):await client.from("properties").insert(payload); if(result.error) throw result.error;
  $("editor").classList.add("hidden"); $("dashboard").classList.remove("hidden"); showMsg("saveMsg",""); refresh();
 }catch(err){showMsg("saveMsg",err.message)}
});
start();
