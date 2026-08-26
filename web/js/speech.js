// Lecture à voix haute, via l'API SpeechSynthesis du navigateur.
// Aucun réseau, aucun coût : la voix est celle du système.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

/** Certaines plateformes chargent les voix de façon asynchrone. */
let voices = [];
function loadVoices() {
  voices = synth?.getVoices?.() ?? [];
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

function frenchVoice() {
  if (!voices.length) loadVoices();
  const fr = voices.filter((v) => v.lang?.toLowerCase().startsWith('fr'));
  // Une voix locale évite la latence et fonctionne hors-ligne.
  return fr.find((v) => v.localService) ?? fr[0] ?? null;
}

let queue = [];
let index = 0;
let handlers = {};
let keepAlive = null;
let speakRate = 0.95;
// Jeton de génération : cancel() peut déclencher onend/onerror en différé, et
// une lecture annulée ne doit surtout pas relancer la suivante.
let runId = 0;

// Chrome interrompt la synthèse au bout d'une quinzaine de secondes ;
// un resume() périodique la maintient active.
function startKeepAlive() {
  stopKeepAlive();
  keepAlive = setInterval(() => {
    if (synth.speaking && !synth.paused) synth.resume();
  }, 8000);
}
function stopKeepAlive() {
  clearInterval(keepAlive);
  keepAlive = null;
}

function speakCurrent(id) {
  if (id !== runId) return;

  if (index >= queue.length) {
    stopKeepAlive();
    const done = handlers.onEnd;
    handlers = {};
    done?.();
    return;
  }
  handlers.onStep?.(index);

  const utterance = new SpeechSynthesisUtterance(queue[index]);
  const voice = frenchVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'fr-FR';
  utterance.rate = speakRate;   // par défaut un poil plus lent : on explique une règle
  utterance.pitch = 1;

  const fail = (reason) => {
    if (id !== runId) return;
    runId += 1;                        // coupe les callbacks encore en vol
    stopKeepAlive();
    clearTimeout(watchdog);
    synth.cancel();
    const onError = handlers.onError;
    handlers = {};
    onError?.(reason);
  };

  // Certaines plateformes acceptent speak() sans jamais rien émettre (aucune
  // voix installée) : sans ce garde-fou l'interface resterait bloquée.
  const watchdog = setTimeout(() => fail('no-start'), 4000);

  utterance.onstart = () => clearTimeout(watchdog);
  utterance.onend = () => {
    if (id !== runId) return;
    clearTimeout(watchdog);
    index += 1;
    speakCurrent(id);
  };
  utterance.onerror = (event) => {
    if (id !== runId) return;          // annulation : rien à signaler
    clearTimeout(watchdog);
    fail(event.error);
  };

  synth.speak(utterance);
}

export const speech = {
  /** La lecture à voix haute est-elle disponible ici ? */
  get supported() {
    return Boolean(synth && typeof SpeechSynthesisUtterance === 'function');
  },

  get state() {
    if (!synth || !synth.speaking) return 'idle';
    return synth.paused ? 'paused' : 'playing';
  },

  /**
   * Lit une suite de textes, un par un.
   *
   * `rate` sert à distinguer les usages : on explique une règle posément, mais
   * un animateur de quiz qui traîne casse le rythme de la manche.
   *
   * @param {string[]} texts
   * @param {{onStep?:(i:number)=>void, onEnd?:()=>void, onError?:(e:string)=>void, rate?:number}} callbacks
   */
  speak(texts, callbacks = {}) {
    if (!this.supported) return false;
    this.stop();
    runId += 1;
    queue = [].concat(texts).filter(Boolean);
    index = 0;
    speakRate = callbacks.rate ?? 0.95;
    handlers = callbacks;
    startKeepAlive();
    speakCurrent(runId);
    return true;
  },

  pause() {
    if (synth?.speaking && !synth.paused) synth.pause();
  },

  resume() {
    if (synth?.paused) synth.resume();
  },

  stop() {
    if (!synth) return;
    runId += 1;                 // invalide les callbacks encore en vol
    stopKeepAlive();
    queue = [];
    index = 0;
    const previous = handlers;
    handlers = {};
    synth.cancel();
    previous.onEnd?.();
  },
};
