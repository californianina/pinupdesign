/* credito.js (v2.6) — mostra a barra "desenvolvido por @pinupconvites" só depois que a rolagem começa.
   Não aparece sobre o vídeo de abertura (tela travada) nem no topo; some de novo se voltar ao início / reabrir. */
(function () {
  'use strict';
  var screen = document.getElementById('screen');
  var bar = document.getElementById('credit');
  if (!screen || !bar) return;

  function atualizar() {
    var visivel = !screen.classList.contains('is-locked') && screen.scrollTop > 8;
    bar.classList.toggle('is-on', visivel);
  }

  screen.addEventListener('scroll', atualizar, { passive: true });
  document.addEventListener('convite:open', atualizar);
  window.addEventListener('pageshow', atualizar);
  atualizar();
})();
