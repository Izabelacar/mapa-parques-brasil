const data = window.APP_DATA;
const $ = (id) => document.getElementById(id);

function textoSeguro(valor) {
  return valor || 'Não informado';
}

function renderStats(){
  const labels = [
    ['instituicoes','Institutos, campi e cursos'],
    ['pos','Programas de pós-graduação'],
    ['labs','Laboratórios e centros'],
    ['areas','Áreas classificadas']
  ];

  $('stats').innerHTML = labels.map(([k,l]) => `
    <article class="kpi-card">
      <span>${l}</span>
      <strong>${data.stats[k]}</strong>
    </article>
  `).join('');
}

function renderFilters(){
  $('areaFilter').innerHTML = '<option value="">Todas as áreas</option>' +
    data.areas.map(a => `<option value="${a}">${a}</option>`).join('');
}

function filtrar(lista) {
  const term = $('searchInput').value.toLowerCase();
  const area = $('areaFilter').value;

  return lista.filter(item => {
    const bateArea = !area || item.area === area;
    const bateBusca = JSON.stringify(item).toLowerCase().includes(term);
    return bateArea && bateBusca;
  });
}

function renderProjects(){
  const filtered = filtrar(data.projects);

  $('projectGrid').innerHTML = filtered.map(p => `
    <article class="project-card">
      <span class="tag">${textoSeguro(p.area)}</span>
      <h3>${textoSeguro(p.nome)}</h3>
      <p>${textoSeguro(p.descricao)}</p>
      <h4>Infraestrutura relacionada</h4>
      <ul class="infra-list">
        ${(p.infra || []).map(i => `<li>${i}</li>`).join('') || '<li>Não informada</li>'}
      </ul>
    </article>
  `).join('') || '<p class="tabela-vazia">Nenhum projeto encontrado.</p>';
}

function renderLabs(){
  const filtered = filtrar(data.labs);

  $('labGrid').innerHTML = filtered.map(l => `
    <article class="lab-card">
      <span class="area-dot">${textoSeguro(l.area)}</span>
      <h4>${textoSeguro(l.nome)}</h4>
      <p>Infraestrutura disponível para apoiar projetos, pesquisa, formação e inovação.</p>
    </article>
  `).join('') || '<p class="tabela-vazia">Nenhuma infraestrutura encontrada.</p>';
}

function renderLists(){
  $('posList').innerHTML = data.pos.map(p => `<li>${textoSeguro(p.nome)}</li>`).join('');
  $('instList').innerHTML = data.instituicoes.map(i => `
    <li><strong>${textoSeguro(i.nucleo || i.tipo || 'Ecossistema')}</strong> — ${textoSeguro(i.nome)}</li>
  `).join('');
}

function renderTabela(){
  const linhas = [
    ...data.projects.map(p => ({tipo: 'Projeto', nome: p.nome, area: p.area, desc: p.descricao})),
    ...data.labs.map(l => ({tipo: 'Infraestrutura', nome: l.nome, area: l.area, desc: 'Laboratório, centro ou núcleo de apoio'})),
    ...data.pos.map(p => ({tipo: 'Pós-graduação', nome: p.nome, area: 'Formação', desc: 'Programa de pós-graduação'})),
    ...data.instituicoes.map(i => ({tipo: i.tipo || 'Instituição', nome: i.nome, area: i.area || 'Acadêmica', desc: i.nucleo || 'Base do ecossistema'}))
  ];

  const term = $('searchInput').value.toLowerCase();
  const area = $('areaFilter').value;
  const filtradas = linhas.filter(l => {
    const bateArea = !area || l.area === area;
    const bateBusca = JSON.stringify(l).toLowerCase().includes(term);
    return bateArea && bateBusca;
  });

  $('tabelaGeral').innerHTML = filtradas.map(l => `
    <tr>
      <td class="col-nivel-micro">${textoSeguro(l.tipo)}</td>
      <td>${textoSeguro(l.nome)}</td>
      <td class="col-nivel-meso">${textoSeguro(l.area)}</td>
      <td>${textoSeguro(l.desc)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="tabela-vazia">Nenhum registro encontrado.</td></tr>';
}

function renderAll(){
  renderProjects();
  renderLabs();
  renderTabela();
}

function mostrarSecao(nome) {
  document.querySelectorAll('.pagina-secao').forEach(secao => secao.classList.remove('ativa'));
  document.getElementById(`secao-${nome}`).classList.add('ativa');

  document.querySelectorAll('.tabs button').forEach(botao => botao.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

renderStats();
renderFilters();
renderLists();
renderAll();

$('searchInput').addEventListener('input', renderAll);
$('areaFilter').addEventListener('change', renderAll);
