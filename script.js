const subtitle = document.getElementById("subtitle");

// ──────────────────────────────────────
// Funções de cor – paleta original mantida
// ──────────────────────────────────────
function getColorBrasil(total) {
  return total > 15 ? "#596ab6" :
         total > 10 ? "#7685d4" :
         total > 6  ? "#94a0f2" :
         total > 3  ? "#b2bdff" :
         total > 1  ? "#c1ccff" :
         total > 0  ? "#d0dbff" :
                       "#fffcf3";
}

function getColorMundo(total) {

  if (total >= 500) return "#3d4b7a";   // novo, muito escuro
  if (total >= 100) return "#596ab6";   // azul original mais escuro (grandes)
  if (total >= 50)  return "#7685d4";
  if (total >= 20)  return "#94a0f2";
  if (total >= 10)  return "#b2bdff";
  if (total >= 5)   return "#c1ccff";
  if (total >= 1)   return "#d0dbff";
  return "#fffcf3";                     // sem dados
}
// ──────────────────────────────────────
// Totais
// ──────────────────────────────────────
const totaisBrasil = {
  total: dadosBrasil.reduce((s, d) => s + d.total, 0),
  planejamento: dadosBrasil.reduce((s, d) => s + d.planejamento, 0),
  implantacao: dadosBrasil.reduce((s, d) => s + d.implantacao, 0),
  operacao: dadosBrasil.reduce((s, d) => s + d.operacao, 0)
};

// Estruturas de lookup
const porUF = {};
const porNomeEstado = {};
dadosBrasil.forEach(d => {
  porUF[d.uf] = d;
  porNomeEstado[d.estado.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] = d; // nome sem acentos e lowercase
});

const porISO3 = {};
const paisesComDados = new Set();
dadosMundo.forEach(d => {
  porISO3[d.iso3] = d;
  if (d.total > 0) paisesComDados.add(d.pais);
});

// ──────────────────────────────────────
// Controle genérico de legenda
// ──────────────────────────────────────
function criarLegenda(getColorFn, grades) {
  return L.control({ position: "bottomright" }).onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<b>Total de parques</b><br>";
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i];
      const to = grades[i + 1];
      div.innerHTML +=
        '<i style="background:' + getColorFn(from) + '"></i> ' +
        from + (to ? "–" + (to - 1) + "<br>" : "+");
    }
    return div;
  };
}

// ──────────────────────────────────────
// Utilitário: espera o container ficar visível
// ──────────────────────────────────────
function aguardarMapaVisivel(mapId, callback) {
  const el = document.getElementById(mapId);
  if (!el) return callback();
  const check = () => {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      callback();
    } else {
      setTimeout(check, 50);
    }
  };
  check();
}

// ──────────────────────────────────────
// Variáveis globais para lazy loading
// ──────────────────────────────────────
let mapaBrasil = null, mapaMundo = null;
let camadaBrasil = null, camadaMundo = null;
const mapasCarregados = { brasil: false, mundo: false };

// ──────────────────────────────────────
// Criação do mapa do Brasil
// ──────────────────────────────────────
function criarMapaBrasil() {
  if (mapaBrasil) return; // já criado

  mapaBrasil = L.map("mapBrasil").setView([-14.235, -51.9253], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 8,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapaBrasil);

  const info = L.control();
  info.onAdd = function () {
    this._div = L.DomUtil.create("div", "info");
    this.update();
    return this._div;
  };
  info.update = function (d) {
    this._div.innerHTML = d ? `
      <h3>${d.estado} (${d.uf})</h3>
      <b>Total:</b> ${d.total}<br>
      <b>Planejamento:</b> ${d.planejamento}<br>
      <b>Implantação:</b> ${d.implantacao}<br>
      <b>Operação:</b> ${d.operacao}<br>
      <b>Região:</b> ${d.regiao}
    ` : `
      <h3>Brasil</h3>
      Passe o mouse sobre um estado.<br><br>
      <b>Total nacional:</b> ${totaisBrasil.total}<br>
      <b>Planejamento:</b> ${totaisBrasil.planejamento}<br>
      <b>Implantação:</b> ${totaisBrasil.implantacao}<br>
      <b>Operação:</b> ${totaisBrasil.operacao}
    `;
  };
  info.addTo(mapaBrasil);

  // Legenda
  L.control({ position: "bottomright" }).onAdd = criarLegenda(getColorBrasil, [0, 1, 2, 4, 7, 11, 16]);
  // Botão de reset (home)
  L.control.zoom({ position: "topleft" }).addTo(mapaBrasil); // já tem zoom padrão, mas podemos adicionar um home

  // Carregar GeoJSON do Brasil
  fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
    .then(r => r.json())
    .then(geoData => {
      camadaBrasil = L.geoJson(geoData, {
        style: feature => {
          const uf = (feature.properties.sigla || feature.properties.UF || feature.properties.postal || feature.properties.iso_3166_2 || "").replace("BR-", "");
          const nome = (feature.properties.name || feature.properties.nome || feature.properties.NOME || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const d = porUF[uf] || porNomeEstado[nome] || { total: 0 };
          return {
            fillColor: getColorBrasil(d.total),
            weight: 1,
            opacity: 1,
            color: "#666",
            fillOpacity: 0.9
          };
        },
        onEachFeature: (feature, layer) => {
          const uf = (feature.properties.sigla || feature.properties.UF || feature.properties.postal || feature.properties.iso_3166_2 || "").replace("BR-", "");
          const nome = (feature.properties.name || feature.properties.nome || feature.properties.NOME || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const d = porUF[uf] || porNomeEstado[nome];

          layer.bindTooltip(d ? `${d.estado} (${d.uf}): ${d.total} parques` : `${feature.properties.name || 'Estado'}: sem dados`, { sticky: true });
          layer.on({
            mouseover() {
              layer.setStyle({ weight: 3, color: "#111", fillOpacity: 1 });
              info.update(d || { estado: feature.properties.name, uf: '', total: 0, planejamento: 0, implantacao: 0, operacao: 0, regiao: 'Desconhecida' });
            },
            mouseout() {
              camadaBrasil.resetStyle(layer);
              info.update();
            },
            click() { mapaBrasil.fitBounds(layer.getBounds()); }
          });
        }
      }).addTo(mapaBrasil);
    })
    .catch(err => console.error("Erro ao carregar mapa do Brasil:", err));
}

// ──────────────────────────────────────
// Criação do mapa do Mundo
// ──────────────────────────────────────
function criarMapaMundo() {
  if (mapaMundo) return;

  mapaMundo = L.map("mapMundo").setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapaMundo);

  const info = L.control();
  info.onAdd = function () {
    this._div = L.DomUtil.create("div", "info");
    this.update();
    return this._div;
  };
  info.update = function (d) {
    this._div.innerHTML = d ? `
      <h3>${d.pais}</h3>
      <b>Total:</b> ${d.total > 0 ? d.total : 'sem dados oficiais'}
    ` : `
      <h3>Mundo</h3>
      Passe o mouse sobre um país.<br>
      <b>Países com dados:</b> ${paisesComDados.size} de ${dadosMundo.length}
    `;
  };
  info.addTo(mapaMundo);

  L.control({ position: "bottomright" }).onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<b>Total de parques</b><br>";
    const grades = [0, 1, 5, 10, 20, 50, 100, 500]; // intervalos ajustados
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i];
      const to = grades[i + 1];
      div.innerHTML +=
        '<i style="background:' + getColorMundo(from) + '"></i> ' +
        from + (to ? "–" + (to - 1) + "<br>" : "+");
    }
    return div;
  };

  fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
    .then(r => r.json())
    .then(geoData => {
      camadaMundo = L.geoJson(geoData, {
        style: feature => {
          const d = porISO3[feature.id] || { total: 0 };
          return {
            fillColor: getColorMundo(d.total),
            weight: 1,
            opacity: 1,
            color: "#666",
            fillOpacity: 0.85
          };
        },
        onEachFeature: (feature, layer) => {
          const d = porISO3[feature.id];
          layer.bindTooltip(d ? `${d.pais}: ${d.total} parques` : `${feature.properties.name}: sem dados`, { sticky: true });
          layer.on({
            mouseover() {
              layer.setStyle({ weight: 2, color: "#111", fillOpacity: 1 });
              info.update(d || { pais: feature.properties.name, total: 0 });
            },
            mouseout() {
              camadaMundo.resetStyle(layer);
              info.update();
            },
            click() { mapaMundo.fitBounds(layer.getBounds()); }
          });
        }
      }).addTo(mapaMundo);
    })
    .catch(err => console.error("Erro ao carregar mapa mundial:", err));
}

// ──────────────────────────────────────
// Alternância entre abas
// ──────────────────────────────────────
function mostrarAba(aba) {
  const btnBrasil = document.getElementById("btnBrasil");
  const btnMundo = document.getElementById("btnMundo");
  const mapBrasilDiv = document.getElementById("mapBrasil");
  const mapMundoDiv = document.getElementById("mapMundo");

  btnBrasil.classList.toggle("active", aba === "brasil");
  btnBrasil.setAttribute("aria-pressed", aba === "brasil");
  btnMundo.classList.toggle("active", aba === "mundo");
  btnMundo.setAttribute("aria-pressed", aba === "mundo");

  mapBrasilDiv.classList.toggle("active", aba === "brasil");
  mapMundoDiv.classList.toggle("active", aba === "mundo");

  if (aba === "brasil") {
    subtitle.innerText = `Brasil — Total nacional: ${totaisBrasil.total} parques | Planejamento: ${totaisBrasil.planejamento} | Implantação: ${totaisBrasil.implantacao} | Operação: ${totaisBrasil.operacao}`;
    if (!mapasCarregados.brasil) {
      criarMapaBrasil();
      mapasCarregados.brasil = true;
    }
    aguardarMapaVisivel("mapBrasil", () => mapaBrasil.invalidateSize());
  } else {
    subtitle.innerText = `Mundo — ${paisesComDados.size} países com parques registrados (de ${dadosMundo.length} listados)`;
    if (!mapasCarregados.mundo) {
      criarMapaMundo();
      mapasCarregados.mundo = true;
    }
    aguardarMapaVisivel("mapMundo", () => mapaMundo.invalidateSize());
  }
}

// Inicialização padrão (Brasil visível)
mostrarAba("brasil");