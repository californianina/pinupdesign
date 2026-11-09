/* =====================================================================
   CONVITE DIGITAL · XV Giovana & Giordana
   script.js — FASE 1: abertura (intro gate), música, rolagem travada/liberada,
   reset ao recarregar e links. Sem animações de rolagem (isso é a fase 2).
   Nada é gravado no navegador (sem localStorage/cookie).
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     1. CONFIGURAÇÃO — o que trocar a cada convite
     =================================================================== */
  var CONFIG = {
    /* Vídeos da abertura, em ordem. Com mais de um, eles tocam em sequência como se fossem um só.
       O vídeo 1 carrega por inteiro ao abrir a página; os demais carregam quando o vídeo 1 começa. */
    videos: [
      // unlockAt (só no ÚLTIMO vídeo): segundo em que a animação termina e a rolagem é liberada.
      // O arquivo atual anima até ~10,3 s e depois fica parado até 17 s; sem isso a rolagem só liberaria aos 17 s.
      // Use null para liberar só no fim do vídeo.
      { src: 'assets/video/abertura.mp4', unlockAt: 10.5 }
      // { src: 'assets/video/abertura-2.mp4' },
    ],
    preloadNextOn: 'click',   // 'click' = vídeos seguintes carregam no play | 'ready' = logo que o vídeo 1 estiver pronto

    /* Música de fundo (sempre em loop). Carrega inteira antes de liberar o play e começa junto com o vídeo. */
    music: { src: 'assets/audio/musica.mp3' },

    /* Local da festa (usado no popup "Como chegar": mapa e links do Waze / Google Maps) */
    local: { nome: 'Augusttus Buffet and Receptions', endereco: 'R. do Registro, 85 - Vila Magdalena, Contagem - MG', lat: -19.9137361, lng: -44.0900143 },

    /* Indicadores sutis (desligados por padrão para manter fiel ao layout) */
    scrollHint: true,         // seta "role para continuar" sobre o último frame, depois que o vídeo termina
    waitIndicator: true,      // ponto discreto SÓ se o vídeo seguinte ainda não estiver pronto

    /* Links dos botões (troque pelos reais) */
    links: {
      rsvp: 'https://assessoriavip.com.br/rsvpUnico/ee3a2280-a65e-11f1-a14c-73178895770d',
      // Deixe vazio ('') para gerar a partir das coordenadas de CONFIG.local; ou cole um link pronto.
      waze: '',          // gera: https://waze.com/ul?ll=LAT,LNG&navigate=yes
      googlemaps: '',    // gera: https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
      mapaEmbed: '',     // gera: https://www.google.com/maps?q=LAT,LNG&z=16&output=embed
      instagram: 'https://www.instagram.com/giovana.giordana.xv?obrf=bThuMnNjbThtMGZ4&utm_source=qr'
    }
  };

  /* ===================================================================
     2. ELEMENTOS E ESTADO
     =================================================================== */
  function $(id) { return document.getElementById(id); }
  var screenEl = $('screen'), hero = $('hero'), playBtn = $('hero-play'),
      videosBox = $('hero-videos'), arrowBtn = $('hero-arrow'), soundBtn = $('sound'), bgm = $('bgm');
  var popups = Array.prototype.slice.call(document.querySelectorAll('.popup'));
  var S = { started: false, done: false, current: 0, run: 0, muted: false };
  var vids = [];

  if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }

  /* ===================================================================
     3. VÍDEOS — criação e pré-carregamento total (blob)
     =================================================================== */
  function mimeFor(src) { return /\.webm(\?|$)/i.test(src) ? 'video/webm' : 'video/mp4'; }

  function createVideo(cfg, index) {
    var v = document.createElement('video');
    v.className = 'hero__video' + (index === 0 ? ' is-active' : '');
    // iOS: nunca tela cheia → playsinline + webkit-playsinline, sem controls, mudo, sem PiP/AirPlay
    v.muted = true; v.defaultMuted = true; v.loop = false; v.controls = false;
    v.playsInline = true; v.preload = 'auto';
    v.disablePictureInPicture = true; v.disableRemotePlayback = true;
    ['muted', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture', 'disableremoteplayback']
      .forEach(function (a) { v.setAttribute(a, ''); });
    v.setAttribute('x-webkit-airplay', 'deny');
    v.setAttribute('tabindex', '-1');
    v.setAttribute('aria-hidden', 'true');
    videosBox.appendChild(v);
    return { cfg: cfg, el: v, url: null, ready: false, error: false, promise: null, unlocked: false };
  }

  function loadVideo(item) {
    if (item.promise) { return item.promise; }
    item.promise = new Promise(function (resolve) {
      var v = item.el, finished = false, timer;
      function done(ok) {
        if (finished) { return; } finished = true; clearTimeout(timer);
        ['loadeddata', 'canplay', 'canplaythrough'].forEach(function (e) { v.removeEventListener(e, onOk); });
        v.removeEventListener('error', onErr);
        item.ready = ok; item.error = !ok; resolve(ok);
      }
      function onOk() { done(true); }
      function onErr() { done(false); }
      v.addEventListener('loadeddata', onOk);
      v.addEventListener('canplay', onOk);
      v.addEventListener('canplaythrough', onOk);
      v.addEventListener('error', onErr);

      function attach(src, wait) {
        timer = setTimeout(function () { done(!v.error); }, wait);
        v.src = src; v.load();
      }
      // baixa o arquivo inteiro para a memória e toca a partir do blob (sem travar no meio)
      fetch(item.cfg.src, { cache: 'force-cache' })
        .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
        .then(function (b) {
          if (!/^video\//.test(b.type)) { b = new Blob([b], { type: mimeFor(item.cfg.src) }); }
          item.url = URL.createObjectURL(b);
          attach(item.url, 2500);
        })
        .catch(function () { attach(item.cfg.src, 10000); });   // plano B: arquivo direto
    });
    return item.promise;
  }

  /* música: baixa inteira (blob) para começar no mesmo instante do vídeo, sem esperar rede */
  var musicPromise = null;
  function loadMusic() {
    if (musicPromise) { return musicPromise; }
    musicPromise = new Promise(function (resolve) {
      var finished = false, timer;
      function done(ok) {
        if (finished) { return; } finished = true; clearTimeout(timer);
        ['loadeddata', 'canplay', 'canplaythrough'].forEach(function (e) { bgm.removeEventListener(e, onOk); });
        bgm.removeEventListener('error', onErr); resolve(ok);
      }
      function onOk() { done(true); }
      function onErr() { done(false); }
      bgm.addEventListener('loadeddata', onOk); bgm.addEventListener('canplay', onOk);
      bgm.addEventListener('canplaythrough', onOk); bgm.addEventListener('error', onErr);
      function attach(src, wait) { timer = setTimeout(function () { done(!bgm.error); }, wait); bgm.src = src; bgm.load(); }
      fetch(CONFIG.music.src, { cache: 'force-cache' })
        .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.blob(); })
        .then(function (b) {
          if (!/^audio\//.test(b.type)) { b = new Blob([b], { type: 'audio/mpeg' }); }
          attach(URL.createObjectURL(b), 2500);
        })
        .catch(function () { attach(CONFIG.music.src, 10000); });
    });
    return musicPromise;
  }

  /* iOS: "destrava" o vídeo seguinte dentro do gesto do primeiro clique */
  function unlock(item) {
    if (item.unlocked) { return; }
    item.unlocked = true;
    var v = item.el;
    var p = v.play();
    if (p && p.then) { p.then(function () { v.pause(); try { v.currentTime = 0; } catch (e) {} }).catch(function () { item.unlocked = false; }); }
  }

  /* espera o 1º quadro realmente pintado (evita piscada preta no iOS) */
  function whenFramePainted(v, cb) {
    if ('requestVideoFrameCallback' in v) { v.requestVideoFrameCallback(function () { cb(); }); return; }
    var fired = false;
    function go() { if (fired) { return; } fired = true; v.removeEventListener('timeupdate', go); cb(); }
    v.addEventListener('timeupdate', go);
    setTimeout(go, 400);
  }

  /* ===================================================================
     4. ABERTURA (intro gate)
     =================================================================== */
  function start() {
    if (S.started || playBtn.disabled) { return; }
    S.started = true; S.run++;
    hero.classList.add('is-started');
    try { bgm.currentTime = 0; } catch (e) {}
    startMusic();                                   // no MESMO clique (exigência dos navegadores)
    vids.slice(1).forEach(unlock);
    if (CONFIG.preloadNextOn === 'click') { vids.slice(1).forEach(loadVideo); }
    showSound();
    playIndex(0, S.run);                            // vídeo e música partem no mesmo instante
    syncMusic(S.run);
  }

  /* alinha a música ao relógio do vídeo: mede a diferença e compensa o atraso do próprio "seek" (converge em 1–3 ajustes) */
  function syncMusic(run) {
    var offset = 0;
    [500, 1200, 2200, 3600].forEach(function (ms) {
      setTimeout(function () {
        if (run !== S.run || S.done) { return; }
        var v = vids[0] && vids[0].el;
        if (!v || v.paused || bgm.paused || !(bgm.readyState >= 2)) { return; }
        var d = v.currentTime - bgm.currentTime;          // > 0: música atrasada
        if (Math.abs(d) > 0.04) { offset += d; try { bgm.currentTime = v.currentTime + offset; } catch (e) {} }
      }, ms);
    });
  }

  function playIndex(i, run) {
    var item = vids[i], v = item.el;
    S.current = i;
    if (item.error) { finish(run); return; }       // vídeo não carregou: abre o convite mesmo assim
    var p = v.play();
    v.addEventListener('playing', function () {
      if (run !== S.run) { return; }
      whenFramePainted(v, function () {
        if (run !== S.run) { return; }
        vids.forEach(function (x, k) { x.el.classList.toggle('is-active', k === i); });
        hero.classList.add('is-playing');           // banner some só agora
      });
    }, { once: true });
    v.addEventListener('ended', function () { if (run === S.run) { next(i, run); } }, { once: true });
    if (i === vids.length - 1 && typeof item.cfg.unlockAt === 'number') {     // libera a rolagem quando a animação acaba
      var onTime = function () {
        if (run !== S.run || S.done) { v.removeEventListener('timeupdate', onTime); return; }
        if (v.currentTime >= item.cfg.unlockAt) {
          v.removeEventListener('timeupdate', onTime);
          finish(run);
          try { v.pause(); } catch (e) {}
        }
      };
      v.addEventListener('timeupdate', onTime);
    }
    v.addEventListener('error', function () { if (run === S.run && !S.done) { finish(run); } }, { once: true });
    if (p && p.catch) { p.catch(function () { if (run === S.run && !S.done) { finish(run); } }); }
  }

  function next(i, run) {
    if (i >= vids.length - 1) { finish(run); return; }
    var n = vids[i + 1];
    if (n.ready) { playIndex(i + 1, run); return; }
    // vídeo seguinte ainda não está pronto: congela o último frame, sem travar
    if (CONFIG.waitIndicator) { hero.classList.add('is-waiting'); }
    loadVideo(n).then(function () {
      if (run !== S.run) { return; }
      hero.classList.remove('is-waiting');
      playIndex(i + 1, run);
    });
  }

  function finish(run) {
    if (run !== S.run || S.done) { return; }
    S.done = true;
    hero.classList.add('is-playing', 'is-ended');   // PNG do último frame cobre qualquer emenda
    hero.classList.remove('is-waiting');
    screenEl.classList.remove('is-locked');          // só agora a rolagem é liberada
    if (CONFIG.scrollHint) { showArrow(); }
    document.dispatchEvent(new CustomEvent('convite:open'));   // gancho para a fase 2
  }

  /* ---- seta de rolagem: visível enquanto a página está no topo, depois que o vídeo acaba ---- */
  function onArrowScroll() { arrowBtn.classList.toggle('is-visible', S.done && screenEl.scrollTop < 8); }
  function showArrow() {
    arrowBtn.hidden = false;
    screenEl.addEventListener('scroll', onArrowScroll, { passive: true });
    requestAnimationFrame(function () { requestAnimationFrame(onArrowScroll); });
  }
  function hideArrow() {
    screenEl.removeEventListener('scroll', onArrowScroll);
    arrowBtn.classList.remove('is-visible'); arrowBtn.hidden = true;
  }
  arrowBtn.addEventListener('click', function () {
    var top = hero.offsetHeight;
    if (screenEl.scrollTo) { screenEl.scrollTo({ top: top, behavior: 'smooth' }); } else { screenEl.scrollTop = top; }
  });

  /* ===================================================================
     5. MÚSICA E BOTÃO DE SOM
     =================================================================== */
  function startMusic() {
    bgm.loop = true; bgm.muted = S.muted;
    var p = bgm.play();                              // sem await: precisa rodar dentro do gesto de clique
    if (p && p.catch) { p.catch(function () { musicBlocked(); }); }
  }
  /* o navegador recusou o áudio (política de autoplay / iframe): mostra o botão como "sem som" e tenta de novo no próximo toque */
  function musicBlocked() {
    if (!S.started || S.muted) { return; }
    S.blocked = true; paintSound();
    function retry() {
      if (!S.blocked) { return; }
      var q = bgm.play();
      if (q && q.then) { q.then(function () { S.blocked = false; paintSound(); detach(); try { syncNow(); } catch (e) {} }).catch(function () {}); }
    }
    function detach() { ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (e) { document.removeEventListener(e, retry, true); }); }
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (e) { document.addEventListener(e, retry, true); });
  }
  function syncNow() {
    var v = vids[S.current] && vids[S.current].el;
    if (v && !v.paused && !S.done) { try { bgm.currentTime = v.currentTime; } catch (e) {} }
  }
  function showSound() {
    soundBtn.hidden = false;
    requestAnimationFrame(function () { soundBtn.classList.add('is-visible'); });
  }
  function paintSound() {
    soundBtn.classList.toggle('is-muted', S.muted || S.blocked);
    soundBtn.setAttribute('aria-pressed', (S.muted || S.blocked) ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', (S.muted || S.blocked) ? 'Ativar som' : 'Desativar som');
  }
  soundBtn.addEventListener('click', function () {
    if (S.blocked || bgm.paused) {                    // som bloqueado ou parado: o toque liga a música
      S.muted = false; bgm.muted = false;
      var p = bgm.play();
      if (p && p.then) { p.then(function () { S.blocked = false; paintSound(); syncNow(); }).catch(function () { paintSound(); }); }
      return;
    }
    S.muted = !S.muted; bgm.muted = S.muted; paintSound();
  });

  /* ===================================================================
     6. REINÍCIO (reload, voltar/avançar, cache do iOS): tudo volta ao estado inicial
     =================================================================== */
  function resetState() {
    S.run++; S.started = false; S.done = false; S.current = 0; S.muted = false; S.blocked = false;
    hero.classList.remove('is-started', 'is-playing', 'is-ended', 'is-waiting');
    hideArrow(); closePopups();
    vids.forEach(function (it, k) {
      try { it.el.pause(); it.el.currentTime = 0; } catch (e) {}
      it.el.classList.toggle('is-active', k === 0);
    });
    try { bgm.pause(); bgm.currentTime = 0; } catch (e) {}
    bgm.muted = false;
    soundBtn.classList.remove('is-visible', 'is-muted'); soundBtn.hidden = true; paintSound();
    screenEl.classList.add('is-locked');
    screenEl.scrollTop = 0;
    playBtn.disabled = !(vids[0] && vids[0].ready && hero.classList.contains('is-ready'));
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) { resetState(); } });

  /* volta de outra aba/app: retoma música e vídeo se ficaram pausados */
  document.addEventListener('visibilitychange', function () {
    if (!S.started) { return; }
    if (document.hidden) { bgm.pause(); return; }
    if (!S.muted) { var p = bgm.play(); if (p && p.catch) { p.catch(function () {}); } }
    if (!S.done) { var v = vids[S.current] && vids[S.current].el; if (v && v.paused && !v.ended) { var q = v.play(); if (q && q.catch) { q.catch(function () {}); } } }
  });

  /* ===================================================================
     7. LINKS E POPUPS (Como chegar / Presentes)
     =================================================================== */
  function buildLinks() {
    var L = CONFIG.local, k = CONFIG.links, ll = L.lat + ',' + L.lng;
    k.waze = k.waze || ('https://waze.com/ul?ll=' + ll + '&navigate=yes');
    k.googlemaps = k.googlemaps || ('https://www.google.com/maps/dir/?api=1&destination=' + ll);
    k.mapaEmbed = k.mapaEmbed || ('https://www.google.com/maps?q=' + ll + '&z=16&output=embed');
  }
  function setupLinks() {
    buildLinks();
    Array.prototype.forEach.call(document.querySelectorAll('[data-link]'), function (a) {
      var url = CONFIG.links[a.getAttribute('data-link')];
      if (url && url !== '#') { a.href = url; }
      else { a.addEventListener('click', function (e) { e.preventDefault(); }); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-popup]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openPopup(a.getAttribute('data-popup'), a); });
    });
    popups.forEach(function (pop) {
      Array.prototype.forEach.call(pop.querySelectorAll('[data-close]'), function (el) {
        el.addEventListener('click', function () { closePopups(); });
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePopups(); } });
  }

  var lastFocus = null;
  function openPopup(name, opener) {
    var pop = $('popup-' + name); if (!pop) { return; }
    closePopups(true);
    if (name === 'comochegar') {                      // o mapa só é pedido na primeira abertura
      var f = $('map-frame');
      if (!f.getAttribute('src')) { f.setAttribute('src', CONFIG.links.mapaEmbed); }
    }
    lastFocus = opener || null;
    pop.classList.add('is-open'); pop.setAttribute('aria-hidden', 'false');
    var c = pop.querySelector('.popup__close'); if (c) { c.focus({ preventScroll: true }); }
  }
  function closePopups(silent) {
    var any = false;
    popups.forEach(function (pop) {
      if (pop.classList.contains('is-open')) { any = true; pop.classList.remove('is-open'); pop.setAttribute('aria-hidden', 'true'); }
    });
    if (any && !silent && lastFocus && lastFocus.focus) { lastFocus.focus({ preventScroll: true }); }
  }

  /* ===================================================================
     8. IMAGENS DO CONTEÚDO — carregam depois que o vídeo 1 está pronto
        (assim o botão de play não disputa banda com ~10 MB de imagens)
     =================================================================== */
  var imagesStarted = false;
  function loadPageImages() {
    if (imagesStarted) { return; } imagesStarted = true;
    Array.prototype.forEach.call(document.querySelectorAll('img[data-src]'), function (img) {
      img.src = img.getAttribute('data-src'); img.removeAttribute('data-src');
      if (img.decode) { img.decode().catch(function () {}); }   // decodifica já (evita "pop-in" ao rolar rápido)
    });
  }

  /* ===================================================================
     9. INÍCIO
     =================================================================== */
  function init() {
    screenEl.scrollTop = 0;
    screenEl.classList.add('is-locked');
    paintSound();
    setupLinks();
    CONFIG.videos.forEach(function (cfg, i) { vids.push(createVideo(cfg, i)); });
    playBtn.addEventListener('click', start);
    var first = loadVideo(vids[0]);
    var music = loadMusic();
    first.then(function () {                           // vídeo pronto → espera a música (no máx. 8 s) para começarem juntos
      return Promise.race([music, new Promise(function (r) { setTimeout(r, 8000); })]);
    }).then(function () {
      playBtn.disabled = false;                        // botão só ativa com o vídeo 1 e a música prontos
      hero.classList.add('is-ready');
      loadPageImages();
      if (CONFIG.preloadNextOn === 'ready') { vids.slice(1).forEach(loadVideo); }
    });
    setTimeout(loadPageImages, 12000);                 // rede lenta: não deixa as imagens esperando para sempre
  }

  window.Convite = { screen: screenEl, config: CONFIG, reset: resetState };   // fase 2: scroller = Convite.screen
  init();
})();
