const subtitle = document.getElementById("subtitle");

function mostrarAba(aba) {
  document.getElementById("mapBrasil").classList.remove("active");
  document.getElementById("mapMundo").classList.remove("active");
  document.getElementById("btnBrasil").classList.remove("active");
  document.getElementById("btnMundo").classList.remove("active");

  if (aba === "brasil") {
    document.getElementById("mapBrasil").classList.add("active");
    document.getElementById("btnBrasil").classList.add("active");
    subtitle.innerText = "Brasil — Total nacional: 124 parques | Planejamento: 9 | Implantação: 39 | Operação: 76";
    setTimeout(() => mapaBrasil.invalidateSize(), 200);
  } else {
    document.getElementById("mapMundo").classList.add("active");
    document.getElementById("btnMundo").classList.add("active");
    subtitle.innerText = "Mundo — Parques científicos, tecnológicos e de inovação por país";
    setTimeout(() => mapaMundo.invalidateSize(), 200);
  }
}

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
  return total >= 50 ? "#596ab6" :
         total >= 40 ? "#7685d4" :
         total >= 30 ? "#94a0f2" :
         total >= 20 ? "#b2bdff" :
         total >= 10 ? "#c1ccff" :
         total >= 1  ? "#d0dbff" :
                       "#fffcf3";
}

const totaisBrasil = {
  total: dadosBrasil.reduce((s, d) => s + d.total, 0),
  planejamento: dadosBrasil.reduce((s, d) => s + d.planejamento, 0),
  implantacao: dadosBrasil.reduce((s, d) => s + d.implantacao, 0),
  operacao: dadosBrasil.reduce((s, d) => s + d.operacao, 0)
};

const porUF = {};
const porNomeEstado = {};

dadosBrasil.forEach(d => {
  porUF[d.uf] = d;
  porNomeEstado[d.estado.toLowerCase()] = d;
});

const porISO3 = {};

dadosMundo.forEach(d => {
  porISO3[d.iso3] = d;
});

const mapaBrasil = L.map("mapBrasil").setView([-14.235, -51.9253], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 8,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapaBrasil);

const infoBrasil = L.control();

infoBrasil.onAdd = function () {
  this._div = L.DomUtil.create("div", "info");
  this.update();
  return this._div;
};

infoBrasil.update = function (d) {
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

infoBrasil.addTo(mapaBrasil);

let camadaBrasil;

fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
  .then(response => response.json())
  .then(geoData => {
    camadaBrasil = L.geoJson(geoData, {
      style: function (feature) {
        const p = feature.properties;
        const uf = p.sigla || p.uf || p.UF || p.postal || p.id;
        const nome = (p.name || p.nome || p.NOME || "").toLowerCase();
        const d = porUF[uf] || porNomeEstado[nome] || { total: 0 };

        return {
          fillColor: getColorBrasil(d.total),
          weight: 1,
          opacity: 1,
          color: "#666",
          fillOpacity: 0.9
        };
      },

      onEachFeature: function (feature, layer) {
        const p = feature.properties;
        const uf = p.sigla || p.uf || p.UF || p.postal || p.id;
        const nome = (p.name || p.nome || p.NOME || "").toLowerCase();
        const d = porUF[uf] || porNomeEstado[nome];

        if (d) {
          layer.bindTooltip(`${d.estado} (${d.uf}): ${d.total} parques`, { sticky: true });
        }

        layer.on({
          mouseover: function () {
            layer.setStyle({
              weight: 3,
              color: "#111",
              fillOpacity: 1
            });

            if (d) {
              infoBrasil.update(d);
            }
          },

          mouseout: function () {
            camadaBrasil.resetStyle(layer);
            infoBrasil.update();
          },

          click: function () {
            mapaBrasil.fitBounds(layer.getBounds());
          }
        });
      }
    }).addTo(mapaBrasil);
  });

const legendaBrasil = L.control({ position: "bottomright" });

legendaBrasil.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");
  const grades = [0, 1, 2, 4, 7, 11, 16];
  const labels = [];

  div.innerHTML += "<b>Total de parques</b><br>";

  for (let i = 0; i < grades.length; i++) {
    const from = grades[i];
    const to = grades[i + 1];

    labels.push(
      '<i style="background:' + getColorBrasil(from) + '"></i> ' +
      from + (to ? "&ndash;" + (to - 1) + "<br>" : "+")
    );
  }

  div.innerHTML += labels.join("");
  return div;
};

legendaBrasil.addTo(mapaBrasil);

const mapaMundo = L.map("mapMundo").setView([20, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 6,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapaMundo);

const infoMundo = L.control();

infoMundo.onAdd = function () {
  this._div = L.DomUtil.create("div", "info");
  this.update();
  return this._div;
};

infoMundo.update = function (d) {
  this._div.innerHTML = d ? `
    <h3>${d.pais}</h3>
    <b>Total:</b> ${d.total}<br>
  ` : `
    <h3>Mundo</h3>
    Passe o mouse sobre um país.<br><br>
  `;
};

infoMundo.addTo(mapaMundo);

let camadaMundo;

fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
  .then(response => response.json())
  .then(geoData => {
    camadaMundo = L.geoJson(geoData, {
      style: function (feature) {
        const iso3 = feature.id;
        const d = porISO3[iso3] || { total: 0 };

        return {
          fillColor: getColorMundo(d.total),
          weight: 1,
          opacity: 1,
          color: "#666",
          fillOpacity: 0.85
        };
      },

      onEachFeature: function (feature, layer) {
        const iso3 = feature.id;
        const nomePais = feature.properties.name;
        const d = porISO3[iso3];

        layer.bindTooltip(
          d ? `${d.pais}: ${d.total} parques` : `${nomePais}: sem dado`,
          { sticky: true }
        );

        layer.on({
          mouseover: function () {
            layer.setStyle({
              weight: 2,
              color: "#111",
              fillOpacity: 1
            });

            if (d) {
              infoMundo.update(d);
            } else {
              infoMundo.update({
                pais: nomePais,
                total: 0
              });
            }
          },

          mouseout: function () {
            camadaMundo.resetStyle(layer);
            infoMundo.update();
          },

          click: function () {
            mapaMundo.fitBounds(layer.getBounds());
          }
        });
      }
    }).addTo(mapaMundo);
  });

const legendaMundo = L.control({ position: "bottomright" });

legendaMundo.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");
  const grades = [0, 1, 5, 10, 15, 20, 30];
  const labels = [];

  div.innerHTML += "<b>Total de parques</b><br>";

  for (let i = 0; i < grades.length; i++) {
    const from = grades[i];
    const to = grades[i + 1];

    labels.push(
      '<i style="background:' + getColorMundo(from) + '"></i> ' +
      from + (to ? "&ndash;" + (to - 1) + "<br>" : "+")
    );
  }

  div.innerHTML += labels.join("");
  return div;
};

legendaMundo.addTo(mapaMundo);

mostrarAba("brasil");