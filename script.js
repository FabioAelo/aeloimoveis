const properties = [
  {
    id: 1, type: "venda", badge: "VENDA", title: "Casa Áurea", location: "Alphaville • Salvador, BA",
    price: "R$ 2.480.000", meta: ["4 quartos", "4 suítes", "420 m²"],
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
    description: "Imóvel fictício criado para a demonstração do catálogo Aelo. Arquitetura contemporânea, integração entre ambientes e área externa generosa."
  },
  {
    id: 2, type: "venda", badge: "VENDA", title: "Apartamento Vista Mar", location: "Ondina • Salvador, BA",
    price: "R$ 1.180.000", meta: ["3 quartos", "2 suítes", "138 m²"],
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=85",
    description: "Exemplo fictício de apartamento premium com varanda ampla, vista aberta e localização estratégica."
  },
  {
    id: 3, type: "aluguel", badge: "ALUGUEL", title: "Casa Jardim Atlântico", location: "Vilão do Atlântico • Lauro de Freitas, BA",
    price: "R$ 9.800/mês", meta: ["4 quartos", "3 suítes", "310 m²"],
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
    description: "Exemplo fictício de locação residencial de alto padrão, com jardim, piscina e ambientes integrados."
  },
  {
    id: 4, type: "investimento", badge: "INVESTIMENTO", title: "Pátio Empresarial", location: "Paralela • Salvador, BA",
    price: "R$ 3.950.000", meta: ["12 salas", "8 vagas", "680 m²"],
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85",
    description: "Ativo comercial fictício para demonstração da categoria de investimentos e oportunidades patrimoniais."
  },
  {
    id: 5, type: "venda", badge: "VENDA", title: "Villa Serena", location: "Praia do Forte • Mata de São João, BA",
    price: "R$ 4.750.000", meta: ["5 quartos", "5 suítes", "510 m²"],
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85",
    description: "Casa fictícia de inspiração tropical contemporânea, pensada para representar o segmento de alto padrão."
  },
  {
    id: 6, type: "aluguel", badge: "ALUGUEL", title: "Loft Alameda", location: "Caminho das Árvores • Salvador, BA",
    price: "R$ 5.900/mês", meta: ["2 quartos", "1 suíte", "96 m²"],
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
    description: "Exemplo fictício de imóvel compacto e sofisticado para locação."
  }
];

const grid = document.getElementById("property-grid");
const modal = document.getElementById("property-modal");

function renderProperties(filter = "todos") {
  const list = filter === "todos" ? properties : properties.filter(p => p.type === filter);
  grid.innerHTML = list.map(p => `
    <article class="property-card" data-id="${p.id}">
      <div class="property-image">
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        <span class="badge">${p.badge}</span>
      </div>
      <div class="property-info">
        <h3>${p.title}</h3>
        <p class="location">${p.location}</p>
        <div class="price">${p.price}</div>
        <div class="meta">${p.meta.map(item => `<span>${item}</span>`).join("")}</div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".property-card").forEach(card => {
    card.addEventListener("click", () => openModal(Number(card.dataset.id)));
  });
}

function openModal(id) {
  const p = properties.find(item => item.id === id);
  document.getElementById("modal-image").src = p.image;
  document.getElementById("modal-image").alt = p.title;
  document.getElementById("modal-type").textContent = p.badge + " • IMÓVEL DEMONSTRATIVO";
  document.getElementById("modal-title").textContent = p.title;
  document.getElementById("modal-location").textContent = p.location;
  document.getElementById("modal-meta").innerHTML = p.meta.map(item => `<span>${item}</span>`).join(" • ");
  document.getElementById("modal-description").textContent = p.description;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    renderProperties(button.dataset.filter);
  });
});

document.querySelector(".modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  alert("No celular, o menu poderá ser conectado ao painel de navegação na próxima etapa.");
});

renderProperties();
