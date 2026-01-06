// AudioSystem for Stick & Shift
// Handles sound effects and music with Web Audio API

import Phaser from 'phaser';
import { SaveSystem } from './SaveSystem';

export class AudioSystem {
  private scene: Phaser.Scene;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private audioContext?: AudioContext;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Load settings
    const settings = SaveSystem.getInstance().getSettings();
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;
    
    // Initialize Web Audio context
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }
  
  // Generate a simple tone
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 1): void {
    if (!this.audioContext || this.sfxVolume === 0) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(volume * this.sfxVolume * 0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Silently fail
    }
  }
  
  // Play a chord
  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine'): void {
    frequencies.forEach(freq => this.playTone(freq, duration, type, 0.5));
  }
  
  // Generate noise burst
  private playNoise(duration: number, volume: number = 0.5): void {
    if (!this.audioContext || this.sfxVolume === 0) return;
    
    try {
      const bufferSize = this.audioContext.sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume * this.sfxVolume * 0.3, this.audioContext.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (e) {
      // Silently fail
    }
  }
  
  // === Sound Effects ===
  
  playClick(): void {
    this.playTone(800, 0.05, 'square');
  }
  
  playHover(): void {
    this.playTone(600, 0.03, 'sine', 0.3);
  }
  
  playShoot(): void {
    this.playTone(200, 0.15, 'sawtooth');
    this.playNoise(0.1, 0.4);
  }
  
  playPass(): void {
    this.playTone(400, 0.1, 'triangle');
  }
  
  playTackle(): void {
    this.playNoise(0.15, 0.6);
    this.playTone(150, 0.1, 'square');
  }
  
  playSteal(): void {
    this.playTone(500, 0.08, 'square');
    this.playTone(700, 0.08, 'square');
  }
  
  playDodge(): void {
    this.playTone(600, 0.1, 'sine');
    this.playTone(800, 0.08, 'sine');
  }
  
  playGoal(): void {
    // Celebratory chord progression
    this.playChord([523.25, 659.25, 783.99], 0.3);  // C major
    setTimeout(() => this.playChord([587.33, 739.99, 880], 0.3), 200);  // D major
    setTimeout(() => this.playChord([659.25, 830.61, 987.77], 0.5), 400);  // E major
  }
  
  playConcede(): void {
    // Sad chord
    this.playChord([220, 261.63, 311.13], 0.5);  // A minor
  }
  
  playUpgrade(): void {
    this.playTone(440, 0.1, 'sine');
    setTimeout(() => this.playTone(554.37, 0.1, 'sine'), 100);
    setTimeout(() => this.playTone(659.25, 0.15, 'sine'), 200);
  }
  
  playPowerUp(): void {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playTone(400 + i * 100, 0.08, 'sine'), i * 50);
    }
  }
  
  playError(): void {
    this.playTone(200, 0.1, 'square');
    setTimeout(() => this.playTone(150, 0.15, 'square'), 100);
  }
  
  playSuccess(): void {
    this.playTone(523.25, 0.1, 'sine');
    setTimeout(() => this.playTone(659.25, 0.15, 'sine'), 100);
  }
  
  playTimer(): void {
    this.playTone(880, 0.05, 'sine');
  }
  
  playBossAppear(): void {
    this.playTone(100, 0.3, 'sawtooth');
    this.playNoise(0.2, 0.5);
  }
  
  playMomentStart(): void {
    this.playTone(440, 0.1, 'sine');
    setTimeout(() => this.playTone(440, 0.1, 'sine'), 150);
    setTimeout(() => this.playTone(660, 0.2, 'sine'), 300);
  }
  
  playMomentEnd(): void {
    this.playChord([392, 493.88, 587.33], 0.4);  // G major
  }
  
  playWhistle(): void {
    this.playTone(1000, 0.2, 'sine');
    setTimeout(() => this.playTone(800, 0.3, 'sine'), 200);
  }
  
  // === Volume Controls ===
  
  setMusicVolume(volume: number): void {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    SaveSystem.getInstance().updateSettings({ musicVolume: this.musicVolume });
  }
  
  setSfxVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    SaveSystem.getInstance().updateSettings({ sfxVolume: this.sfxVolume });
  }
  
  getMusicVolume(): number {
    return this.musicVolume;
  }
  
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  
  // Resume audio context (needed after user interaction)
  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
