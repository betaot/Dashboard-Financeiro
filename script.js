const form = document.getElementById("form_nova_meta");
const metas=[];
form.addEventListener("submit", function (e) {
e.preventDefault();
const dados = Object.fromEntries(new FormData(form));
metas.push(dados)
console.log(dados);
console.log(metas)

});