'use strict';

// The order here is the order shown on the page and in each comparison row.
const tasks = [
  { id: 'handover', number: '01', title: 'Ball hand over', description: 'Grasp a ball with one hand, then pass it to the other hand in mid-air.' },
  { id: 'extraction', number: '02', title: 'Take out ball', description: 'Hold the container lid with one hand until the other hand has retrieved the ball.' },
  { id: 'racket', number: '03', title: 'Racket ball', description: 'Balance a ball on a racket while the other hand picks up a second ball and places it on the racket.' },
  { id: 'bow', number: '04', title: 'Toy bow', description: 'Coordinate both hands to draw and release a toy bow.' },
];
const methods = [
  { id: 'vr', label: 'VR only', tag: '01' },
  { id: 'leader', label: 'HMD + leader arm', tag: '02' },
  { id: 'hitmen', label: 'HITMEN', tag: 'OURS' },
];

document.querySelector('#benchmark-rows').innerHTML = tasks.map(task => `
  <article class="benchmark-row" id="task-${task.id}" aria-labelledby="title-${task.id}">
    <div class="task-heading">
      <div><div class="task-title"><span class="mono">${task.number}</span><h3 id="title-${task.id}">${task.title}</h3></div><p class="task-description">${task.description}</p></div>
      <div class="row-controls" role="group" aria-label="Playback controls for ${task.title}">
        <button type="button" class="play-row" aria-label="Play all ${task.title} videos">▶ Play all</button>
        <button type="button" class="restart-row" aria-label="Restart all ${task.title} videos">↺ Restart</button>
        <select class="playback-rate" aria-label="Playback speed for ${task.title}"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
      </div>
    </div>
    <div class="comparison-grid" tabindex="0" role="group" aria-label="${task.title}: VR only, HMD plus leader arm, and HITMEN. Scroll horizontally on small screens.">
      ${methods.map(method => `<figure class="benchmark-cell ${method.id === 'hitmen' ? 'ours' : ''}"><figcaption class="method-label">${method.label}<span>${method.tag}</span></figcaption><video class="benchmark-video" data-src="assets/videos/${task.id}-${method.id}.mp4" poster="assets/posters/${task.id}-${method.id}.jpg" muted playsinline controls preload="none" aria-label="${task.title} using ${method.label}"></video></figure>`).join('')}
    </div>
  </article>`).join('');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = navigator.connection?.saveData === true;
const automaticallyPaused = new WeakSet();
const userPaused = new WeakSet();
const videosInView = new Set();
const resumeAfterVisibility = new Set();
let toastTimer;

function notify(message) {
  const toast = document.querySelector('.toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
}

function loadVideo(video) {
  if (video.dataset.src) {
    video.src = video.dataset.src;
    delete video.dataset.src;
    video.load();
  }
}

function pauseAutomatically(video) {
  if (!video.paused) {
    automaticallyPaused.add(video);
    video.pause();
  }
}

function canAutoPlay(video) {
  return video.hasAttribute('data-autoplay') && !reducedMotion.matches && !saveData && !userPaused.has(video) && !document.hidden;
}

// Load demonstrations only near the viewport. Benchmark clips load when their
// row approaches, but never autoplay; comparisons are visitor initiated.
const loadObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    if (!saveData) loadVideo(entry.target);
    loadObserver.unobserve(entry.target);
  }
}, { rootMargin: '250px 0px' });

const playObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const video = entry.target;
    if (entry.isIntersecting) {
      videosInView.add(video);
      if (canAutoPlay(video)) {
        loadVideo(video);
        video.play().catch(() => {}); // Native controls remain available if autoplay is blocked.
      }
    } else {
      videosInView.delete(video);
      const row = video.closest('.benchmark-row');
      // A mobile comparison can span beyond the viewport. A row-level observer
      // controls its three players together, including horizontally hidden ones.
      if (!row) pauseAutomatically(video);
    }
  }
}, { threshold: 0.2 });

document.querySelectorAll('video').forEach(video => {
  video.defaultMuted = video.hasAttribute('muted');
  video.muted = video.defaultMuted;
  loadObserver.observe(video);
  playObserver.observe(video);
  video.addEventListener('pointerdown', () => loadVideo(video), { passive: true });
  video.addEventListener('keydown', () => loadVideo(video));
  video.addEventListener('play', () => userPaused.delete(video));
  video.addEventListener('pause', () => {
    if (automaticallyPaused.has(video)) automaticallyPaused.delete(video);
    else if (video.hasAttribute('data-autoplay')) userPaused.add(video);
  });
  video.addEventListener('error', () => {
    const container = video.parentElement;
    if (container.querySelector('.media-error')) return;
    const error = document.createElement('p');
    error.className = 'media-error';
    error.append('This clip could not load. ');
    const link = document.createElement('a');
    link.href = video.currentSrc || video.src || video.dataset.src;
    link.textContent = 'Open the video directly ↗';
    error.append(link);
    container.append(error);
  });
});

function readyToPlay(video) {
  loadVideo(video);
  if (video.readyState >= 3) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('canplay', success);
      video.removeEventListener('error', failure);
    };
    const success = () => { cleanup(); resolve(); };
    const failure = () => { cleanup(); reject(new Error('Video unavailable')); };
    const timeout = setTimeout(failure, 20000);
    video.addEventListener('canplay', success, { once: true });
    video.addEventListener('error', failure, { once: true });
    video.preload = 'auto';
  });
}

const rowObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target: row, isIntersecting }) => {
    if (!isIntersecting) {
      row.dataset.operation = String(Number(row.dataset.operation || 0) + 1);
      row.querySelectorAll('video').forEach(pauseAutomatically);
    }
  });
}, { threshold: 0.05 });

document.querySelectorAll('.benchmark-row').forEach(row => {
  const videos = [...row.querySelectorAll('video')];
  const button = row.querySelector('.play-row');
  const restart = row.querySelector('.restart-row');
  const taskName = row.querySelector('h3').textContent;
  const updateButton = () => {
    const playing = videos.some(video => !video.paused && !video.ended);
    button.textContent = playing ? 'Ⅱ Pause all' : '▶ Play all';
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} all ${taskName} videos`);
  };
  async function playTogether(reset) {
    const operation = String(Number(row.dataset.operation || 0) + 1);
    row.dataset.operation = operation;
    button.disabled = true;
    restart.disabled = true;
    button.textContent = 'Loading…';
    try {
      videos.forEach(pauseAutomatically);
      await Promise.all(videos.map(readyToPlay));
      if (row.dataset.operation !== operation || document.hidden) return;
      const shouldReset = reset || videos.some(video => video.ended);
      videos.forEach(video => {
        if (shouldReset) video.currentTime = 0;
        video.playbackRate = Number(row.querySelector('.playback-rate').value);
      });
      const results = await Promise.allSettled(videos.map(video => video.play()));
      if (results.some(result => result.status === 'rejected')) {
        videos.forEach(pauseAutomatically);
        notify('Playback was blocked. Use the play control on each video to start it.');
      }
    } catch {
      notify('A clip could not load. Please try again or use its individual player.');
    } finally {
      button.disabled = false;
      restart.disabled = false;
      updateButton();
    }
  }
  button.addEventListener('click', () => {
    if (videos.some(video => !video.paused && !video.ended)) {
      videos.forEach(pauseAutomatically);
      updateButton();
    } else playTogether(false);
  });
  restart.addEventListener('click', () => playTogether(true));
  row.querySelector('.playback-rate').addEventListener('change', event => {
    videos.forEach(video => { video.playbackRate = Number(event.target.value); });
  });
  videos.forEach(video => ['play', 'pause', 'ended'].forEach(event => video.addEventListener(event, updateButton)));
  rowObserver.observe(row);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    document.querySelectorAll('video').forEach(video => {
      if (!video.paused) resumeAfterVisibility.add(video);
      pauseAutomatically(video);
    });
  } else {
    resumeAfterVisibility.forEach(video => {
      if (videosInView.has(video) && canAutoPlay(video)) video.play().catch(() => {});
    });
    resumeAfterVisibility.clear();
  }
});
reducedMotion.addEventListener('change', () => {
  document.querySelectorAll('[data-autoplay]').forEach(video => {
    if (reducedMotion.matches) pauseAutomatically(video);
    else if (videosInView.has(video) && canAutoPlay(video)) video.play().catch(() => {});
  });
});

const navLinks = [...document.querySelectorAll('.site-header nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
let scrollQueued = false;
function updateNavigation() {
  let active = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 180) active = section.id;
  }
  navLinks.forEach(link => {
    const selected = link.getAttribute('href') === `#${active}`;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateNavigation); }
}, { passive: true });
updateNavigation();
