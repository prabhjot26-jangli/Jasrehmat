/* Vanilla JavaScript: hash navigation, one visible chapter, local-file friendly. */
(() => {
  "use strict";
  const config = window.BIRTHDAY;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad = value => String(value).padStart(2, '0');
  const colours = ['#efc0ca', '#d7b57d', '#f6eddd', '#789684', '#8e9fbd'];
  const screens = $$('.screen');
  const fallbackFor = photo => (config.placeholderImages && config.placeholderImages[photo.colour || 'rose']) || `assets/photos/placeholder-${photo.colour || 'rose'}.svg`;
  const sourceFor = photo => config.photosReady ? photo.file : fallbackFor(photo);
  let currentChapter = -1;
  let portraitIndex = 0;
  let unwrapToken = 0;
  let toastTimer;

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#icon-${name}`);
    svg.append(use);
    return svg;
  }
  $$('[data-name]').forEach(node => { node.textContent = config.name; });
  $$('[data-from]').forEach(node => { node.textContent = config.from; });
  $$('[data-date]').forEach(node => { node.textContent = config.dateLabel.toUpperCase(); });
  $('#birthday-title [data-name]').textContent = `${config.name}.`;
  $('#letter-reader-title [data-name]').textContent = `${config.name},`;
  $('.envelope-card i').textContent = `For ${config.name}.`;
  document.title = `Probably her. Definitely her day. | ${config.name}`;

  // Navigation uses real hashes, so the browser's Back/Forward also works.
  function renderChapter(index, focus = true) {
    const next = Math.min(screens.length - 1, Math.max(0, index));
    if (next === currentChapter) return;
    clearTimeout(toastTimer);
    $('#toast').classList.remove('visible');
    const wasUnopened = currentChapter <= 0;
    currentChapter = next;
    screens.forEach((screen, i) => {
      screen.hidden = i !== next;
      screen.classList.remove('scene-enter');
    });
    const screen = screens[next];
    screen.scrollTop = 0;
    screen.classList.add('scene-enter');
    $('#birthday-app').dataset.tone = screen.dataset.tone;
    $('#chapter-navigation').hidden = next === 0;
    $('#open-menu').hidden = next === 0;
    $('#progress').style.width = `${next / (screens.length - 1) * 100}%`;
    $('#chapter-count').textContent = `${pad(next)} / ${pad(screens.length - 1)}`;
    $('#chapter-count').setAttribute('aria-label', `Chapter ${next} of ${screens.length - 1}`);
    $('#next-label').textContent = next === screens.length - 1 ? 'Again' : 'Next';
    $('#next-chapter').setAttribute('aria-label', next === screens.length - 1 ? 'Return to the opening envelope' : `Next: ${screens[next + 1].dataset.title}`);
    $('#previous-chapter').setAttribute('aria-label', `Back: ${screens[Math.max(0, next - 1)].dataset.title}`);
    $$('#chapter-menu button').forEach((button, i) => {
      if (i + 1 === next) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('#screen-status').textContent = next ? `${screen.dataset.title}. Chapter ${next} of ${screens.length - 1}.` : 'The opening envelope.';
    if (next === 0) {
      unwrapToken += 1;
      $('#invitation').classList.remove('unwrapping');
      $('#open-birthday').disabled = false;
      $('#unwrap-button').disabled = false;
    }
    if (focus) {
      const heading = $$('h1,h2,h3', screen).find(node => !node.closest('[hidden]'));
      if (heading) heading.focus({ preventScroll: true });
    }
    if (next === 1 && wasUnopened) confettiBurst(95);
  }
  function navigate(index) {
    const next = Math.min(screens.length - 1, Math.max(0, index));
    if (next === currentChapter) return;
    const hash = screens[next].dataset.route;
    const url = `${location.pathname}${location.search}${hash ? '#' + hash : ''}`;
    try { history.pushState(null, '', url); }
    catch (_) { location.hash = hash; }
    renderChapter(next);
  }
  function readRoute() {
    let route = '';
    try { route = decodeURIComponent(location.hash.slice(1)); } catch (_) { /* Invalid hashes open the envelope. */ }
    const index = screens.findIndex(screen => screen.dataset.route === route);
    renderChapter(index < 0 ? 0 : index, false);
  }
  $('#home-button').addEventListener('click', () => navigate(0));
  $('#previous-chapter').addEventListener('click', () => navigate(currentChapter - 1));
  $('#next-chapter').addEventListener('click', () => navigate(currentChapter === screens.length - 1 ? 0 : currentChapter + 1));
  window.addEventListener('popstate', readRoute);
  window.addEventListener('hashchange', readRoute);
  screens.slice(1).forEach((screen, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    const number = document.createElement('span');
    number.textContent = pad(i + 1);
    const title = document.createElement('span');
    title.textContent = screen.dataset.title;
    button.append(number, title);
    button.addEventListener('click', () => {
      $('#menu-dialog').close();
      navigate(i + 1);
    });
    $('#chapter-menu').append(button);
  });
  function openDialog(dialog) { dialog.showModal(); dialog.scrollTop = 0; }
  $$('dialog').forEach(dialog => {
    $$('[data-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  $('#open-menu').addEventListener('click', () => openDialog($('#menu-dialog')));
  async function unwrap() {
    if ($('#open-birthday').disabled) return;
    $('#open-birthday').disabled = true;
    $('#unwrap-button').disabled = true;
    $('#invitation').classList.add('unwrapping');
    const token = ++unwrapToken;
    await new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : 650));
    if (token === unwrapToken) navigate(1);
  }
  $('#open-birthday').addEventListener('click', unwrap);
  $('#unwrap-button').addEventListener('click', unwrap);

  function setPhoto(img, photo, index) {
    img.onerror = () => {
      img.onerror = null;
      img.src = fallbackFor(photo);
      img.alt = `A decorative portrait frame for ${config.name}`;
    };
    img.src = sourceFor(photo);
    img.style.objectPosition = photo.position || 'center';
    img.alt = config.photosReady ? `${config.name} — ${photo.caption}` : `Decorative portrait frame ${index + 1} for ${config.name}`;
  }
  // setPhoto($('#hero-image'), config.photos[0], 0);
  setPhoto(
    $('#hero-image'),
    config.heroPhoto || config.photos[0],
    0
  );
  function showPortrait(index) {
    portraitIndex = (index + config.photos.length) % config.photos.length;
    const photo = config.photos[portraitIndex];
    setPhoto($('#portrait-image'), photo, portraitIndex);
    setPhoto($('#lightbox-image'), photo, portraitIndex);
    $('#portrait-frame').dataset.colour = photo.colour;
    $('#gallery-caption').textContent = photo.caption;
    $('#photo-caption').textContent = photo.caption;
    $('#gallery-count').textContent = `${pad(portraitIndex + 1)} / ${pad(config.photos.length)}`;
    $('#lightbox-count').textContent = `${pad(portraitIndex + 1)} / ${pad(config.photos.length)}`;
    $('#open-photo').setAttribute('aria-label', `Open portrait ${portraitIndex + 1}: ${photo.caption}`);
  }
  showPortrait(0);
  $('#gallery-prev').addEventListener('click', () => showPortrait(portraitIndex - 1));
  $('#gallery-next').addEventListener('click', () => showPortrait(portraitIndex + 1));
  $('#lightbox-prev').addEventListener('click', () => showPortrait(portraitIndex - 1));
  $('#lightbox-next').addEventListener('click', () => showPortrait(portraitIndex + 1));
  $('#open-photo').addEventListener('click', () => openDialog($('#photo-dialog')));
  $('#shades-button').addEventListener('click', () => openDialog($('#shades-dialog')));
  [$('#open-photo'), $('#lightbox-image')].forEach(node => {
    let touchStart;
    node.addEventListener('touchstart', event => {
      const touch = event.changedTouches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    node.addEventListener('touchend', event => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        event.preventDefault();
        showPortrait(portraitIndex + (dx < 0 ? 1 : -1));
      }
      touchStart = null;
    }, { passive: false });
  });
  [$('#portraits'), $('#photo-dialog')].forEach(node => node.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPortrait(portraitIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPortrait(portraitIndex + 1); }
  }));

  // Long personal details live inside one reader; the chapter controls stay visible.
  function bindReader(type) {
    const cover = $(`#${type}-cover`), reader = $(`#${type}-reader`), section = cover.closest('.screen');
    $(`#open-${type}`).addEventListener('click', () => {
      cover.hidden = true;
      reader.hidden = false;
      $(`#open-${type}`).setAttribute('aria-expanded', 'true');
      section.scrollTop = 0;
      $(`#${type}-reader-title`).focus({ preventScroll: true });
    });
    $(`#close-${type}`).addEventListener('click', () => {
      reader.hidden = true;
      cover.hidden = false;
      $(`#open-${type}`).setAttribute('aria-expanded', 'false');
      section.scrollTop = 0;
      $(`#open-${type}`).focus({ preventScroll: true });
    });
  }
  bindReader('notice');
  bindReader('letter');
  config.letter.forEach(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    $('#letter-paragraphs').append(paragraph);
  });
  if (config.verse && config.verse.length) {
    const verse = document.createElement('blockquote');
    verse.className = 'birthday-verse';
    verse.textContent = config.verse.join('\n');
    $('#letter-paragraphs').append(verse);
  }
  $('#postscript').textContent = `P.S. ${config.postscript}`;

  config.songs.forEach(song => {
    const link = document.createElement('a');
    link.className = 'song-row';
    link.href = song.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(song.search || song.title)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${link.href.includes('/search/') ? 'Find' : 'Open'} ${song.title} on Spotify (opens a new tab)`);
    const description = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'song-title';
    title.textContent = song.title;
    const note = document.createElement('span');
    note.className = 'song-note';
    note.textContent = song.note;
    description.append(title, note);
    link.append(description, icon('arrow'));
    link.addEventListener('click', stopSound);
    $('#song-list').append(link);
  });

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3300);
  }
  const reasons = [
    ['Wrote a little shayari.', 'For the poet in you. +1 star.'],
    ['Always Delivering elite comebacks.', 'Understanding still updating. +1 star.'],
    ['Making my days lighter and joyous🤭', 'That laugh is a very good reason. +1 star.'],
    ['Ragebaiting me all the time.', 'Birthday immunity wins. +1 star.'],
    ['Just being yourself, honestly.', 'No performance required. Just you. +1 star.']
  ];
  const collected = new Set();
  let reasonIndex = 0;
  function updateReview() {
    const awarded = collected.has(reasonIndex);
    $('#reason-count').textContent = `${collected.size === reasons.length ? 'ALL YOURS' : 'REASON ' + pad(reasonIndex + 1) + ' / ' + pad(reasons.length)}`;
    $('#star-reason').textContent = reasons[reasonIndex][0];
    const button = $('#award-star');
    const finished = collected.size === reasons.length;
    button.disabled = finished;
    button.replaceChildren(document.createTextNode(finished ? 'All ten. Yours to keep.' : awarded ? 'Next reason' : 'Award a good girl star'), icon(awarded && !finished ? 'arrow' : 'star'));
    $('#star-count').textContent = 5 + collected.size;
  }
  $('#award-star').addEventListener('click', () => {
    if (collected.has(reasonIndex)) {
      if (reasonIndex < reasons.length - 1) reasonIndex += 1;
      $('#star-response').textContent = '';
      updateReview();
      return;
    }
    collected.add(reasonIndex);
    $('#star-response').textContent = reasons[reasonIndex][1];
    updateReview();
    $('#star-count').classList.remove('star-pop');
    void $('#star-count').offsetWidth;
    $('#star-count').classList.add('star-pop');
    if (collected.size === reasons.length) confettiBurst(65);
  });
  $('#deduct-star').addEventListener('click', () => {
    $('#star-response').textContent = 'Deduction attempted. Immediately refunded. ✦';
    toast('Birthday immunity, madam. Your stars stay.');
  });
  updateReview();

  const candles = $$('.candle');
  let wishComplete = false;
  function extinguish(candle) {
    candle.classList.add('blown');
    candle.setAttribute('aria-pressed', 'true');
    candle.setAttribute('aria-label', `Candle ${candles.indexOf(candle) + 1} is out`);
    if (candles.every(item => item.classList.contains('blown')) && !wishComplete) {
      wishComplete = true;
      $('#blow-candles').hidden = true;
      $('#wish-result').hidden = false;
      $('#relight-candles').hidden = false;
      confettiBurst(100);
      if (document.activeElement === $('#blow-candles')) $('#relight-candles').focus({ preventScroll: true });
    }
  }
  candles.forEach(candle => candle.addEventListener('click', () => extinguish(candle)));
  $('#blow-candles').addEventListener('click', () => candles.forEach(extinguish));
  $('#relight-candles').addEventListener('click', () => {
    wishComplete = false;
    candles.forEach((candle, index) => {
      candle.classList.remove('blown');
      candle.setAttribute('aria-pressed', 'false');
      candle.setAttribute('aria-label', `Blow out candle ${index + 1}`);
    });
    $('#blow-candles').hidden = false;
    $('#wish-result').hidden = true;
    $('#relight-candles').hidden = true;
    $('#blow-candles').focus({ preventScroll: true });
  });

  // Finite canvas particles. No permanent animation loop or confetti library.
  const canvas = $('#confetti');
  const context = canvas.getContext('2d');
  let confettiFrame = 0;
  function confettiBurst(amount = 100) {
    if (reducedMotion.matches || !context) return;
    cancelAnimationFrame(confettiFrame);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const particles = Array.from({ length: amount }, () => ({
      x: width * (.15 + Math.random() * .7), y: -25 - Math.random() * height * .6,
      vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3,
      size: 3 + Math.random() * 5, rotation: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .1, colour: colours[Math.floor(Math.random() * colours.length)]
    }));
    let lastTime = performance.now();
    const startTime = lastTime;
    function frame(time) {
      const step = Math.min((time - lastTime) / 16.667, 2);
      lastTime = time;
      context.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx * step; p.y += p.vy * step; p.rotation += p.spin * step;
        context.save(); context.translate(p.x, p.y); context.rotate(p.rotation);
        context.globalAlpha = Math.max(0, 1 - Math.max(0, time - startTime - 2800) / 1300);
        context.fillStyle = p.colour;
        context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .48);
        context.restore();
      });
      if (time - startTime < 4100 && !document.hidden) confettiFrame = requestAnimationFrame(frame);
      else context.clearRect(0, 0, width, height);
    }
    confettiFrame = requestAnimationFrame(frame);
  }

  // Original, quiet music-box pattern. It does not imitate any listed song.
  let audioContext;
  let musicTimer;
  let soundOn = false;
  let audio;
  const activeNotes = new Set();
  const melody = [74, 69, 77, 76, 72, 69, 65, 69, 70, 65, 74, 72, 69, 64, 67, 69];
  let noteIndex = 0;
  function setSoundUI(on) {
    soundOn = on;
    $('#sound-toggle').setAttribute('aria-pressed', String(on));
    $('#sound-toggle').setAttribute('aria-label', on ? 'Turn music off' : `Turn on ${config.audioFile ? config.audioLabel : 'birthday instrumental'}`);
  }
  function playNote() {
    if (!audioContext || !soundOn) return;
    const now = audioContext.currentTime;
    const frequency = 440 * Math.pow(2, (melody[noteIndex++ % melody.length] - 69) / 12);
    const oscillator = audioContext.createOscillator();
    const harmonic = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const harmonicGain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    harmonic.type = 'sine'; harmonic.frequency.value = frequency * 2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.045, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + 2.1);
    harmonicGain.gain.value = .12;
    oscillator.connect(gain); harmonic.connect(harmonicGain); harmonicGain.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(now); harmonic.start(now);
    oscillator.stop(now + 2.2); harmonic.stop(now + 2.2);
    activeNotes.add(oscillator); activeNotes.add(harmonic);
    oscillator.onended = () => { activeNotes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    harmonic.onended = () => { activeNotes.delete(harmonic); harmonic.disconnect(); harmonicGain.disconnect(); };
  }
  function stopSound() {
    clearInterval(musicTimer);
    if (audio) audio.pause();
    activeNotes.forEach(oscillator => { try { oscillator.stop(); } catch (_) { /* Already ended. */ } });
    activeNotes.clear();
    setSoundUI(false);
  }
  $('#sound-toggle').addEventListener('click', async () => {
    if (soundOn) { stopSound(); return; }
    try {
      if (config.audioFile) {
        if (!audio) {
          audio = new Audio(config.audioFile); audio.loop = true; audio.volume = .35;
          audio.addEventListener('error', () => { stopSound(); toast('The music file could not be opened. The birthday surprise is still ready.'); });
        }
        await audio.play();
        setSoundUI(true);
      } else {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) { toast('Music is unavailable here. Your birthday surprises still work.'); return; }
        audioContext ||= new AudioContextClass();
        await audioContext.resume();
        setSoundUI(true);
        playNote();
        musicTimer = setInterval(playNote, 650);
      }
    } catch (_) {
      stopSound();
      toast('Tap again to try the music. Your browser may need another tap.');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSound();
      cancelAnimationFrame(confettiFrame);
      if (context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
  window.addEventListener('pagehide', stopSound);
  readRoute();
  // Start music on the first tap.
  document.addEventListener('click', (event) => {
    // Let the music button handle itself.
    if (event.target.closest('#sound-toggle')) return;

    if (config.audioFile && !soundOn) {
      $('#sound-toggle').click();
    }
  }, { once: true });

})();
