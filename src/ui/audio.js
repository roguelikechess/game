function createAudioElement(src, loop = false, volume = 0.5) {
  if (!src) {
    return null;
  }
  try {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    audio._baseVolume = volume;
    return audio;
  } catch (err) {
    return null;
  }
}

function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function playElement(audio) {
  if (!audio) {
    return;
  }
  audio.currentTime = 0;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

function stopElement(audio) {
  if (!audio) {
    return;
  }
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (err) {
    // ignore
  }
}

export class AudioManager {
  constructor({ lobbyTracks = [], battleTracks = [], effectTracks = [] } = {}) {
    this.lobbyTracks = lobbyTracks;
    this.battleTracks = battleTracks;
    this.effectTracks = effectTracks;
    this.currentLobbyId = lobbyTracks[0]?.id || null;
    this.currentBattleId = battleTracks[0]?.id || null;
    this.currentEffectId = effectTracks[0]?.id || null;
    this.lobbyAudio = null;
    this.battleAudio = null;
    this.musicVolume = 1;
    this.musicMuted = false;
  }

  setLobbyTrack(id) {
    if (this.currentLobbyId === id) {
      return;
    }
    this.currentLobbyId = id;
    stopElement(this.lobbyAudio);
    this.lobbyAudio = null;
  }

  setBattleTrack(id) {
    if (this.currentBattleId === id) {
      return;
    }
    this.currentBattleId = id;
    stopElement(this.battleAudio);
    this.battleAudio = null;
  }

  setEffectSet(id) {
    this.currentEffectId = id;
  }

  getLobbyTrack() {
    return this.lobbyTracks.find((track) => track.id === this.currentLobbyId) || null;
  }

  getBattleTrack() {
    return this.battleTracks.find((track) => track.id === this.currentBattleId) || null;
  }

  getEffectSet() {
    return this.effectTracks.find((set) => set.id === this.currentEffectId) || null;
  }

  playLobby() {
    const track = this.getLobbyTrack();
    if (!track) {
      return;
    }
    if (!this.lobbyAudio || this.lobbyAudio.src !== track.src) {
      stopElement(this.lobbyAudio);
      this.lobbyAudio = createAudioElement(track.src, true, 0.45);
    }
    this.updateAudioVolume(this.lobbyAudio);
    stopElement(this.battleAudio);
    playElement(this.lobbyAudio);
  }

  playBattle() {
    const track = this.getBattleTrack();
    if (!track) {
      return;
    }
    if (!this.battleAudio || this.battleAudio.src !== track.src) {
      stopElement(this.battleAudio);
      this.battleAudio = createAudioElement(track.src, true, 0.5);
    }
    this.updateAudioVolume(this.battleAudio);
    stopElement(this.lobbyAudio);
    playElement(this.battleAudio);
  }

  playHit() {
    const effectSet = this.getEffectSet();
    if (!effectSet?.samples?.hit) {
      return;
    }
    playElement(createAudioElement(effectSet.samples.hit, false, 0.6));
  }

  playVictory(victorious) {
    const effectSet = this.getEffectSet();
    if (!effectSet?.samples) {
      return;
    }
    stopElement(this.battleAudio);
    stopElement(this.lobbyAudio);
    const sample = victorious ? effectSet.samples.victory : effectSet.samples.defeat;
    if (!sample) {
      return;
    }
    playElement(createAudioElement(sample, false, victorious ? 0.55 : 0.45));
  }

  startBackground() {
    this.playLobby();
  }

  stopBackground() {
    stopElement(this.lobbyAudio);
    stopElement(this.battleAudio);
  }

  stopAll() {
    this.stopBackground();
  }

  setMusicVolume(volume) {
    this.musicVolume = clampVolume(volume);
    this.applyMusicSettings();
  }

  setMusicMuted(muted) {
    this.musicMuted = !!muted;
    this.applyMusicSettings();
  }

  applyMusicSettings() {
    this.updateAudioVolume(this.lobbyAudio);
    this.updateAudioVolume(this.battleAudio);
  }

  updateAudioVolume(audio) {
    if (!audio) {
      return;
    }
    const baseVolume = Number.isFinite(audio._baseVolume) ? audio._baseVolume : audio.volume || 0.5;
    const applied = this.musicMuted ? 0 : clampVolume(baseVolume * this.musicVolume);
    audio.volume = applied;
  }
}
