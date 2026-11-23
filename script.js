const modalNovaMeta = document.getElementById("nova_meta");
const formNovaMeta = document.getElementById("form_nova_meta");
const selects = document.querySelectorAll("select.meta");
const metas = [];

// 1. CRIAR NOVA META
formNovaMeta.addEventListener("submit", function (e) {
  e.preventDefault();

  const dados = Object.fromEntries(new FormData(formNovaMeta));
  const nomeMeta = dados.nmeta;

  if (!nomeMeta || nomeMeta.trim() === "") return;

  // Converte para número para poder somar e subtrair depois
  dados.valor_nmeta = Number(dados.valor_nmeta) || 0;
  dados.inicio_nmeta = Number(dados.inicio_nmeta) || 0;

  metas.push(dados);

  // Adiciona nos selects de Editar e Retirar
  selects.forEach((select) => {
    const novaOpcao = document.createElement("option");
    novaOpcao.textContent = nomeMeta;
    novaOpcao.value = nomeMeta;
    select.appendChild(novaOpcao);
  });

  // Atualiza o nome da meta exibido dentro do modal "Adicionar valor"
  const textoMetaAdicionar = document.getElementById("meta_adicionar_nome");
  if (textoMetaAdicionar) {
    textoMetaAdicionar.textContent = nomeMeta;
  }

  formNovaMeta.reset();
  modalNovaMeta.close();

  console.log("Dados da nova meta:", dados);
  console.log("Lista de metas:", metas);
});

// 2. EDITAR META (altera o valor_nmeta)
const modalEditarMeta = document.getElementById("editar_meta");
const formEditarMeta = document.getElementById("form_editar_meta");

formEditarMeta.addEventListener("submit", function (e) {
  e.preventDefault();

  const dados = Object.fromEntries(new FormData(formEditarMeta));
  const metaEncontrada = metas.find((m) => m.nmeta === dados.meta_);

  if (metaEncontrada) {
    metaEncontrada.valor_nmeta = Number(dados.valor_da_meta) || 0;
  }

  formEditarMeta.reset();
  modalEditarMeta.close();

  console.log("Lista de metas após editar:", metas);
});

// 3. RETIRAR VALOR (subtrai do inicio_nmeta)
const modalRetirar = document.getElementById("retirar");
const formRetirar = document.getElementById("form_retirar");

formRetirar.addEventListener("submit", function (e) {
  e.preventDefault();

  const dados = Object.fromEntries(new FormData(formRetirar));
  const metaEncontrada = metas.find((m) => m.nmeta === dados.meta_);

  if (metaEncontrada) {
    metaEncontrada.inicio_nmeta -= Number(dados.remover_meta) || 0;
  }

  formRetirar.reset();
  modalRetirar.close();

  console.log("Lista de metas após retirar:", metas);
});

// 4. ADICIONAR VALOR (soma ao inicio_nmeta)
const modalAdicionarMeta = document.getElementById("modal_adicionar_meta");
const formAdicionarMeta = document.getElementById("form-adicionar-meta");

formAdicionarMeta.addEventListener("submit", function (e) {
  e.preventDefault();

  const dados = Object.fromEntries(new FormData(formAdicionarMeta));
  
  // Lê o nome da meta exibido no topo do modal
  const nomeMetaAtual = document.getElementById("meta_adicionar_nome").textContent.trim();
  const metaEncontrada = metas.find((m) => m.nmeta === nomeMetaAtual);

  if (metaEncontrada) {
    // ⚠️ Troque "valor_adicionar" caso o name do seu input seja diferente
    metaEncontrada.inicio_nmeta += Number(dados.valor_adicionar) || 0;
  }

  formAdicionarMeta.reset();
  modalAdicionarMeta.close();

  console.log("Lista de metas após adicionar:", metas);
});
