# Dashboard Financeiro Pessoal — Insight Dash

Aplicação web para controle de finanças pessoais. Permite registrar receitas e despesas, acompanhar o saldo disponível, visualizar os gastos por categoria e planejar metas financeiras.

O projeto usa apenas HTML, CSS e JavaScript, sem frameworks. Os dados ficam salvos no próprio navegador.

## Acesse o site

O projeto pode ser aberto direto no navegador pelo link da Vercel, sem instalar nada:

**Link:** https://insight-dash-nu.vercel.app/

## Funcionalidades

### Dashboard

- Receitas e despesas do mês atual, com a variação em relação ao mês anterior
- Saldo disponível, considerando os valores movimentados nas metas
- Gráfico de rosca com as despesas do mês por categoria
- Resumo da meta atual: situação, valor que falta e barra de progresso
- Lista das 5 movimentações mais recentes

### Movimentação

- Cadastro, edição e exclusão de receitas e despesas
- Resumo atualizado em tempo real durante o preenchimento
- Filtros por tipo, categoria e período (este mês, mês anterior, últimos 30 dias, este ano ou todo o período)
- Situação **pago/recebido** ou **pendente**

### Meta Financeira

- Criação de metas com nome, valor-alvo, valor inicial (opcional) e prazo (opcional)
- Edição do valor-alvo
- Depósitos e retiradas, com resumo do progresso antes de confirmar um depósito
- Histórico das movimentações da meta
- Planejamento com o valor a guardar por mês até o prazo
- Situação da meta: *Em andamento*, *No caminho certo*, *Abaixo do ritmo*, *Prazo vencido* ou *Meta concluída*

## Regras de cálculo

- Somente movimentações pagas ou recebidas entram nos totais, no saldo e no gráfico.
- **Saldo disponível** = receitas − despesas − depósitos em metas + retiradas de metas.
- O valor inicial de uma meta não é descontado do saldo.
- A página de metas exibe uma meta por vez: a última criada, editada ou movimentada.

## Validações

- Valores precisam ser maiores que zero (o valor inicial da meta pode ficar vazio) e de no máximo R$ 1 bilhão
- Metas não podem ter nomes repetidos
- O prazo de uma nova meta não pode estar no passado
- Não é possível retirar mais do que o valor guardado na meta
- A exclusão de uma movimentação pede confirmação

## Tecnologias

- **HTML5**: estrutura das páginas e janelas com `<dialog>`
- **CSS3**: Flexbox, Grid, variáveis, animações e layout responsivo
- **JavaScript**: manipulação do DOM, cálculos e persistência com `localStorage`
- **Google Fonts**: fonte Montserrat

## Estrutura do projeto

```text
Dashboard-Financeiro/
├── index.html              # Dashboard
├── pages/
│   ├── movimentacao.html   # Movimentações
│   └── meta.html           # Meta financeira
├── images/
│   └── logo.svg
├── script.js               # Lógica das três páginas
├── style.css               # Estilos das três páginas
└── README.md
```

## Armazenamento dos dados

Não há banco de dados nem servidor de aplicação. As informações são gravadas no `localStorage` e permanecem após recarregar a página.

- Os dados não são sincronizados entre navegadores ou dispositivos.
- Limpar os dados do navegador apaga as movimentações e as metas.
- Abrir o projeto por outro endereço (Vercel, arquivo local ou servidor local) pode mostrar dados diferentes.

## Paleta de cores

| Cor | Código |
| --- | --- |
| Verde | `#3F7D58` |
| Cinza claro | `#EFEFEF` |
| Laranja | `#EF9651` |
| Laranja avermelhado | `#EC5228` |

## Integrantes

- Eliabe Sales
- Gabriel Pontes
- Ian Cassundé dos Santos
