/* =====================================================================
   CONVITE DIGITAL · XV Giovana & Giordana
   animations.js — FASE 2 (animações de rolagem e microinterações) · v2.13

   Depende de GSAP + ScrollTrigger (carregados no index.html, antes deste arquivo).
   Só é ativado depois do evento "convite:open" (vídeo de abertura terminou
   e a rolagem foi liberada). Se o GSAP não carregar, o convite continua
   funcionando, só que sem animações.

   Animações:
     1. Laço sobe com a rolagem ............. #el-laco                (scrub)
     2. Como chegar / Presentes / Instagram . cresce no hover (mouse) e no toque (celular)
     3. R.S.V.P aumenta e diminui ........... botão + texto dourado    (loop)
     3a. "Clique aqui para confirmar presença" . #el-txt-confirmar      (no mesmo pulso do R.S.V.P)
     3c. Data / hora / Augusttus ............ #el-data                (brilho dourado, como o texto final; o endereço fica estático)
     3b. Coração do traje ................... #el-coracao-vinho       (entra pela direita, uma vez; sem pulsar)
     4. Buquês laterais ..................... #el-buque-b (esq.) · #el-buque-a (dir.)  (scrub: andam para o centro e crescem 82% -> 112%)
     5. Borla pendular ...................... #el-borla               (loop)
     6. Rosas do topo sobem/descem .......... #el-rosas-a · #el-rosas-b (scrub, 2 camadas; a da frente encolhe 100% -> 80%, a de trás cresce 82% -> 112%)
     7. Papel sobe de dentro do envelope .... #el-envelope-papel     (scrub)
     8. Lustre: pêndulo + luz acende/apaga .. #el-lustre             (loop)
     9. Brilho dourado correndo ............. #el-txt-luzes · #el-monograma · #el-data  (loop)  ** TESTE: CFG.brilho.ativo **
   ===================================================================== */
(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) { return; }   // sem GSAP: convite estático, sem erro

  /* ---------------------------------------------------------------
     CONFIGURÁVEIS (valores de cada animação)
     Distâncias em fração da largura da página (0.10 = 10% da largura).
     --------------------------------------------------------------- */
  var CFG = {
    /* 1. laço: começa X da largura mais abaixo e sobe até a posição do layout
          (aumente para mais movimento, diminua para menos) */
    laco: { deslocamento: 0.30, suavizar: 0.5 },

    /* 2. cresce no hover (mouse) e no toque (celular) */
    crescer: { escala: 1.06, entra: 0.28, sai: 0.35 },

    /* 3. R.S.V.P: pulso contínuo (duração de ida; o ciclo completo é o dobro) */
    rsvp: { escala: 1.08, duracao: 0.9 },
    /* 3b. coração do traje: entra pela direita quando o topo dele chega a 62% da altura da tela (bem à vista);
          rolando de volta para cima ele sai, e entra de novo na próxima vez.
          deslocamento = de onde parte, em fração da largura da página (0.45 = totalmente fora, à direita) */
    traje: { deslocamento: 0.45, duracao: 1.4, easing: 'power3.out', comeca: 'top 62%' },

    /* 4. buquês laterais: andam em direção ao centro conforme a rolagem (sempre dentro da página).
          deslocamento = quanto começam mais para fora (fração da largura); chegam na posição do layout
          quando o buquê está no meio da tela */
    buques: { deslocamento: 0.10, suavizar: 0.8, escalaIni: 0.82, escalaFim: 1.12, escalaDe: 'top bottom', escalaAte: 'top 35%' },   // também crescem com a rolagem (82% -> 112%), numa faixa mais curta: do buquê entrando na tela até o topo dele chegar a 35% da altura

    /* 5. borla: ângulo máximo (graus) e duração de ida; ciclo completo = o dobro */
    borla: { angulo: 4, duracao: 1.1 },

    /* 6. rosas do topo, movidas pela rolagem (duas camadas, sentidos opostos = profundidade)
          amplitude = fração da largura para cada lado; sentido +1 / -1 */
    rosasFrente: { amplitude: 0.045, sentido: 1, escalaFim: 0.80, escalaDe: 'top 90%', escalaAte: 'top 10%' },    // #el-rosas-b (z 18): o cacho sobre o envelope encolhe de 100% a 80% enquanto sobe pela tela (de 'topo a 90% da tela' até 'topo a 10%')
    rosasTras:   { amplitude: 0.028, sentido: -1, escalaIni: 0.82, escalaFim: 1.12, escalaGatilho: '#el-borla', escalaDe: 'top bottom', escalaAte: 'center center', escalaNaImg: true },   // #el-rosas-a (z 1): as flores da camada de baixo, que aparecem atrás do cartão, CRESCEM 82% -> 112%; terminam (112%) quando a borla chega ao MEIO da tela (gatilho = #el-borla, de 'topo da borla entrando' até 'centro da borla no centro da tela')
    rosasSuavizar: 0.8,

    /* 7. papel do envelope: começa dentro do envelope com só uma pontinha à mostra e sobe até a posição final.
          inicio = quanto o papel começa mais abaixo, em % da altura da camada (maior = papel mais escondido;
          31.4 deixa ~200 unidades do papel à mostra; 33 esconde quase tudo).
          faixa de rolagem: de "topo do envelope a 85% da tela" até "centro do envelope a 40% da tela" */
    envelope: { inicio: 31.4, suavizar: 0.6, comeca: 'top 85%', termina: 'center 40%', escala: 1.12 },   // escala: tamanho do papel (1.12 = 12% maior; ancorado na base, cresce para cima e para os lados; acima de ~1.2 encosta nas bordas do envelope)

    /* 8. lustre: pêndulo (igual à borla) e luz acendendo/apagando (segundos) */
    lustre: { angulo: 4, duracao: 1.1, pivoX: '49.6%', luzFade: 1.6, luzPausa: 0.4 },

    /* 9. BRILHO correndo pelo texto final e pelo monograma  ** TESTE (ainda não definitivo) **
          ativo:false desliga tudo. cor = RGB da luz; intensidade 0–1 (menor = mais discreto, mais legível);
          largura = largura da faixa de luz (% do elemento); duracao = tempo de cada passada (s);
          pausa = descanso entre uma rodada e outra (s); atraso = o monograma começa X s depois do texto */
    brilho: { ativo: true, cor: '255,232,170', intensidade: 0.85, largura: 22, duracao: 2.4, pausa: 1.0, atraso: 1.1 }
  };

  var SCROLLER = '#screen';
  var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.defaults({ scroller: SCROLLER });
  ScrollTrigger.config({ ignoreMobileResize: true });   // iOS: a barra do Safari não dispara recálculo à toa

  var ctx = null;          // contexto GSAP atual (permite refazer tudo com limpeza, ex.: ao reiniciar o convite)

  function $(sel) { return document.querySelector(sel); }
  function larguraPagina() { var c = $('#canvas'); return c ? c.offsetWidth : 0; }

  /* Pausa o loop quando o elemento sai da tela (poupa bateria) e retoma quando volta */
  function loopSoVisivel(tween, gatilho, margem) {
    tween.pause();
    ScrollTrigger.create({
      trigger: gatilho,
      start: 'top bottom+=' + (margem || 120),
      end: 'bottom top-=' + (margem || 120),
      onToggle: function (self) { if (self.isActive) { tween.play(); } else { tween.pause(); } }
    });
  }

  /* ---------------------------------------------------------------
     1. LAÇO SOBE COM A ROLAGEM
     Termina exatamente na posição do layout quando a página chega ao fim.
     --------------------------------------------------------------- */
  function animarLaco() {
    if (reduzir || !$('#el-laco')) { return; }
    gsap.fromTo('#el-laco',
      { y: function () { return larguraPagina() * CFG.laco.deslocamento; } },
      {
        y: 0, ease: 'none', force3D: true, immediateRender: true,
        scrollTrigger: {
          trigger: '#sec-encerramento',
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: CFG.laco.suavizar,
          invalidateOnRefresh: true
        }
      });
  }

  /* ---------------------------------------------------------------
     2. CRESCER NO HOVER (mouse) E NO TOQUE (celular)
     Como chegar, Presentes e Instagram: a MESMA animação. Os elementos do grupo
     crescem juntos, a partir do centro do ícone principal.
     O clique/toque continua funcionando normalmente (popup ou link).
     --------------------------------------------------------------- */
  function crescerAoPassar(hitSel, centroSel, idsGrupo) {
    var hit = $(hitSel), centro = $(centroSel);
    var els = idsGrupo.map($).filter(Boolean);
    if (reduzir || !hit || !centro || !els.length) { return; }

    function origem() {   // centro do coração, na referência de cada elemento
      var cx = centro.offsetLeft + centro.offsetWidth / 2;
      var cy = centro.offsetTop + centro.offsetHeight / 2;
      els.forEach(function (el) {
        gsap.set(el, { transformOrigin: (cx - el.offsetLeft) + 'px ' + (cy - el.offsetTop) + 'px' });
      });
    }
    function subir() {
      origem();
      gsap.to(els, { scale: CFG.crescer.escala, duration: CFG.crescer.entra, ease: 'power2.out', overwrite: 'auto' });
    }
    function descer() {
      gsap.to(els, { scale: 1, duration: CFG.crescer.sai, ease: 'power2.out', overwrite: 'auto' });
    }

    hit.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { subir(); } });
    hit.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { descer(); } });
    hit.addEventListener('pointerdown',  function (e) { if (e.pointerType !== 'mouse') { subir(); } });
    hit.addEventListener('pointerup',     descer);
    hit.addEventListener('pointercancel', descer);
    hit.addEventListener('lostpointercapture', descer);
  }

  var hoverLigado = false;   // os ouvintes de hover/toque são ligados uma única vez

  function animarCrescer() {
    if (hoverLigado) { return; }
    hoverLigado = true;
    crescerAoPassar('#hit-comochegar', '#el-coracao-rosa',
      ['#el-coracao-rosa', '#el-pin', '#el-txt-comochegar']);
    crescerAoPassar('#hit-presentes', '#el-presente',
      ['#el-presente', '#el-txt-presentes']);
    crescerAoPassar('#hit-instagram', '#el-coracao-bolinhas',
      ['#el-coracao-bolinhas', '#el-icone-instagram', '#el-txt-instagram']);
  }

  /* ---------------------------------------------------------------
     3. R.S.V.P AUMENTA E DIMINUI (botão dourado + texto, juntos)
     --------------------------------------------------------------- */
  function animarRsvp() {
    var els = ['#el-botao-rsvp', '#el-rsvp-texto'].map($).filter(Boolean);
    var arco = $('#el-txt-confirmar'), botao = $('#el-botao-rsvp');
    if (reduzir || !els.length) { return; }

    /* o texto em arco "Clique aqui..." cresce junto, a partir do CENTRO DO BOTÃO
       (assim a distância entre texto e botão cresce na mesma proporção) */
    if (arco && botao) {
      var cx = botao.offsetLeft + botao.offsetWidth / 2;
      var cy = botao.offsetTop + botao.offsetHeight / 2;
      gsap.set(arco, { transformOrigin: ((cx - arco.offsetLeft) / arco.offsetWidth * 100) + '% ' +
                                        ((cy - arco.offsetTop) / arco.offsetHeight * 100) + '%' });
      els.push(arco);
    }
    gsap.set(els.slice(0, 2), { transformOrigin: '50% 50%' });

    var tw = gsap.to(els, {
      scale: CFG.rsvp.escala, duration: CFG.rsvp.duracao, ease: 'sine.inOut',
      yoyo: true, repeat: -1, force3D: true
    });
    loopSoVisivel(tw, '#sec-acoes');
  }

  /* ---------------------------------------------------------------
     3b. CORAÇÃO DO TRAJE ENTRA PELA DIREITA (v2.11; gatilho ajustado na v2.13)
     Desliza da borda direita até a posição do layout quando o coração está bem à vista
     (topo a 62% da altura da tela). Rolando de volta para cima ele volta para a direita,
     e entra de novo ao descer. Sem pulso. (tween de entrada: sem invalidateOnRefresh)
  --------------------------------------------------------------- */
  function animarTraje() {
    var el = $('#el-coracao-vinho');
    if (reduzir || !el) { return; }
    gsap.fromTo(el, { x: larguraPagina() * CFG.traje.deslocamento }, {
      x: 0, duration: CFG.traje.duracao, ease: CFG.traje.easing, force3D: true, immediateRender: true,
      scrollTrigger: { trigger: el, start: CFG.traje.comeca, toggleActions: 'play none none reverse' }
    });
  }

  /* ---------------------------------------------------------------
     4. BUQUÊS LATERAIS ANDAM PARA O CENTRO COM A ROLAGEM
     Delicado e sempre dentro da página: o buquê da esquerda começa um pouco
     mais à esquerda e o da direita um pouco mais à direita; conforme a rolagem
     avança eles se aproximam do centro e chegam na posição do layout quando
     o buquê está no meio da tela. Rolando de volta, o movimento inverte.
     --------------------------------------------------------------- */
  function buqueNaRolagem(id, lado) {
    var el = $(id);
    if (reduzir || !el) { return; }
    gsap.fromTo(el,
      { x: function () { return lado * CFG.buques.deslocamento * larguraPagina(); } },
      {
        x: 0, ease: 'none', force3D: true, immediateRender: true,
        scrollTrigger: {
          trigger: el, start: 'top bottom', end: 'center center',
          scrub: CFG.buques.suavizar, invalidateOnRefresh: true
        }
      });
    /* tamanho: tween próprio, numa faixa de rolagem mais curta que a do deslocamento,
       para o crescimento ser claramente visível enquanto o buquê passa pela tela */
    var img = el.querySelector('img');   // escala na <img> (o deslocamento fica na camada): assim um não zera o outro ao recalcular
    if (!img) { return; }
    gsap.fromTo(img, { scale: CFG.buques.escalaIni }, {
      scale: CFG.buques.escalaFim, ease: 'none', force3D: true, immediateRender: true,
      scrollTrigger: {
        trigger: el, start: CFG.buques.escalaDe, end: CFG.buques.escalaAte,
        scrub: CFG.buques.suavizar
      }
    });
  }

  function animarBuques() {
    buqueNaRolagem('#el-buque-b', -1);   // esquerda
    buqueNaRolagem('#el-buque-a',  1);   // direita
  }

  /* ---------------------------------------------------------------
     5. BORLA PENDULAR
     #el-borla é a borla recortada do cartão; o ponto de fixação (X do layout)
     fica no topo/centro da imagem, que é a origem da rotação.
     --------------------------------------------------------------- */
  function animarBorla() {
    var borla = $('#el-borla');
    if (reduzir || !borla) { return; }
    gsap.set(borla, { transformOrigin: '50% 0%' });
    var tw = gsap.fromTo(borla, { rotation: -CFG.borla.angulo }, {
      rotation: CFG.borla.angulo, duration: CFG.borla.duracao, ease: 'sine.inOut',
      yoyo: true, repeat: -1, force3D: true
    });
    tw.progress(0.5);   // começa no centro (borla reta) e já em movimento
    loopSoVisivel(tw, '#sec-dados');
  }

  /* ---------------------------------------------------------------
     6. ROSAS DO TOPO SOBEM E DESCEM COM A ROLAGEM (2 camadas)
     Cada camada anda uma distância diferente e em sentidos opostos
     enquanto passa pela tela (rolar para baixo/cima inverte o movimento).
     --------------------------------------------------------------- */
  function rosasNaRolagem(id, c) {
    var el = $(id);
    if (reduzir || !el) { return; }
    var d = function () { return larguraPagina() * c.amplitude * c.sentido; };
    gsap.fromTo(el, { y: function () { return -d(); } }, {
      y: d, ease: 'none', force3D: true, immediateRender: true,
      scrollTrigger: {
        trigger: el, start: 'top bottom', end: 'bottom top',
        scrub: CFG.rosasSuavizar, invalidateOnRefresh: true
      }
    });
    /* só a camada da frente também muda de tamanho, no mesmo movimento de rolagem do sobe/desce
       (faixa mais curta: assim o encolhimento acontece enquanto o cacho está de fato na tela) */
    if (c.escalaFim) {
      var alvo = c.escalaNaImg ? el.querySelector('img') : el;   // na <img> quando a camada já tem o y recalculado (evita um tween zerar o outro)
      gsap.fromTo(alvo, { scale: c.escalaIni || 1 }, {
        scale: c.escalaFim, ease: 'none', force3D: true, immediateRender: true,
        scrollTrigger: {
          trigger: (c.escalaGatilho && $(c.escalaGatilho)) || el, start: c.escalaDe, end: c.escalaAte,
          scrub: CFG.rosasSuavizar
        }
      });
    }
  }

  function animarRosas() {
    rosasNaRolagem('#el-rosas-a', CFG.rosasTras);      // camada de trás
    rosasNaRolagem('#el-rosas-b', CFG.rosasFrente);    // camada da frente
  }

  /* ---------------------------------------------------------------
     7. PAPEL SOBE DE DENTRO DO ENVELOPE (3 camadas: fundo → papel → frente)
     O papel começa baixo (atrás da frente do envelope, só uma pontinha aparece)
     e sobe com a rolagem até a posição do layout. Rolar de volta o faz descer.
     O recorte (clip-path no #el-envelope-papel, style.css) impede que o papel
     apareça abaixo do envelope; por isso o que se move é a <img> interna.
     Movimento em yPercent (relativo à própria imagem): escala sozinho.
     --------------------------------------------------------------- */
  function animarEnvelope() {
    var img = $('#el-envelope-papel img');
    if (reduzir || !img) { return; }
    /* papel maior (v2.12): escala ancorada na base do papel (escondida atrás da frente do envelope).
       Como o topo do papel sobe junto, o ponto de partida é compensado para continuar aparecendo só
       a pontinha no começo. 70.6 = distância do topo do papel até a base da camada, em % da altura. */
    gsap.set(img, { transformOrigin: '50% 100%', scale: CFG.envelope.escala });
    var inicio = CFG.envelope.inicio + (CFG.envelope.escala - 1) * 70.6;
    gsap.fromTo(img, { yPercent: inicio }, {
      yPercent: 0, ease: 'none', force3D: true, immediateRender: true,
      scrollTrigger: {
        trigger: '#el-envelope-fundo',
        start: CFG.envelope.comeca, end: CFG.envelope.termina,
        scrub: CFG.envelope.suavizar
      }
    });
  }

  /* ---------------------------------------------------------------
     8. LUSTRE: PÊNDULO + LUZ ACENDENDO E APAGANDO
     #el-lustre tem 2 imagens sobrepostas (apagado embaixo, aceso em cima).
     - pêndulo: o conjunto balança em torno do gancho da corrente (topo, centro),
       mesmo movimento da borla;
     - luz: só o aceso muda de opacidade (0 ↔ 1), em loop.
     Os dois pausam quando o lustre sai da tela.
     --------------------------------------------------------------- */
  function animarLustre() {
    var lustre = $('#el-lustre'), aceso = $('#el-lustre .lustre__aceso');
    if (reduzir || !lustre) { return; }
    var L = CFG.lustre;

    gsap.set(lustre, { transformOrigin: L.pivoX + ' 0%' });
    var pendulo = gsap.fromTo(lustre, { rotation: -L.angulo }, {
      rotation: L.angulo, duration: L.duracao, ease: 'sine.inOut',
      yoyo: true, repeat: -1, force3D: true
    });
    pendulo.progress(0.5);
    loopSoVisivel(pendulo, '#el-lustre');

    if (aceso) {
      var luz = gsap.timeline({ repeat: -1, repeatDelay: L.luzPausa });
      luz.to(aceso, { opacity: 1, duration: L.luzFade, ease: 'sine.inOut' })
         .to(aceso, { opacity: 0, duration: L.luzFade, ease: 'sine.inOut' }, '+=' + L.luzPausa);
      loopSoVisivel(luz, '#el-lustre');
    }
  }

  /* ---------------------------------------------------------------
     9. BRILHO CORRENDO PELO TEXTO FINAL E PELO MONOGRAMA   ** TESTE **
     Uma faixa de luz dourada passa da esquerda para a direita só sobre as letras
     (a luz usa a própria imagem como máscara, então não "vaza" para o fundo).
     Primeiro o texto, depois o monograma, descanso, e repete. Legibilidade: a faixa é
     estreita e a imagem original continua por baixo. Desligar: CFG.brilho.ativo = false.
     --------------------------------------------------------------- */
  function criarBrilho(sel) {
    var layer = $(sel), img = layer && layer.querySelector('img');
    if (!layer || !img) { return null; }
    var antigo = layer.querySelector('.brilho');
    if (antigo) { antigo.remove(); }
    var src = img.currentSrc || img.src;
    if (!src) { return null; }
    var b = document.createElement('span');
    b.className = 'brilho';
    b.setAttribute('aria-hidden', 'true');
    var m = 'url("' + src + '")';
    b.style.webkitMaskImage = m; b.style.maskImage = m;
    var B = CFG.brilho, a = B.intensidade, meio = 50, w = B.largura / 2;
    b.style.backgroundImage = 'linear-gradient(105deg, rgba(' + B.cor + ',0) ' + (meio - w) + '%, rgba(' + B.cor + ',' + a +
      ') ' + meio + '%, rgba(' + B.cor + ',0) ' + (meio + w) + '%)';
    layer.appendChild(b);
    return b;
  }

  function animarBrilho() {
    var B = CFG.brilho;
    if (reduzir || !B.ativo) { return; }
    /* cada grupo tem a sua própria rodada, pausando quando a seção sai da tela:
       texto final + monograma (um depois do outro) e, separado, a data/hora/Augusttus */
    [
      { alvos: ['#el-txt-luzes', '#el-monograma'], gatilho: '#sec-encerramento' },
      { alvos: ['#el-data'],                       gatilho: '#sec-dados' }
    ].forEach(function (g) {
      var els = g.alvos.map(criarBrilho).filter(Boolean);
      if (!els.length) { return; }
      // faixa começa fora (esquerda) e termina fora (direita): posição 100% -> 0% com fundo 300% de largura
      gsap.set(els, { backgroundPosition: '100% 0%' });
      var tl = gsap.timeline({ repeat: -1, repeatDelay: B.pausa });
      els.forEach(function (el, k) {
        tl.fromTo(el, { backgroundPosition: '100% 0%' },
          { backgroundPosition: '0% 0%', duration: B.duracao, ease: 'sine.inOut' }, k * B.atraso);
      });
      loopSoVisivel(tl, g.gatilho);
    });
  }

  /* ---------------------------------------------------------------
     INÍCIO / REINÍCIO
     --------------------------------------------------------------- */
  function iniciar() {
    if (ctx) { ctx.revert(); ctx = null; }          // reinício do convite: limpa e refaz
    ctx = gsap.context(function () {
      animarLaco();
      animarCrescer();
      animarRsvp();
      animarTraje();
      animarBuques();
      animarBorla();
      animarRosas();
      animarEnvelope();
      animarLustre();
      animarBrilho();
    });
    ScrollTrigger.refresh();
    window.requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  }

  document.addEventListener('convite:open', iniciar);
  window.addEventListener('load', function () { if (ctx) { ScrollTrigger.refresh(); } });
  window.addEventListener('resize', function () { if (ctx) { ScrollTrigger.refresh(); } });
})();
