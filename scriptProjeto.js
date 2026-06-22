/* Ecossistema de Inovação de Santarém — lógica do painel (usa as classes do projeto) */
(function () {
  const D = window.DADOS || { projetos: [], grupos: [], laboratorios: [] };
  const PROJ = D.projetos, GRUP = D.grupos, LAB = D.laboratorios;
  const PALETTE = ["#2f3a73","#596AB6","#2bb6a3","#f2a93b","#d4537e","#7E8CD0","#1d9e75","#b07535","#8c6bb1","#5f6b8a","#46c4b3"];
  const fmt = new Intl.NumberFormat("pt-BR");
  const norm = s => (s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const el = id => document.getElementById(id);
  const esc = s => (s||"").toString().replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

  let q = "";
  const fProj = { ano: "" }, fLab = { inst: "" }, fGrup = { area: "" };

  const countBy = (arr,key) => { const m={}; arr.forEach(o=>{const k=o[key]||"—";m[k]=(m[k]||0)+1;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); };
  const sumBy = (arr,key,val) => { const m={}; arr.forEach(o=>{const k=o[key]||"—";m[k]=(m[k]||0)+(+o[val]||0);}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); };

  /* KPIs (classes .kpis/.kpi/.lab/.val do projeto) */
  function renderKPIs() {
    const totalEquip = LAB.reduce((s,l)=>s+(+l.nEquip||0),0);
    const pesquisadores = GRUP.reduce((s,g)=>s+(+g.pesquisadores||0),0);
    const instituicoes = new Set([...GRUP.map(g=>g.instituicao), ...LAB.map(l=>l.instituicao)].filter(Boolean));
    const cards = [
      [PROJ.length,"Projetos de pesquisa"],[GRUP.length,"Grupos de pesquisa"],
      [LAB.length,"Laboratórios"],[totalEquip,"Equipamentos"],
      [pesquisadores,"Pesquisadores"],[instituicoes.size,"Instituições"],
    ];
    el("stats").innerHTML = cards.map(([v,l]) =>
      `<div class="kpi"><div class="lab">${l}</div><div class="val">${fmt.format(v)}</div></div>`).join("");
  }

  /* Gráficos (Chart.js sobre .canvas/.viz do projeto) */
  let charts = [];
  const destroyCharts = () => { charts.forEach(c=>c.destroy()); charts=[]; };
  function donut(id, pairs) {
    const labels=pairs.map(p=>p[0]), data=pairs.map(p=>p[1]);
    charts.push(new Chart(el(id),{type:"doughnut",
      data:{labels,datasets:[{data,backgroundColor:labels.map((_,i)=>PALETTE[i%PALETTE.length]),borderColor:"#fff",borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:"56%",
        plugins:{legend:{position:"right",labels:{boxWidth:11,font:{size:11.5,family:"Segoe UI"},color:"#605e5c",padding:8}},
          tooltip:{callbacks:{label:c=>{const t=c.dataset.data.reduce((a,b)=>a+b,0);const p=t?(c.parsed/t*100).toFixed(1):0;return ` ${c.label}: ${fmt.format(c.parsed)} (${p}%)`;}}}}}}));
  }
  function barH(id, pairs, color, un="") {
    charts.push(new Chart(el(id),{type:"bar",
      data:{labels:pairs.map(p=>p[0]),datasets:[{data:pairs.map(p=>p[1]),backgroundColor:color,borderRadius:4,maxBarThickness:26}]},
      options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt.format(c.parsed.x)} ${un}`}}},
        scales:{x:{ticks:{font:{size:11},color:"#8a8886"},grid:{color:"#edebe9"}},y:{ticks:{font:{size:11.5,family:"Segoe UI"},color:"#605e5c"},grid:{display:false}}}}}));
  }
  function barV(id, pairs, color, un="") {
    charts.push(new Chart(el(id),{type:"bar",
      data:{labels:pairs.map(p=>p[0]),datasets:[{data:pairs.map(p=>p[1]),backgroundColor:color,borderRadius:4,maxBarThickness:34}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt.format(c.parsed.y)} ${un}`}}},
        scales:{x:{ticks:{font:{size:11},color:"#605e5c"},grid:{display:false}},y:{ticks:{font:{size:11},color:"#8a8886"},grid:{color:"#edebe9"}}}}}));
  }
  function renderCharts() {
    destroyCharts();
    donut("chArea", countBy(GRUP,"grandeArea"));
    barH("chInst", sumBy(GRUP,"instituicao","pesquisadores").slice(0,6), "#596AB6", "pesquisadores");
    const anos = countBy(PROJ,"ano").filter(p=>p[0]&&p[0]!=="—").sort((a,b)=>a[0].localeCompare(b[0]));
    barV("chAno", anos, "#2bb6a3", "projetos");
    donut("chLabArea", countBy(LAB,"areaPrincipal").filter(p=>p[0]!=="—").slice(0,8));
  }

  /* Cards usando .project-card / .lab-card / .tag do projeto */
  function projetoCard(p) {
    const cls = /finaliz/i.test(p.situacao) ? "fin" : (/andamento|exec/i.test(p.situacao) ? "and" : "");
    const chips = (p.palavras||"").split(/[;,]/).map(s=>s.trim()).filter(Boolean).slice(0,3)
      .map(c=>`<span class="chip">${esc(c)}</span>`).join("");
    return `<article class="project-card">
      <div class="card-top"><span class="tag ${cls}">${esc(p.situacao||"Projeto")}</span><span class="badge">${esc(p.ano)}</span></div>
      <h3>${esc(p.titulo)}</h3>
      <div class="card-meta"><b>Coord.:</b> ${esc(p.coordenador||"—")} · <b>Centro:</b> ${esc(p.centro||"—")}</div>
      ${p.resumo?`<div class="card-desc">${esc(p.resumo.slice(0,170))}${p.resumo.length>170?"…":""}</div>`:""}
      ${chips?`<div class="card-chips">${chips}</div>`:""}
      <div class="card-foot"><span>${esc(p.grupo||p.linha||"UFOPA")}</span><span>${esc(p.codigo)}</span></div>
    </article>`;
  }
  function labCard(l) {
    const tecs = (l.tecnicas||[]).slice(0,4).map(t=>`<span class="chip">${esc(t)}</span>`).join("");
    return `<article class="lab-card">
      <div class="card-top"><span class="tag">${esc(l.instituicao||"—")}</span><span class="badge">${l.nEquip||0} equip.</span></div>
      <h4>${esc(l.nome)}</h4>
      <div class="card-meta"><b>Área:</b> ${esc(l.areaPrincipal||"—")} · <b>${esc(l.cidade||"Santarém")}</b></div>
      ${l.sobre?`<div class="card-desc">${esc(l.sobre.slice(0,140))}${l.sobre.length>140?"…":""}</div>`:""}
      ${tecs?`<div class="card-chips">${tecs}</div>`:""}
      <div class="card-foot"><span>${esc(l.responsavel||"")}</span><span>${(l.areas||[]).length} área(s)</span></div>
    </article>`;
  }
  function grupoCard(g) {
    return `<article class="project-card">
      <div class="card-top"><span class="tag">${esc(g.instituicao||"—")}</span><span class="badge">${esc(g.ano)}</span></div>
      <h3>${esc(g.nome)}</h3>
      <div class="card-meta"><b>${esc(g.grandeArea||"—")}</b> · ${esc(g.area||"")}<br>${esc(g.cidade||"")} · ${esc(g.situacao||"")}</div>
      <div class="card-chips">
        <span class="chip">${g.pesquisadores} pesquisadores</span>
        <span class="chip">${g.estudantes} estudantes</span>
        <span class="chip">${g.linhas} linhas</span>
        <span class="chip">${g.doutores} doutores</span>
      </div>
    </article>`;
  }

  function renderProjetos() {
    let arr = PROJ.filter(p=>!fProj.ano||p.ano===fProj.ano);
    if (q) arr = arr.filter(p=>norm(p.titulo+p.coordenador+p.palavras+p.resumo+p.grupo).includes(q));
    el("projCount").textContent = `${arr.length} projeto(s)`;
    el("projectGrid").innerHTML = arr.length ? arr.slice(0,300).map(projetoCard).join("") : `<div class="empty">Nenhum projeto encontrado.</div>`;
  }
  function renderLabs() {
    let arr = LAB.filter(l=>!fLab.inst||l.instituicao===fLab.inst);
    if (q) arr = arr.filter(l=>norm(l.nome+l.areaPrincipal+(l.areas||[]).join(" ")+(l.tecnicas||[]).join(" ")+l.sobre).includes(q));
    el("labCount").textContent = `${arr.length} laboratório(s)`;
    el("labGrid").innerHTML = arr.length ? arr.map(labCard).join("") : `<div class="empty">Nenhum laboratório encontrado.</div>`;
  }
  function renderGrupos() {
    let arr = GRUP.filter(g=>!fGrup.area||g.grandeArea===fGrup.area);
    if (q) arr = arr.filter(g=>norm(g.nome+g.area+g.grandeArea+g.instituicao+g.cidade).includes(q));
    el("grupCount").textContent = `${arr.length} grupo(s)`;
    el("grupGrid").innerHTML = arr.length ? arr.map(grupoCard).join("") : `<div class="empty">Nenhum grupo encontrado.</div>`;
  }
  function renderTabela() {
    const rows = [];
    PROJ.forEach(p=>rows.push(["Projeto",p.titulo,p.grandeArea!=="Não classificada"?p.grandeArea:(p.centro||"—"),`${p.coordenador||""} · ${p.ano||""}`]));
    LAB.forEach(l=>rows.push(["Laboratório",l.nome,l.areaPrincipal||"—",`${l.instituicao||""} · ${l.nEquip||0} equip.`]));
    GRUP.forEach(g=>rows.push(["Grupo",g.nome,g.grandeArea||"—",`${g.instituicao||""} · ${g.pesquisadores} pesq.`]));
    let arr = q ? rows.filter(r=>norm(r.join(" ")).includes(q)) : rows;
    el("tabCount").textContent = `${arr.length} registro(s)`;
    el("tabelaGeral").innerHTML = arr.length
      ? arr.slice(0,1200).map(r=>`<tr><td style="font-weight:700;color:#596ab6;white-space:nowrap">${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">Nenhum registro encontrado.</td></tr>`;
  }

  const fillSelect = (id,pairs,allTxt) => el(id).innerHTML = `<option value="">${allTxt}</option>`+pairs.map(([v,n])=>`<option value="${esc(v)}">${esc(v)} (${n})</option>`).join("");
  function initFilters() {
    fillSelect("projAno", countBy(PROJ,"ano").filter(p=>p[0]&&p[0]!=="—").sort((a,b)=>b[0].localeCompare(a[0])), "Todos os anos");
    fillSelect("labInst", countBy(LAB,"instituicao").filter(p=>p[0]!=="—"), "Todas as instituições");
    fillSelect("grupArea", countBy(GRUP,"grandeArea"), "Todas as grandes áreas");
    el("projAno").onchange = e=>{fProj.ano=e.target.value;renderProjetos();};
    el("labInst").onchange = e=>{fLab.inst=e.target.value;renderLabs();};
    el("grupArea").onchange = e=>{fGrup.area=e.target.value;renderGrupos();};
    el("searchInput").oninput = e=>{q=norm(e.target.value.trim());renderActive();};
  }

  let active = "geral";
  const SECOES = ["geral","projetos","laboratorios","grupos","tabela"];
  function renderActive() {
    if (active==="projetos") renderProjetos();
    else if (active==="laboratorios") renderLabs();
    else if (active==="grupos") renderGrupos();
    else if (active==="tabela") renderTabela();
    else renderCharts();
  }
  window.mostrarSecao = function (nome) {
    active = nome;
    SECOES.forEach(s=>el("secao-"+s).classList.toggle("ativa", s===nome));
    document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active", b.dataset.sec===nome));
    document.querySelectorAll("[data-filtro]").forEach(f=>f.style.display = (f.dataset.filtro===nome ? "flex" : "none"));
    renderActive();
  };

  function boot() {
    if (!window.DADOS) { document.querySelector("main").insertAdjacentHTML("beforeend",
      '<div class="empty" style="padding:50px">Não encontrei <b>dataProjeto.js</b>. Mantenha-o na mesma pasta do index.html.</div>'); return; }
    renderKPIs(); initFilters(); mostrarSecao("geral");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();