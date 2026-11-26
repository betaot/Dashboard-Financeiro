/* ==========================================================
   Insight Dash - script.js
   Um único arquivo para as 3 páginas:
     - index.html               (Dashboard)
     - pages/movimentacao.html  (Movimentação)
     - pages/meta.html          (Meta Financeira)
   Como não existe banco de dados, tudo fica salvo no
   localStorage do navegador (continua lá depois de recarregar).
   ========================================================== */


/* ==========================================================
   0. DADOS E FUNÇÕES AUXILIARES
   ========================================================== */

const CHAVE_MOVS = "insightdash_movimentacoes";
const CHAVE_METAS = "insightdash_metas";
const CHAVE_META_ATIVA = "insightdash_meta_ativa";

// lê do localStorage (se der erro ou estiver vazio, usa o valor padrão)
function lerDados(chave, padrao) {
  try {
    const salvo = localStorage.getItem(chave);
    return salvo ? JSON.parse(salvo) : padrao;
  } catch (erro) {
    return padrao;
  }
}

let avisouErroAoSalvar = false;

function salvarDados(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    console.warn("Não foi possível salvar os dados:", erro);
    if (!avisouErroAoSalvar) {
      avisouErroAoSalvar = true;
      alert("Não foi possível salvar seus dados neste navegador (armazenamento cheio ou bloqueado).");
    }
  }
}

/*
  movimentacoes = [{ id, tipo, valor, descricao, categoria, data,
                     conta, pagamento, situacao }]

  metas = [{ id, nome, alvo, inicial, prazo, criadaEm,
             lancamentos: [{ id, data, descricao, conta, valor }] }]
  (em "lancamentos": valor positivo = depósito, negativo = retirada)
*/
let movimentacoes = lerDados(CHAVE_MOVS, []);
let metas = lerDados(CHAVE_METAS, []);
let metaAtivaId = lerDados(CHAVE_META_ATIVA, null);

// se o localStorage tiver algo estranho/corrompido, começa do zero em vez de quebrar a página
if (!Array.isArray(movimentacoes)) movimentacoes = [];
if (!Array.isArray(metas)) metas = [];
movimentacoes = movimentacoes.filter((m) => m && typeof m === "object");
metas = metas.filter((m) => m && typeof m === "object");
metas.forEach((m) => {
  if (!Array.isArray(m.lancamentos)) m.lancamentos = [];
});

function salvarTudo() {
  salvarDados(CHAVE_MOVS, movimentacoes);
  salvarDados(CHAVE_METAS, metas);
  salvarDados(CHAVE_META_ATIVA, metaAtivaId);
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// evita erros de ponto flutuante (0.1 + 0.2) trabalhando com 2 casas
function arredondar(n) {
  return Math.round(n * 100) / 100;
}

// ---------- dinheiro ----------
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatarMoeda(valor) {
  return formatadorMoeda.format(valor);
}

// "R$ 13.000" (sem centavos quando o valor é inteiro)
function formatarMoedaCurta(valor) {
  const casas = Number.isInteger(valor) ? 0 : 2;
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

const VALOR_MAXIMO = 1000000000; // R$ 1 bilhão

// converte o que a pessoa digitou ("R$ 1.500,50", "1500,5", "1500.50") em número.
// Devolve NaN se tiver letras, sinais, mais de 2 casas decimais ou formato estranho.
function paraNumero(texto) {
  let t = String(texto ?? "").replace(/\s/g, "").replace(/^R\$/i, "");
  if (t === "") return 0;
  if (!/^[\d.,]+$/.test(t)) return NaN; // só números, ponto e vírgula

  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", "."); // 1.500,50 -> 1500.50
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // 20.000 -> 20000
  }

  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN; // ex.: "1,2,3" ou "1,234"
  return Number(t);
}

// mostra uma mensagem de erro em cima do campo (e some quando a pessoa digitar de novo)
function avisar(campo, mensagem) {
  campo.setCustomValidity(mensagem);
  campo.reportValidity();
  campo.addEventListener("input", () => campo.setCustomValidity(""), { once: true });
}

// lê um campo de dinheiro (texto); devolve null (e avisa) se estiver inválido
function lerValor(campo, opcional = false) {
  const n = paraNumero(campo.value);
  let erro = "";

  if (Number.isNaN(n)) erro = "Use apenas números, por exemplo 1500,00 (no máximo 2 casas depois da vírgula)";
  else if (n === 0 && !opcional) erro = "O valor precisa ser maior que zero";
  else if (n > VALOR_MAXIMO) erro = "Valor muito alto (máximo R$ 1.000.000.000,00)";

  if (erro) {
    avisar(campo, erro);
    return null;
  }
  return n;
}

// lê um campo <input type="number">; devolve null (e avisa) se estiver inválido
function lerNumeroDoCampo(campo) {
  const n = campo.valueAsNumber; // NaN se estiver vazio ou inválido
  let erro = "";

  if (!(n > 0)) erro = "Digite um valor maior que zero";
  else if (n > VALOR_MAXIMO) erro = "Valor muito alto (máximo R$ 1.000.000.000,00)";

  if (erro) {
    avisar(campo, erro);
    return null;
  }
  return arredondar(n);
}

// campo de dinheiro em texto: letras e símbolos nem aparecem quando a pessoa digita ou cola
function bloquearLetrasNoDinheiro(campo) {
  campo.addEventListener("input", () => {
    const limpo = campo.value.replace(/[^\d.,R$\s]/gi, "");
    if (limpo !== campo.value) campo.value = limpo;
  });
}

// <input type="number"> aceita "e", "+" e "-" por padrão; aqui não deixamos
function bloquearSinaisNoNumero(campo) {
  campo.max = VALOR_MAXIMO;
  campo.addEventListener("keydown", (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  });
}

// datas dentro de um intervalo razoável (evita ano 0001 ou 275760)
function limitarData(campo, minimo = "2000-01-01") {
  campo.min = minimo;
  campo.max = "2100-12-31";
}

// campos de texto de dinheiro ficam formatados quando a pessoa sai deles
function formatarCampoAoSair(id) {
  const campo = document.getElementById(id);
  if (!campo) return;
  bloquearLetrasNoDinheiro(campo);
  campo.addEventListener("blur", () => {
    const n = paraNumero(campo.value);
    if (campo.value.trim() !== "" && Number.isFinite(n)) {
      campo.value = formatarMoeda(n);
    }
  });
}

// ---------- datas ----------
// Trabalhamos com texto "AAAA-MM-DD" (o mesmo do <input type="date">).
// Evitamos new Date("AAAA-MM-DD") porque ele pode voltar 1 dia por causa do fuso.
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function isoDeDate(d) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function hojeISO() {
  return isoDeDate(new Date());
}

function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// 2027-06-30 -> "30 de junho de 2027"
function dataPorExtenso(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

function mesDe(iso) {
  return iso.slice(0, 7); // "2026-11"
}

function mesAnterior(anoMes) {
  let [ano, mes] = anoMes.split("-").map(Number);
  mes--;
  if (mes === 0) {
    mes = 12;
    ano--;
  }
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function diasEntre(inicio, fim) {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = fim.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

// quantos depósitos mensais cabem até o prazo (contando o mês atual)
function mesesAte(prazo) {
  const [anoH, mesH] = hojeISO().split("-").map(Number);
  const [anoP, mesP] = prazo.split("-").map(Number);
  return (anoP - anoH) * 12 + (mesP - mesH) + 1;
}

// ---------- DOM ----------
// cria um elemento usando textContent (mais seguro que innerHTML com texto digitado)
function criar(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto;
  if (classe) el.className = classe;
  return el;
}

// só escreve se o elemento existir na página
function definirTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

const NOME_TIPO = { receita: "Receita", despesa: "Despesa" };

function textoValor(mov) {
  const sinal = mov.tipo === "receita" ? "+" : "−";
  return `${sinal} ${formatarMoeda(mov.valor)}`;
}

// mais recentes primeiro (na mesma data, o último cadastrado vem antes)
function ordenarMovs(lista) {
  return [...lista].reverse().sort((a, b) => b.data.localeCompare(a.data));
}


/* ==========================================================
   1. CÁLCULOS (usados pelo Dashboard e pela Meta)
   ========================================================== */

// só movimentações "pagas/recebidas" entram nas contas
function somaPorTipo(lista, tipo) {
  return arredondar(
    lista
      .filter((m) => m.tipo === tipo && m.situacao === "pago")
      .reduce((soma, m) => soma + m.valor, 0)
  );
}

// Saldo = receitas - despesas - o que foi guardado nas metas (+ o que foi retirado)
function saldoDisponivel() {
  let saldo = somaPorTipo(movimentacoes, "receita") - somaPorTipo(movimentacoes, "despesa");
  metas.forEach((meta) => {
    meta.lancamentos.forEach((l) => {
      saldo -= l.valor;
    });
  });
  return arredondar(saldo);
}

function metaAtiva() {
  return metas.find((m) => m.id === metaAtivaId) || metas[metas.length - 1] || null;
}

function guardadoDaMeta(meta) {
  const soma = meta.lancamentos.reduce((total, l) => total + l.valor, 0);
  return arredondar(meta.inicial + soma);
}

function faltaDaMeta(meta) {
  return Math.max(arredondar(meta.alvo - guardadoDaMeta(meta)), 0);
}

// porcentagem entre 0 e 100
function porcentagemDe(guardado, alvo) {
  if (alvo <= 0) return 0;
  return Math.min(Math.max((guardado / alvo) * 100, 0), 100);
}

function statusDaMeta(meta) {
  const guardado = guardadoDaMeta(meta);
  if (guardado >= meta.alvo) return "Meta concluída";
  if (!meta.prazo) return "Em andamento";

  const hoje = hojeISO();
  if (hoje > meta.prazo) return "Prazo vencido";

  const total = diasEntre(meta.criadaEm, meta.prazo) || 1;
  const passados = Math.max(diasEntre(meta.criadaEm, hoje), 0);
  const esperado = Math.min(passados / total, 1);
  return guardado / meta.alvo >= esperado ? "No caminho certo" : "Abaixo do ritmo";
}

function textoVariacao(atual, anterior) {
  if (anterior === 0) {
    return atual === 0
      ? "▲ +0% em relação ao mês anterior"
      : "▲ sem valores no mês anterior";
  }
  const variacao = Math.round(((atual - anterior) / anterior) * 100);
  const seta = variacao >= 0 ? "▲ +" : "▼ ";
  return `${seta}${variacao}% em relação ao mês anterior`;
}

// "Meta concluída" / "No caminho certo" etc. (só aparece se existir #meta-status no HTML)
function mostrarStatusDaMeta(meta) {
  const selo = document.getElementById("meta-status");
  if (!selo) return;
  selo.textContent = meta ? statusDaMeta(meta) : "";
  selo.style.display = meta ? "" : "none"; // sem meta, esconde o selo vazio
}

// atualiza a barra de progresso e a porcentagem (existem no Dashboard e na página Meta)
function mostrarProgresso(meta) {
  const progresso = document.getElementById("progresso");
  const porcentagem = document.getElementById("porcentagem");
  if (!progresso || !porcentagem) return;

  if (!meta) {
    progresso.value = 0;
    progresso.classList.remove("completa");
    porcentagem.textContent = ""; // o CSS mostra "0%"
    return;
  }

  const pct = porcentagemDe(guardadoDaMeta(meta), meta.alvo);
  progresso.value = pct;
  progresso.classList.toggle("completa", pct >= 100);
  porcentagem.textContent = `${Math.round(pct)}% atingido`;
}


/* ==========================================================
   2. DASHBOARD (index.html)
   ========================================================== */

const CORES_GRAFICO = ["#3F7D58", "#EF9651", "#EC5228", "#25503A", "#7FB08F", "#F5C08F"];

function renderDashboard() {
  const mesAtual = mesDe(hojeISO());
  const doMes = movimentacoes.filter((m) => mesDe(m.data) === mesAtual);
  const doMesPassado = movimentacoes.filter((m) => mesDe(m.data) === mesAnterior(mesAtual));

  // --- cards de resumo ---
  const receitas = somaPorTipo(doMes, "receita");
  const despesas = somaPorTipo(doMes, "despesa");
  const saldo = saldoDisponivel();

  document.getElementById("ganhos").textContent = formatarMoeda(receitas);
  document.getElementById("perdas").textContent = formatarMoeda(despesas);

  const campoSaldo = document.getElementById("saldo");
  campoSaldo.textContent = formatarMoeda(saldo);
  campoSaldo.classList.toggle("positivo", saldo >= 0);
  campoSaldo.classList.toggle("negativo", saldo < 0);

  // (só aparecem se existirem no HTML)
  definirTexto("var-receitas", textoVariacao(receitas, somaPorTipo(doMesPassado, "receita")));
  definirTexto("var-despesas", textoVariacao(despesas, somaPorTipo(doMesPassado, "despesa")));

  renderGrafico(doMes);
  renderMetaDashboard();
  renderUltimasMovimentacoes();
}

// gráfico de rosca: despesas do mês por categoria
function renderGrafico(listaDoMes) {
  const grafico = document.getElementById("grafico");
  const legenda = document.getElementById("legenda-grafico");

  // soma por categoria
  const porCategoria = {};
  listaDoMes
    .filter((m) => m.tipo === "despesa" && m.situacao === "pago")
    .forEach((m) => {
      porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.valor;
    });

  const categorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const total = categorias.reduce((soma, c) => soma + c[1], 0);

  // sem despesas: deixa os dois vazios (o CSS mostra "Sem despesas para mostrar")
  grafico.replaceChildren();
  legenda.replaceChildren();
  grafico.setAttribute("aria-label", "Gráfico de despesas por categoria");
  if (total === 0) return;

  // monta o conic-gradient: "cor inicio% fim%, cor inicio% fim%, ..."
  let acumulado = 0;
  const partes = categorias.map(([categoria, valor], i) => {
    const inicio = acumulado;
    acumulado += (valor / total) * 100;
    return `${CORES_GRAFICO[i % CORES_GRAFICO.length]} ${inicio}% ${acumulado}%`;
  });

  const rosca = criar("div", undefined, "rosca");
  rosca.style.background = `conic-gradient(${partes.join(", ")})`;
  grafico.appendChild(rosca);

  // a cor de cada bolinha da legenda vem do CSS (pela ordem dos <li>)
  const descricoes = categorias.map(([categoria, valor]) => {
    return `${categoria} — ${Math.round((valor / total) * 100)}%`;
  });
  descricoes.forEach((texto) => legenda.appendChild(criar("li", texto)));
  grafico.setAttribute("aria-label", `Despesas por categoria: ${descricoes.join(", ")}`);
}

function renderMetaDashboard() {
  const meta = metaAtiva();
  const falta = document.getElementById("falta");

  mostrarProgresso(meta);
  mostrarStatusDaMeta(meta);
  definirTexto("meta-nome", meta ? meta.nome : "");

  if (!meta) {
    falta.textContent = ""; // o CSS mostra "Nenhuma meta definida"
    return;
  }

  const valorFalta = faltaDaMeta(meta);
  falta.textContent =
    valorFalta === 0
      ? `Meta concluída: ${meta.nome}`
      : `Faltam ${formatarMoeda(valorFalta)} para ${meta.nome}`;
}

function renderUltimasMovimentacoes() {
  const tbody = document.getElementById("lista-movimentacoes");

  const linhas = ordenarMovs(movimentacoes)
    .slice(0, 5)
    .map((mov) => {
      const tr = criar("tr");
      tr.appendChild(criar("td", formatarData(mov.data)));
      tr.appendChild(criar("td", mov.descricao));
      tr.appendChild(criar("td", mov.categoria));
      tr.appendChild(criar("td", textoValor(mov), `col-valor ${mov.tipo}`));
      return tr;
    });

  tbody.replaceChildren(...linhas); // sem linhas = tbody vazio (o CSS mostra o aviso)
}

function iniciarDashboard() {
  renderDashboard();
}


/* ==========================================================
   3. MOVIMENTAÇÃO (pages/movimentacao.html)
   ========================================================== */

function dentroDoPeriodo(data, periodo) {
  const hoje = hojeISO();

  if (periodo === "este-mes") return mesDe(data) === mesDe(hoje);
  if (periodo === "mes-anterior") return mesDe(data) === mesAnterior(mesDe(hoje));
  if (periodo === "este-ano") return data.slice(0, 4) === hoje.slice(0, 4);
  if (periodo === "30-dias") {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    return data >= isoDeDate(limite) && data <= hoje;
  }
  return true; // "todos"
}

function iniciarMovimentacao() {
  const modal = document.getElementById("modal-movimentacao");
  const form = document.getElementById("form-movimentacao");
  const tituloModal = modal.querySelector("h2");
  const resumo = modal.querySelector(".resumo-mov");
  const tbody = document.getElementById("lista-movimentacoes");

  const filtroTipo = document.getElementById("tipo");
  const filtroCategoria = document.getElementById("categoria");
  const filtroPeriodo = document.getElementById("periodo");

  const campo = {
    tipo: document.getElementById("mov-tipo"),
    valor: document.getElementById("mov-valor"),
    descricao: document.getElementById("mov-descricao"),
    categoria: document.getElementById("mov-categoria"),
    data: document.getElementById("mov-data"),
    conta: document.getElementById("conta-tipo"),
    pagamento: document.getElementById("forma-pagamento"),
    situacao: document.getElementById("mov-situacao"),
  };

  let editandoId = null; // null = criando uma nova

  // limites dos campos
  bloquearSinaisNoNumero(campo.valor);
  campo.descricao.maxLength = 60;
  limitarData(campo.data);

  // ----- opções do filtro de período (o HTML só tem o "Selecione o período") -----
  const periodos = [
    ["este-mes", "Este mês"],
    ["mes-anterior", "Mês anterior"],
    ["30-dias", "Últimos 30 dias"],
    ["este-ano", "Este ano"],
    ["todos", "Todo o período"],
  ];
  periodos.forEach(([valor, texto]) => {
    const opcao = criar("option", texto);
    opcao.value = valor;
    filtroPeriodo.appendChild(opcao);
  });
  filtroPeriodo.value = "este-mes";

  // ----- tabela -----
  function renderTabela() {
    const lista = ordenarMovs(movimentacoes).filter((m) => {
      return (
        (!filtroTipo.value || m.tipo === filtroTipo.value) &&
        (!filtroCategoria.value || m.categoria === filtroCategoria.value) &&
        dentroDoPeriodo(m.data, filtroPeriodo.value)
      );
    });

    const linhas = lista.map((mov) => {
      const tr = criar("tr");
      const descricao = mov.situacao === "pendente" ? `${mov.descricao} (pendente)` : mov.descricao;

      tr.appendChild(criar("td", formatarData(mov.data)));
      tr.appendChild(criar("td", descricao));
      tr.appendChild(criar("td", mov.categoria));
      tr.appendChild(criar("td", NOME_TIPO[mov.tipo]));
      tr.appendChild(criar("td", textoValor(mov), `col-valor ${mov.tipo}`));

      const acoes = criar("td", undefined, "col-acoes");
      const btnEditar = criar("button", "Editar", "btn-secundario btn-sm");
      const btnExcluir = criar("button", "Excluir", "btn-perigo btn-sm");
      btnEditar.type = "button";
      btnExcluir.type = "button";
      btnEditar.dataset.acao = "editar";
      btnExcluir.dataset.acao = "excluir";
      btnEditar.dataset.id = mov.id;
      btnExcluir.dataset.id = mov.id;
      acoes.append(btnEditar, btnExcluir);
      tr.appendChild(acoes);

      return tr;
    });

    tbody.replaceChildren(...linhas);
  }

  [filtroTipo, filtroCategoria, filtroPeriodo].forEach((filtro) => {
    filtro.addEventListener("change", renderTabela);
  });

  // botão "Limpar filtros" (só funciona se existir #btn-limpar no HTML)
  const btnLimpar = document.getElementById("btn-limpar");
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      filtroTipo.value = "";
      filtroCategoria.value = "";
      filtroPeriodo.value = "este-mes";
      renderTabela();
    });
  }

  // ----- resumo ao vivo dentro do modal -----
  function atualizarResumo() {
    const tipo = campo.tipo.value;
    const valor = campo.valor.valueAsNumber;
    const situacao = campo.situacao.value || "pago";

    if (tipo) resumo.dataset.tipo = tipo;
    else delete resumo.dataset.tipo;
    resumo.dataset.situacao = situacao;

    definirTexto("res-tipo", NOME_TIPO[tipo] || "");
    definirTexto(
      "res-valor",
      valor > 0 ? `${tipo === "receita" ? "+" : tipo === "despesa" ? "−" : ""} ${formatarMoeda(valor)}`.trim() : ""
    );
    definirTexto("res-descricao", campo.descricao.value.trim());
    definirTexto("res-data", formatarData(campo.data.value));
    definirTexto("res-categoria", campo.categoria.value);
    definirTexto("res-conta", campo.conta.value);
    definirTexto("res-pagamento", campo.pagamento.value);
    definirTexto("res-situacao", situacao === "pendente" ? "Pendente" : tipo === "receita" ? "Recebido" : "Pago");

    let aviso = "Preencha os campos para ver o resumo da movimentação.";
    if (tipo && situacao === "pendente") {
      aviso = "Movimentações pendentes não entram no saldo até serem marcadas como pagas.";
    } else if (tipo === "despesa") {
      aviso = "Esta despesa será descontada do seu saldo disponível.";
    } else if (tipo === "receita") {
      aviso = "Esta receita será somada ao seu saldo disponível.";
    }
    definirTexto("res-aviso", aviso);
  }

  form.addEventListener("input", atualizarResumo);
  form.addEventListener("change", atualizarResumo);

  // ----- abrir / fechar o modal -----
  function abrirModal(mov) {
    form.reset();
    editandoId = mov ? mov.id : null;
    tituloModal.textContent = mov ? "Editar movimentação" : "Nova movimentação";

    if (mov) {
      campo.tipo.value = mov.tipo;
      campo.valor.value = mov.valor;
      campo.descricao.value = mov.descricao;
      campo.categoria.value = mov.categoria;
      campo.data.value = mov.data;
      campo.conta.value = mov.conta;
      campo.pagamento.value = mov.pagamento;
      campo.situacao.value = mov.situacao;
    } else {
      campo.data.value = hojeISO();
    }

    atualizarResumo();
    modal.showModal();
  }

  document.getElementById("btn-nova").addEventListener("click", () => abrirModal(null));
  document.getElementById("btn-cancelar").addEventListener("click", () => modal.close());

  modal.addEventListener("close", () => {
    form.reset();
    editandoId = null;
  });

  // ----- salvar (nova ou editada) -----
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const valor = lerNumeroDoCampo(campo.valor);
    if (valor === null) return;

    const dados = {
      tipo: campo.tipo.value,
      valor: valor,
      descricao: campo.descricao.value.trim(),
      categoria: campo.categoria.value,
      data: campo.data.value,
      conta: campo.conta.value,
      pagamento: campo.pagamento.value,
      situacao: campo.situacao.value,
    };

    if (!dados.descricao) {
      avisar(campo.descricao, "Digite uma descrição");
      return;
    }

    if (editandoId) {
      const indice = movimentacoes.findIndex((m) => m.id === editandoId);
      if (indice !== -1) movimentacoes[indice] = { id: editandoId, ...dados };
    } else {
      movimentacoes.push({ id: novoId(), ...dados });
    }

    salvarTudo();
    modal.close();
    renderTabela();
  });

  // ----- editar / excluir (um único listener para a tabela inteira) -----
  tbody.addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;

    const mov = movimentacoes.find((m) => m.id === botao.dataset.id);
    if (!mov) return;

    if (botao.dataset.acao === "editar") {
      abrirModal(mov);
    } else if (confirm(`Excluir "${mov.descricao}"?`)) {
      movimentacoes = movimentacoes.filter((m) => m.id !== mov.id);
      salvarTudo();
      renderTabela();
    }
  });

  renderTabela();
}


/* ==========================================================
   4. META FINANCEIRA (pages/meta.html)
   A página mostra uma meta por vez: a "meta ativa" (a última que
   você criou, editou ou mexeu). Adicionar valor sempre vai para ela.
   ========================================================== */

function iniciarMeta() {
  const modalNovaMeta = document.getElementById("nova_meta");
  const formNovaMeta = document.getElementById("form_nova_meta");

  const modalEditar = document.getElementById("editar_meta");
  const formEditar = document.getElementById("form_editar_meta");
  const selectEditar = document.getElementById("meta_editar");
  const campoNovoAlvo = document.getElementById("valor_da_meta");

  const modalRetirar = document.getElementById("retirar");
  const formRetirar = document.getElementById("form_retirar");
  const selectRetirar = document.getElementById("meta_retirar");
  const campoRetirar = document.getElementById("remover_valor");
  const campoDataRetirada = document.getElementById("data_retirada");

  const modalAdicionar = document.getElementById("modal_adicionar_meta");
  const formAdicionar = document.getElementById("form-adicionar-meta");
  const campoAddValor = document.getElementById("add-valor");
  const campoAddData = document.getElementById("add-data");
  const campoAddConta = document.getElementById("add-conta");
  const campoAddDescricao = document.getElementById("add-descricao");

  ["valor_da_nmeta", "valor_inicial_nmeta", "valor_da_meta", "remover_valor"].forEach(formatarCampoAoSair);

  // limites dos campos
  bloquearSinaisNoNumero(campoAddValor);
  document.getElementById("criando_nova_meta").maxLength = 40;
  campoAddDescricao.maxLength = 60;
  limitarData(campoAddData);
  limitarData(campoDataRetirada);
  const campoPrazoNovaMeta = document.getElementById("prazo_nmeta");
  if (campoPrazoNovaMeta) limitarData(campoPrazoNovaMeta, hojeISO());

  // ---------- desenha a página ----------
  function preencherSelects() {
    [selectEditar, selectRetirar].forEach((select) => {
      while (select.options.length > 1) select.remove(1); // mantém "Selecione a meta"
      metas.forEach((meta) => {
        const opcao = criar("option", meta.nome);
        opcao.value = meta.id;
        select.appendChild(opcao);
      });
    });
  }

  // histórico = valor inicial + depósitos + retiradas, do mais novo para o mais antigo
  function historicoDaMeta(meta) {
    const itens = [...meta.lancamentos];
    if (meta.inicial > 0) {
      itens.push({ data: meta.criadaEm, descricao: "Valor inicial", valor: meta.inicial });
    }
    return itens.reverse().sort((a, b) => b.data.localeCompare(a.data));
  }

  function renderPlanejamento(meta) {
    const planejamento = document.getElementById("planejamento");

    if (!meta) {
      planejamento.textContent = ""; // o CSS mostra o aviso padrão
      return;
    }

    const falta = faltaDaMeta(meta);
    if (falta === 0) {
      planejamento.textContent = "Você já alcançou o valor-alvo desta meta. Parabéns!";
    } else if (!meta.prazo) {
      planejamento.textContent = `Ainda faltam ${formatarMoeda(falta)} para chegar ao valor-alvo.`;
    } else if (meta.prazo < hojeISO()) {
      planejamento.textContent = `O prazo (${dataPorExtenso(meta.prazo)}) já passou e ainda faltam ${formatarMoeda(falta)}.`;
    } else {
      const meses = mesesAte(meta.prazo);
      const porMes = Math.ceil((falta / meses) * 100) / 100;
      planejamento.textContent =
        `Quero alcançar até ${dataPorExtenso(meta.prazo)}. ` +
        `Você tem cerca de ${meses} ${meses === 1 ? "mês" : "meses"} pela frente. ` +
        `Para chegar lá, guarde por mês ${formatarMoeda(porMes)}.`;
    }
  }

  function renderPagina() {
    const meta = metaAtiva();
    const titulo = document.querySelector(".meta > h2");
    const lista = document.getElementById("lista-depositos");

    preencherSelects();
    mostrarProgresso(meta);
    mostrarStatusDaMeta(meta);
    renderPlanejamento(meta);
    titulo.textContent = meta ? meta.nome : "Nenhuma meta definida";
    definirTexto("add-meta-nome", meta ? meta.nome : "Nenhuma meta");

    if (!meta) {
      // vazios: o CSS mostra o "—" e "Nenhum depósito ainda"
      ["guardado", "alvo", "falta"].forEach((id) => definirTexto(id, ""));
      lista.replaceChildren();
      return;
    }

    definirTexto("guardado", formatarMoeda(guardadoDaMeta(meta)));
    definirTexto("alvo", formatarMoeda(meta.alvo));
    definirTexto("falta", formatarMoeda(faltaDaMeta(meta)));

    const itens = historicoDaMeta(meta).map((l) => {
      const li = criar("li");
      const sinal = l.valor >= 0 ? "+" : "−";
      li.appendChild(criar("span", `${formatarData(l.data)} · ${l.descricao}`));
      li.appendChild(criar("span", `${sinal} ${formatarMoeda(Math.abs(l.valor))}`));
      return li;
    });
    lista.replaceChildren(...itens);
  }

  function aplicarMudanca(meta) {
    if (meta) metaAtivaId = meta.id;
    salvarTudo();
    renderPagina();
  }

  // ---------- 4.1 NOVA META ----------
  formNovaMeta.addEventListener("submit", (e) => {
    e.preventDefault();

    const campoNome = document.getElementById("criando_nova_meta");
    const campoAlvo = document.getElementById("valor_da_nmeta");
    const campoInicial = document.getElementById("valor_inicial_nmeta");
    const campoPrazo = document.getElementById("prazo_nmeta"); // opcional: só existe se o HTML tiver

    const nome = campoNome.value.trim();
    if (!nome) return avisar(campoNome, "Digite o nome da meta");
    if (metas.some((m) => m.nome.toLowerCase() === nome.toLowerCase())) {
      return avisar(campoNome, "Já existe uma meta com esse nome");
    }

    const alvo = lerValor(campoAlvo);
    if (alvo === null) return;

    const inicial = lerValor(campoInicial, true);
    if (inicial === null) return;

    const prazo = campoPrazo ? campoPrazo.value : "";
    if (prazo && prazo < hojeISO()) return avisar(campoPrazo, "Escolha uma data futura");

    const meta = {
      id: novoId(),
      nome: nome,
      alvo: alvo,
      inicial: inicial,
      prazo: prazo,
      criadaEm: hojeISO(),
      lancamentos: [],
    };

    metas.push(meta);
    aplicarMudanca(meta);
    modalNovaMeta.close();
  });

  // ---------- 4.2 EDITAR META (muda o valor-alvo) ----------
  selectEditar.addEventListener("change", () => {
    const meta = metas.find((m) => m.id === selectEditar.value);
    if (meta) campoNovoAlvo.value = formatarMoeda(meta.alvo);
  });

  document.getElementById("btn-editar").addEventListener("click", () => {
    const meta = metaAtiva();
    if (!meta) return;
    selectEditar.value = meta.id;
    campoNovoAlvo.value = formatarMoeda(meta.alvo);
  });

  formEditar.addEventListener("submit", (e) => {
    e.preventDefault();

    const meta = metas.find((m) => m.id === selectEditar.value);
    if (!meta) return avisar(selectEditar, "Selecione a meta");

    const novoAlvo = lerValor(campoNovoAlvo);
    if (novoAlvo === null) return;

    meta.alvo = novoAlvo;
    aplicarMudanca(meta);
    modalEditar.close();
  });

  // ---------- 4.3 RETIRAR VALOR ----------
  document.getElementById("btn-retirar").addEventListener("click", () => {
    const meta = metaAtiva();
    if (meta) selectRetirar.value = meta.id;
    campoDataRetirada.value = hojeISO();
  });

  formRetirar.addEventListener("submit", (e) => {
    e.preventDefault();

    const meta = metas.find((m) => m.id === selectRetirar.value);
    if (!meta) return avisar(selectRetirar, "Selecione a meta");

    const valor = lerValor(campoRetirar);
    if (valor === null) return;

    const guardado = guardadoDaMeta(meta);
    if (valor > guardado) {
      return avisar(campoRetirar, `Você só tem ${formatarMoeda(guardado)} guardado nesta meta`);
    }

    meta.lancamentos.push({
      id: novoId(),
      data: campoDataRetirada.value,
      descricao: "Retirada",
      conta: "Conta principal",
      valor: -valor, // negativo = saiu da meta
    });

    aplicarMudanca(meta);
    modalRetirar.close();
  });

  // ---------- 4.4 ADICIONAR VALOR ----------
  // resumo ao vivo ("Sua meta após confirmar")
  function atualizarResumoAdicionar() {
    const meta = metaAtiva();
    const valor = campoAddValor.valueAsNumber;
    const valorValido = valor > 0;

    definirTexto("res-valor", valorValido ? `+ ${formatarMoeda(valor)}` : "");
    definirTexto("res-descricao", campoAddDescricao.value.trim());
    definirTexto("res-conta", campoAddConta.value);
    definirTexto("res-data", formatarData(campoAddData.value));

    if (!meta) return;

    const guardado = guardadoDaMeta(meta);
    const novo = arredondar(guardado + (valorValido ? valor : 0));
    const pctAntes = Math.round(porcentagemDe(guardado, meta.alvo));
    const pctDepois = Math.round(porcentagemDe(novo, meta.alvo));
    const pontos = pctDepois - pctAntes;

    definirTexto("res-guardado", formatarMoeda(guardado));
    definirTexto("res-novo", formatarMoeda(novo));
    definirTexto("res-pct", `${pctAntes}% → ${pctDepois}%`);
    definirTexto("res-pontos", `+${pontos} ${pontos === 1 ? "ponto percentual" : "pontos percentuais"}`);
    document.getElementById("res-progresso").value = pctDepois;
    definirTexto("res-detalhe", `${formatarMoedaCurta(novo)} de ${formatarMoedaCurta(meta.alvo)}`);
    definirTexto("res-falta", formatarMoeda(Math.max(arredondar(meta.alvo - novo), 0)));
    definirTexto("res-prazo", meta.prazo ? `Objetivo até ${dataPorExtenso(meta.prazo)}` : "");

    definirTexto(
      "res-aviso",
      valorValido && campoAddConta.value
        ? `Ao confirmar, ${formatarMoeda(valor)} sairão da ${campoAddConta.value} e serão adicionados à sua ${meta.nome}.`
        : "Confira os dados antes de confirmar. O progresso só será atualizado após a confirmação."
    );
  }

  formAdicionar.addEventListener("input", atualizarResumoAdicionar);
  formAdicionar.addEventListener("change", atualizarResumoAdicionar);

  document.getElementById("btn-adicionar").addEventListener("click", () => {
    campoAddData.value = hojeISO();
    definirTexto("add-meta-nome", metaAtiva() ? metaAtiva().nome : "Nenhuma meta");
    atualizarResumoAdicionar();
  });

  formAdicionar.addEventListener("submit", (e) => {
    e.preventDefault();

    const meta = metaAtiva();
    if (!meta) {
      alert("Crie uma meta antes de adicionar valores.");
      modalAdicionar.close();
      return;
    }

    const valor = lerNumeroDoCampo(campoAddValor);
    if (valor === null) return;

    meta.lancamentos.push({
      id: novoId(),
      data: campoAddData.value,
      descricao: campoAddDescricao.value.trim() || "Depósito",
      conta: campoAddConta.value,
      valor: valor,
    });

    aplicarMudanca(meta);
    modalAdicionar.close();
  });

  // ao fechar qualquer janela (Cancelar, Esc ou Confirmar) o formulário é limpo
  [
    [modalNovaMeta, formNovaMeta],
    [modalEditar, formEditar],
    [modalRetirar, formRetirar],
    [modalAdicionar, formAdicionar],
  ].forEach(([modal, form]) => {
    modal.addEventListener("close", () => form.reset());
  });

  renderPagina();
}


/* ==========================================================
  5. INÍCIO: roda só o que existe na página aberta
   ========================================================== */
if (document.getElementById("ganhos")) iniciarDashboard();
if (document.getElementById("form-movimentacao")) iniciarMovimentacao();
if (document.getElementById("form_nova_meta")) iniciarMeta();