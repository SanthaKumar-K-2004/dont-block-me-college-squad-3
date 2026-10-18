import './app.css';
import { mergeAttempts, mergeQuizSnapshots, isValidAttempt } from './attempts.js';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles, Volume2, VolumeX, Share2, Copy, RefreshCw, PlusCircle,
  AlertTriangle, Trash2, Eye, Lock, Unlock, Trophy, Flame, ArrowRight,
  ArrowLeft, Download, Play, Zap, MessageCircle, Sliders, CheckCircle2,
  UserPlus, Hash, Globe, Edit3, X, Timer, Award, BarChart3, Compass,
  Camera, Image as ImageIcon, ShieldCheck, ShieldAlert, Star, Music
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// ============================================================================
// 1. FIREBASE INITIALIZATION (WITH ZERO-HANG INSTANT FALLBACK)
// ============================================================================
let app = null;
let auth = null;
let db = null;
const appId = (typeof __app_id !== 'undefined' && __app_id) || import.meta.env?.VITE_FIREBASE_APP_ID || 'dont-block-me-college-pro';

try {
  const injectedConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : '';
  const envConfig = import.meta.env?.VITE_FIREBASE_CONFIG || '';
  const configText = injectedConfig || envConfig;
  if (configText) {
    const firebaseConfig = typeof configText === 'string' ? JSON.parse(configText) : configText;
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (err) {
  console.warn('Running in instant local hybrid mode:', err);
}

// ============================================================================
// 2. WEB AUDIO API SYNTHESIZER (ARCADE + COMBO STREAK SOUND ENGINE)
// ============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicSource = null;
    this.musicGain = null;
    this.musicStep = 0;
    this.musicGeneration = 0;
  }

  init() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.78;
        this.master.connect(this.ctx.destination);
      } catch (e) {
        this.ctx = null;
        this.master = null;
        return null;
      }
    }
    return this.ctx;
  }

  async unlock() {
    const ctx = this.init();
    if (!ctx) return false;
    try {
      if (ctx.state !== 'running') await ctx.resume();
      return ctx.state === 'running';
    } catch (e) {
      return false;
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, delay = 0, vol = 0.12) {
    if (this.muted) return;
    const ctx = this.init();
    if (!ctx || !this.master) return;
    const play = () => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + Math.max(0, delay);
        const peak = Math.min(Math.max(vol, 0.008), 0.12);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(peak, startTime + Math.min(0.025, duration / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.015);
        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch (e) {}
        };
      } catch (e) {}
    };
    if (ctx.state === 'running') play();
    else this.unlock().then((ready) => { if (ready) play(); });
  }

  async startMusic() {
    if (typeof window === 'undefined' || this.muted) return false;
    this.stopMusic();
    const generation = this.musicGeneration;
    const ready = await this.unlock();
    if (!ready || generation !== this.musicGeneration || this.muted || !this.ctx || !this.master) return false;

    // A looping AudioBuffer keeps the soundtrack scheduled by the audio engine,
    // instead of relying on setInterval (which mobile browsers throttle in background tabs).
    try {
      const ctx = this.ctx;
      const duration = 8;
      const frameCount = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      const beat = 0.5;
      const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46,
        523.25, 659.25, 783.99, 1046.5, 698.46, 587.33, 523.25, 392];
      const chords = [
        [130.81, 164.81, 196.00],
        [110.00, 130.81, 164.81],
        [87.31, 110.00, 130.81],
        [98.00, 123.47, 146.83]
      ];
      for (let i = 0; i < frameCount; i += 1) {
        const time = i / ctx.sampleRate;
        const beatIndex = Math.floor(time / beat);
        const withinBeat = (time % beat) / beat;
        const noteIndex = beatIndex % melody.length;
        const noteAge = (time % beat);
        const envelope = Math.min(1, noteAge / 0.025) * Math.max(0, 1 - withinBeat * 0.85);
        const chord = chords[Math.floor(beatIndex / 4) % chords.length];
        const bass = Math.sin(2 * Math.PI * chord[0] * time) * 0.10;
        const pad = chord.reduce((sum, hz) => sum + Math.sin(2 * Math.PI * hz * time) * 0.035, 0);
        const lead = Math.sin(2 * Math.PI * melody[noteIndex] * time) * envelope * 0.15;
        const sparkle = Math.sin(2 * Math.PI * melody[noteIndex] * 2 * time) * envelope * 0.025;
        samples[i] = bass + pad + lead + sparkle;
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0.38;
      source.connect(gain);
      gain.connect(this.master);
      source.start();
      this.musicSource = source;
      this.musicGain = gain;
      return true;
    } catch (error) {
      console.warn('Background music could not start:', error);
      return false;
    }
  }

  stopMusic() {
    this.musicGeneration += 1;
    if (this.musicTimer && typeof window !== 'undefined') window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch (error) {}
      try { this.musicSource.disconnect(); } catch (error) {}
      this.musicSource = null;
    }
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch (error) {}
      this.musicGain = null;
    }
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.master && this.ctx) {
      try { this.master.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime, 0.02); } catch (e) {}
    }
    if (this.muted) this.stopMusic();
  }

  click() { this.playTone(659.25, 'sine', 0.06, 0, 0.06); }
  swap() {
    this.playTone(440, 'sine', 0.08, 0, 0.055);
    this.playTone(659.25, 'triangle', 0.09, 0.05, 0.06);
    this.playTone(880, 'sine', 0.10, 0.10, 0.05);
  }
  dealbreaker() {
    this.playTone(293.66, 'triangle', 0.10, 0, 0.08);
    this.playTone(392, 'sine', 0.13, 0.07, 0.08);
  }
  correct(streak = 1) {
    const notes = streak >= 3 ? [659.25, 783.99, 987.77] : [523.25, 659.25];
    notes.forEach((note, idx) => this.playTone(note, idx === 1 ? 'triangle' : 'sine', 0.12 + idx * 0.025, idx * 0.06, 0.06));
  }
  wrong() {
    this.playTone(196, 'triangle', 0.13, 0, 0.08);
    this.playTone(146.83, 'sine', 0.17, 0.09, 0.075);
  }
  stampSlam() {
    this.playTone(110, 'triangle', 0.17, 0, 0.09);
    this.playTone(82.41, 'sine', 0.21, 0.05, 0.08);
  }
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => this.playTone(n, idx === 3 ? 'triangle' : 'sine', 0.17, idx * 0.08, 0.065));
  }
  blockedAlarm() {
    [293.66, 220, 261.63, 196].forEach((n, idx) => this.playTone(n, 'triangle', 0.15, idx * 0.12, 0.08));
  }
}
const sfx = new SoundEngine();

// ============================================================================
// 3. COLLEGE BOYS & SQUAD QUESTION BANK (14 RELATABLE QUESTIONS WITH REAL PHOTOS)
// ============================================================================
// Axes for Radar Chart:
// 'cinema' (Cinema & Cartoon), 'food' (Food & Tea Sync), 'college' (College Survival),
// 'squad' (Squad Loyalty), 'vibe' (Vibe & Music Match)
const QUESTION_POOL = [
  {
    id: 'q1',
    axis: 'cinema',
    category: 'Cinema & Hero Vibe 🎬',
    bannerImg: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
    en: "Who is {name}'s all-time favorite Hero / FDFS Cinema Vibe?",
    desi: "{name}-oda ஆல்-டைம் ஃபேவரைட் ஹீரோ & தியேட்டர் வைப் யார்?",
    options: [
      {
        id: 'a',
        tag: 'THALAPATHY VIBE',
        emoji: '🔥',
        en: 'Thalapathy Vijay — mass action, dance and first-day-first-show energy',
        desi: 'தளபதி விஜய் — மாஸ் ஆக்ஷன், டான்ஸ், FDFS கொண்டாட்டம்',
        img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-500 to-red-600'
      },
      {
        id: 'b',
        tag: 'THALA AJITH',
        emoji: '😎',
        en: 'Ajith Kumar — Mankatha swagger, stylish action and bike-racing vibe',
        desi: 'அஜித் குமார் — மங்காத்தா ஸ்வாக், ஸ்டைலிஷ் ஆக்ஷன், பைக் ரேசிங் வைப்',
        img: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-slate-800 to-red-700'
      },
      {
        id: 'c',
        tag: 'SURIYA',
        emoji: '🦁',
        en: 'Suriya — Singam energy, versatile acting and emotional roles',
        desi: 'சூர்யா — சிங்கம் எனர்ஜி, வித்தியாசமான நடிப்பு, எமோஷனல் ரோல்ஸ்',
        img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-purple-700 to-indigo-900'
      },
      {
        id: 'd',
        tag: 'SIVAKARTHIKEYAN',
        emoji: '🎭',
        en: 'Sivakarthikeyan — relatable comedy, family entertainers and feel-good roles',
        desi: 'சிவகார்த்திகேயன் — காமெடி, ஃபேமிலி எண்டர்டெய்னர், ரிலேட்டபிள் வைப்',
        img: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-teal-700'
      }
    ]
  },
  {
    id: 'q2',
    axis: 'cinema',
    category: 'Childhood Cartoon & Anime 📺',
    bannerImg: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=900&q=80',
    en: "Which Childhood Cartoon or Anime can {name} still watch all day?",
    desi: "{name} சின்ன வயசுல இருந்து இப்ப வரைக்கும் விரும்பி பாக்குற கார்ட்டூன் எது?",
    options: [
      {
        id: 'a',
        tag: 'SHINCHAN GANG',
        emoji: '😜',
        en: 'Shinchan (Non-stop Comedy & Trouble Maker)',
        desi: 'ஷின்சான் (சேட்டை & குலுங்க குலுங்க சிரிப்பு)',
        img: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-yellow-400 to-red-500'
      },
      {
        id: 'b',
        tag: 'BEN 10',
        emoji: '🐉',
        en: 'Ben 10 — alien transformations, Omnitrix gadgets and action adventures',
        desi: 'பென் 10 — ஏலியன் டிரான்ஸ்ஃபர்மேஷன், ஓம்னிட்ரிக்ஸ் கேட்ஜெட்ஸ், ஆக்ஷன்',
        img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-green-500 to-emerald-800'
      },
      {
        id: 'c',
        tag: 'DORAEMON',
        emoji: '🔔',
        en: 'Doraemon — futuristic gadgets, Anywhere Door and time-travel fun',
        desi: 'டோரேமான் — எதிர்கால கேட்ஜெட்ஸ், எங்கேயும் கதவு, டைம் டிராவல்',
        img: 'https://images.unsplash.com/photo-1614583225154-5fcdda07019e?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-sky-400 to-blue-700'
      },
      {
        id: 'd',
        tag: 'NARUTO',
        emoji: '🍥',
        en: 'Naruto — ninja battles, determination and unforgettable squad bonds',
        desi: 'நருடோ — நிஞ்ஜா சண்டை, விடாமுயற்சி, மறக்க முடியாத நண்பர்கள்',
        img: 'https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-orange-500 to-rose-700'
      }
    ]
  },
  {
    id: 'q3',
    axis: 'food',
    category: 'Ultimate Food Craving 🍗',
    bannerImg: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80',
    en: "What is {name}'s #1 unbeatable food craving with the gang?",
    desi: "{name}-கிட்ட 'இன்னைக்கு என்ன சாப்பிடலாம்?'னு கேட்டா உடனே சொல்ற உணவு எது?",
    options: [
      {
        id: 'a',
        tag: 'BIRYANI VERIYAN',
        emoji: '🍛',
        en: 'Hot Dum Biryani with Leg Piece & Bread Halwa',
        desi: 'சுடச்சுட தம் பிரியாணி + லெக் பீஸ் & பிரெட் அல்வா',
        img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-600 to-orange-800'
      },
      {
        id: 'b',
        tag: 'SHAWARMA KING',
        emoji: '🌯',
        en: 'Loaded Mexican Plate Shawarma with Extra Mayo',
        desi: 'எக்ஸ்ட்ரா மயோனைஸ் போட்ட பிளேட் ஷவர்மா & கிரில் சிக்கன்',
        img: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-red-500 to-amber-600'
      },
      {
        id: 'c',
        tag: 'PAROTTA SALNA',
        emoji: '🥘',
        en: 'Night Kothu Parotta & Kalakki with Spicy Salna',
        desi: 'நைட் கடை கொத்து பரோட்டா + நல்ல காரமான சால்னா & கலக்கி',
        img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-orange-500 to-yellow-700'
      },
      {
        id: 'd',
        tag: 'HOSTEL MAGGI',
        emoji: '🍜',
        en: '2-AM Masala Maggi / Fried Rice & Burger',
        desi: 'நைட் 2 மணி ஹாஸ்டல் மசாலா மேகி / ஃப்ரைடு ரைஸ்',
        img: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-yellow-500 to-red-500'
      }
    ]
  },
  {
    id: 'q4',
    axis: 'college',
    category: 'College Subject & Exam Reality 📚',
    bannerImg: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80',
    en: "What is {name}'s actual College Subject & Semester Exam reality?",
    desi: "காலேஜ் கிளாஸ் & செமஸ்டர் எக்ஸாம்ல {name} உண்மையிலேயே எந்த ரகம்?",
    options: [
      {
        id: 'a',
        tag: '1-NIGHT BATSMAN',
        emoji: '🌙',
        en: 'Opens book 1-Night before exam & asks Important Qs',
        desi: 'எக்ஸாமுக்கு முந்தின நைட் மட்டும் முக்கிய கேள்வி கேட்டு படிக்கிறது',
        img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-indigo-600 to-slate-900'
      },
      {
        id: 'b',
        tag: 'LAB RECORD XEROX',
        emoji: '📝',
        en: 'Last-minute Lab Record writing & Practical Viva survivor',
        desi: 'கடைசி நேரத்துல லேப் ரெக்கார்டு எழுதி கையெழுத்து வாங்குறது',
        img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-cyan-500 to-blue-700'
      },
      {
        id: 'c',
        tag: '75% ATTENDANCE PRO',
        emoji: '🧮',
        en: 'Calculates exact 75.1% attendance to take leave safely',
        desi: 'கரெக்டா 75% அட்டெண்டன்ஸ் கணக்கு போட்டு லீவ் போடுற மாஸ்டர்',
        img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-green-800'
      },
      {
        id: 'd',
        tag: 'SECRET TOPPER',
        emoji: '🤓',
        en: 'Says "Bro I studied nothing" and scores 8.5+ CGPA',
        desi: '"மச்சான் ஒண்ணுமே படிக்கலடா"னு சொல்லிட்டு பாஸ் ஆகுற ரகசிய டாப்பர்',
        img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-fuchsia-600 to-purple-800'
      }
    ]
  },
  {
    id: 'q5',
    axis: 'college',
    category: 'Classroom Bench Spot 🪑',
    bannerImg: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80',
    en: "Where will you always find {name} during a boring college lecture?",
    desi: "காலேஜ்ல போர் அடிக்கிற கிளாஸ் நடக்கும்போது {name} எங்க இருப்பாங்க?",
    options: [
      {
        id: 'a',
        tag: 'LAST BENCH KING',
        emoji: '😴',
        en: 'Last Bench — Sleeping, mobile gaming & comment passing',
        desi: 'லாஸ்ட் பெஞ்ச் — தூக்கம், போன் கேம் & கமெண்ட் அடிக்கிறது',
        img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-rose-500 to-red-800'
      },
      {
        id: 'b',
        tag: 'WINDOW DAYDREAMER',
        emoji: '🎧',
        en: 'Window Seat — Looking outside & vibing to songs in head',
        desi: 'ஜன்னல் ஓர சீட் — வேடிக்கை பார்த்துட்டு கனவு உலகத்துல மிதக்கிறது',
        img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-sky-500 to-indigo-700'
      },
      {
        id: 'c',
        tag: 'CANTEEN BUNKER',
        emoji: '🏃‍♂️',
        en: 'Not even in class — Bunking at Canteen or Ground!',
        desi: 'கிளாஸ்லயே இருக்க மாட்டாங்க — கேண்டீன்ல பப்ஸ் சாப்பிட்டுட்டு இருப்பாங்க!',
        img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-500 to-orange-700'
      },
      {
        id: 'd',
        tag: 'SAFE MIDDLE BENCH',
        emoji: '✌️',
        en: 'Middle Bench — Acting innocent while using phone under desk',
        desi: 'நடு பெஞ்ச் — நல்ல பிள்ளை மாதிரி உக்காந்து டெஸ்க் அடியில போன் நோண்டுறது',
        img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-teal-500 to-emerald-800'
      }
    ]
  },
  {
    id: 'q6',
    axis: 'food',
    category: 'Tea Kadai & Break Combo ☕',
    bannerImg: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
    en: "At the evening Tea Kadai hangout, what is {name}'s fixed order?",
    desi: "ஈவினிங் டீ கடைக்கு போனா {name}-ஓட நிரந்தர ஆர்டர் என்ன?",
    options: [
      {
        id: 'a',
        tag: 'STRONG INJI TEA',
        emoji: '☕',
        en: 'Strong Ginger Tea + Hot Milagai Bajji / Samosa',
        desi: 'நல்ல ஸ்ட்ராங் இஞ்சி டீ + சுடச்சுட மிளகாய் பஜ்ஜி / சமோசா',
        img: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-700 to-yellow-900'
      },
      {
        id: 'b',
        tag: 'COLD COFFEE / BOOST',
        emoji: '🧋',
        en: 'Cold Coffee / Boost + Bakery Egg/Veg Puff',
        desi: 'கோல்டு காபி / பூஸ்ட் + பேக்கரி முட்டை பப்ஸ்',
        img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-stone-600 to-amber-900'
      },
      {
        id: 'c',
        tag: 'LEMON SODA CHILL',
        emoji: '🍋',
        en: 'Chilled Lemon Soda / Rose Milk / Badam Milk',
        desi: 'ஜில்லுனு லெமன் சோடா / ரோஸ் மில்க் / பாதாம் பால்',
        img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-pink-500 to-rose-700'
      },
      {
        id: 'd',
        tag: 'FREE LOADER MACHAN',
        emoji: '💸',
        en: 'Eats everyone\'s snacks & says "Machan you pay today!"',
        desi: 'மத்தவங்க பஜ்ஜியையும் சேர்த்து சாப்பிட்டுட்டு "மச்சான் நீ காசு குடு"னு சொல்றது',
        img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-lime-500 to-green-700'
      }
    ]
  },
  {
    id: 'q7',
    axis: 'squad',
    category: 'Squad Gaming Night 🎮',
    bannerImg: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
    en: "When the boys hop on for a gaming session, what is {name}'s style?",
    desi: "நண்பர்களோட கேம் ஆடும்போது {name} எந்த மாதிரி பிளேயர்?",
    options: [
      {
        id: 'a',
        tag: 'BGMI / FREE FIRE',
        emoji: '🪂',
        en: 'BGMI / Free Fire — Drops Pochinki, dies first & yells "Revive!"',
        desi: 'BGMI / Free Fire — முதல்லயே நாக்காகிட்டு "மச்சான் ரிவைவ் பண்ணுடா!"னு கத்துறது',
        img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-orange-600 to-red-900'
      },
      {
        id: 'b',
        tag: 'FIFA / CRICKET PRO',
        emoji: '⚽',
        en: 'FIFA / eFootball / Real Cricket 1v1 Champion',
        desi: 'FIFA / eFootball / கிரிக்கெட் கேம்ல யாராலயும் ஜெயிக்க முடியாத ப்ரோ',
        img: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-blue-600 to-indigo-900'
      },
      {
        id: 'c',
        tag: 'GTA V / PC GAMER',
        emoji: '🚗',
        en: 'GTA V / Valorant / Story Mode Open-World Explorer',
        desi: 'GTA V / கார் ரேஸ் கேம்ல ஊரை சுத்தி வம்பு இழுக்கிறது',
        img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-purple-600 to-slate-900'
      },
      {
        id: 'd',
        tag: 'LUDO / MINI MILITIA',
        emoji: '🎲',
        en: 'Ludo King / Mini Militia / 8-Ball Pool Hostel Legend',
        desi: 'லூடோ கிங் / மினி மிலிஷியா போட்டு கிளாஸ்லயே கும்பலா ஆடுறது',
        img: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-teal-800'
      }
    ]
  },
  {
    id: 'q8',
    axis: 'cinema',
    category: 'IPL & Cricket Loyalty 🏏',
    bannerImg: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80',
    en: "During IPL & Cricket season, which side is {name} defending to death?",
    desi: "IPL & கிரிக்கெட் சீசன் வந்தா {name} எந்த டீமுக்கு உயிரைக் கொடுப்பாங்க?",
    options: [
      {
        id: 'a',
        tag: 'CSK • WHISTLE PODU',
        emoji: '🦁',
        en: 'CSK & Thala Dhoni Forever (Yellow Army Whistle Podu!)',
        desi: 'CSK & தல தோனி வெறியன் (எல்லோ ஆர்மி விசில் போடு!)',
        img: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-yellow-400 to-amber-600'
      },
      {
        id: 'b',
        tag: 'RCB • KING KOHLI',
        emoji: '👑',
        en: 'RCB & King Virat Kohli (Ee Sala Cup Namde Loyalty!)',
        desi: 'RCB & விராட் கோலி (கப் முக்கியம் இல்ல, லாயல்டி தான் முக்கியம்!)',
        img: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-red-600 to-neutral-900'
      },
      {
        id: 'c',
        tag: 'MI • HITMAN SQUAD',
        emoji: '💙',
        en: 'Mumbai Indians & Rohit Sharma (Trophy Collectors)',
        desi: 'மும்பை இந்தியன்ஸ் & ரோஹித் சர்மா (சாம்பியன்ஸ் வைப்)',
        img: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-blue-500 to-blue-900'
      },
      {
        id: 'd',
        tag: 'SNACK SPECTATOR',
        emoji: '🍿',
        en: 'Only watches India vs Pakistan or checks score on Google',
        desi: 'இந்தியா - பாகிஸ்தான் மேட்ச் மட்டும் பாக்குறது (இல்லன்னா கூகுள் ஸ்கோர்)',
        img: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-teal-500 to-slate-800'
      }
    ]
  },
  {
    id: 'q9',
    axis: 'vibe',
    category: 'Music Director & Earphone Vibe 🎧',
    bannerImg: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
    en: "When {name} plugs in earphones on the college bus, whose playlist is playing?",
    desi: "பஸ்ல போகும்போது {name} ஹெட்செட் மாட்டுனா யார் பாட்டு ஓடும்?",
    options: [
      {
        id: 'a',
        tag: 'U1 DRUGS • YUVAN',
        emoji: '🌙',
        en: 'Yuvan Shankar Raja (Late Night Feeling & BGM King)',
        desi: 'யுவன் சங்கர் ராஜா (U1 மியூசிக் & நைட் ஃபீலிங் பாட்டு)',
        img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-purple-600 to-indigo-950'
      },
      {
        id: 'b',
        tag: 'ROCKSTAR ANIRUDH',
        emoji: '⚡',
        en: 'Anirudh Ravichander (Hukum Mass Kuthu & High Energy)',
        desi: 'அனிருத் (ஹukum மாஸ் BGM & குத்து பாட்டு வைப்)',
        img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-rose-500 to-orange-600'
      },
      {
        id: 'c',
        tag: 'ISAIPUYAL ARR',
        emoji: '🎹',
        en: 'A.R. Rahman (90s/2000s Evergreen Magical Melodies)',
        desi: 'ஏ.ஆர். ரஹ்மான் (எவர்கிரீன் மெலோடி & மேஜிக் வைப்)',
        img: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-cyan-500 to-blue-800'
      },
      {
        id: 'd',
        tag: 'HARRIS / RAJA VIBE',
        emoji: '🎶',
        en: 'Harris Jayaraj / Ilaiyaraaja / English Pop Mix',
        desi: 'ஹாரிஸ் ஜெயராஜ் கானா / இளையராஜா கிளாசிக் பாட்டு',
        img: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-teal-800'
      }
    ]
  },
  {
    id: 'q10',
    axis: 'squad',
    category: 'Weekend Bike & Outing Plan 🏍️',
    bannerImg: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80',
    en: "When Sunday arrives, what is {name}'s ultimate weekend move?",
    desi: "ஞாயிற்றுக்கிழமை லீவு விட்டா {name}-ஓட மெயின் பிளான் என்ன?",
    options: [
      {
        id: 'a',
        tag: 'BIKE HIGHWAY RIDE',
        emoji: '🏍️',
        en: 'Morning Bike Ride (RE / Duke / R15) to Hills or Highway',
        desi: 'பைக் எடுத்துட்டு (RE / R15 / MT15) நண்பர்களோட லாங் ரைடு போறது',
        img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-orange-500 to-stone-900'
      },
      {
        id: 'b',
        tag: 'TRIPLES NIGHT TEA',
        emoji: '🛵',
        en: 'Triples on Scooty/Bike at 11 PM for Tea & Turf Cricket',
        desi: 'ஒரே வண்டியில 3 பேரு ஏறி டீ கடை & டர்ப் கிரிக்கெட் போறது',
        img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-blue-500 to-indigo-800'
      },
      {
        id: 'c',
        tag: 'SLEEP TILL 2 PM',
        emoji: '🛌',
        en: 'Switches off alarm & sleeps like a log until 2:00 PM',
        desi: 'மதியம் 2 மணி வரைக்கும் கும்பகர்ணன் மாதிரி தூங்கி எந்திரிக்கிறது',
        img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-indigo-500 to-purple-800'
      },
      {
        id: 'd',
        tag: 'MALL & MOVIE GANG',
        emoji: '🍿',
        en: 'Theatre Movie + Mall Window Shopping with the Squad',
        desi: 'தியேட்டர்ல படம் பார்த்துட்டு மால்ல சும்மா சுத்திட்டு வர்றது',
        img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-rose-500 to-amber-600'
      }
    ]
  },
  {
    id: 'q11',
    axis: 'college',
    category: 'Exam Hall Survival Move ✍️',
    bannerImg: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
    en: "Inside the Semester Exam Hall, what is {name}'s secret weapon?",
    desi: "எக்ஸாம் ஹாலுக்குள்ள போனதும் {name} யூஸ் பண்ற டெக்னிக் என்ன?",
    options: [
      {
        id: 'a',
        tag: '35-PAGE STORY WRITER',
        emoji: '📄',
        en: 'Fills 35 pages with neat headings, big diagrams & own stories',
        desi: 'கதை கதையா எழுதி, கட்டம் கட்டி 35 பக்கம் பேப்பரை நிரப்புறது',
        img: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-500 to-red-700'
      },
      {
        id: 'b',
        tag: 'MCQ EYE SIGNAL PRO',
        emoji: '👀',
        en: 'Telepathic eye-contact & pen-tap signals for 1-mark MCQs',
        desi: 'ஒன் மார்க் கேள்விக்கு கண் ஜாடை & விரல் சிக்னல் காட்டுற எக்ஸ்பெர்ட்',
        img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-cyan-500 to-blue-800'
      },
      {
        id: 'c',
        tag: 'HEAD DOWN NAPPER',
        emoji: '😴',
        en: 'Writes for 45 mins, puts head down & sleeps till bell rings',
        desi: 'அரை மணி நேரத்துல தெரிஞ்சதை எழுதிட்டு பெஞ்ச்ல தலை சாய்த்து தூங்குறது',
        img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-purple-500 to-slate-800'
      },
      {
        id: 'd',
        tag: 'ADDITIONAL SHEET KING',
        emoji: '🔥',
        en: 'Asks for Additional Sheet & scares the entire classroom',
        desi: '"மேடம் அடிஷனல் ஷீட்!"னு கேட்டு கிளாஸையே பீதியாக்குறது',
        img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-green-900'
      }
    ]
  },
  {
    id: 'q12',
    axis: 'squad',
    category: 'GPay & Pocket Money Status 💸',
    bannerImg: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
    en: "What is {name}'s actual GPay & Bank Balance situation by the 15th of the month?",
    desi: "மாசம் பாதி தாண்டுனாலே {name}-ஓட GPay பேலன்ஸ் நிலைமை என்ன?",
    options: [
      {
        id: 'a',
        tag: '₹14.50 IN ACCOUNT',
        emoji: '🪙',
        en: 'Always Broke — Living on ₹18.50 bank balance & prayers',
        desi: 'அக்கவுண்ட்ல ₹14.50 வச்சிட்டு மாசத்தை ஓட்டுற வித்தைக்காரர்',
        img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-red-500 to-rose-800'
      },
      {
        id: 'b',
        tag: 'SEND ₹100 URGENT',
        emoji: '📲',
        en: 'Calls friend: "Machan send ₹100 on GPay, I\'ll give cash!"',
        desi: '"மச்சான் அர்ஜென்ட்டா ஒரு ₹100 GPay போடுடா"னு கால் பண்றது',
        img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-500 to-orange-700'
      },
      {
        id: 'c',
        tag: 'SECRET VIP SPONSOR',
        emoji: '🏦',
        en: 'Acts broke in front of friends, secretly rich gang sponsor',
        desi: '"காசே இல்லடா"னு சொல்லிட்டு எல்லா செலவுக்கும் ஸ்பான்சர் பண்ற VIP',
        img: 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-teal-800'
      },
      {
        id: 'd',
        tag: 'PETROL & FOOD ONLY',
        emoji: '⛽',
        en: '100% of pocket money goes directly to Bike Petrol & Food',
        desi: 'வர்ற பாக்கெட் மணியை வண்டி பெட்ரோலுக்கும் சாப்பாட்டுக்குமே அழிக்கிறது',
        img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-blue-500 to-indigo-800'
      }
    ]
  },
  {
    id: 'q13',
    axis: 'vibe',
    category: 'WhatsApp & Insta Group Habit 📱',
    bannerImg: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=900&q=80',
    en: "What is {name}'s signature move in the Squad WhatsApp / Instagram Group?",
    desi: "நண்பர்கள் வாட்ஸ்அப் / இன்ஸ்டா குரூப்ல {name}-ஓட மெயின் வேலை என்ன?",
    options: [
      {
        id: 'a',
        tag: 'REELS SPAMMER',
        emoji: '🎬',
        en: 'Ignores normal texts, sends 35 Instagram Reels at 1 AM',
        desi: 'நார்மல் மெசேஜுக்கு ரிப்ளை பண்ணாம நைட் 30 ரீல்ஸ் அனுப்புறது',
        img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-pink-500 to-purple-800'
      },
      {
        id: 'b',
        tag: 'STICKER ROASTER',
        emoji: '🤡',
        en: 'Has an embarrassing sticker of every friend ready to drop',
        desi: 'குரூப்ல இருக்க எல்லாரோட காமெடி போட்டோவையும் ஸ்டிக்கரா வச்சிருக்கிறது',
        img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-yellow-400 to-orange-600'
      },
      {
        id: 'c',
        tag: 'SILENT CCTV',
        emoji: '🕵️',
        en: 'Silent CCTV — Reads 500 messages, never types a single word',
        desi: 'சைலண்ட் CCTV — எல்லா மெசேஜையும் படிச்சிட்டு மூச்சு கூட விடாம இருக்கிறது',
        img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-slate-600 to-neutral-900'
      },
      {
        id: 'd',
        tag: 'GOA PLANNER',
        emoji: '🏝️',
        en: 'Starts a "Goa / Kodaikanal Trip Plan" that never happens',
        desi: 'நடக்கவே நடக்காத கொடைக்கானல் / கோவா டூர் பிளானை ஆரம்பிச்சு வைக்கிறது',
        img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-cyan-400 to-blue-700'
      }
    ]
  },
  {
    id: 'q14',
    axis: 'vibe',
    category: 'Relationship & Crush Status 💘',
    bannerImg: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80',
    en: "What is {name}'s actual Love & Relationship status in college?",
    desi: "காதல் & க்ரஷ் விஷயத்துல {name}-ஓட உண்மையான ஸ்டேட்டஸ் என்ன?",
    options: [
      {
        id: 'a',
        tag: 'MORATTU SINGLE',
        emoji: '🦁',
        en: 'Certified Morattu Single — Gives love advice to committed friends',
        desi: 'பிறவியிலேயே முரட்டு சிங்கிள் — ஆனா கமிட்டட் நண்பர்களுக்கு அட்வைஸ் பண்ணுவாங்க',
        img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-amber-500 to-red-700'
      },
      {
        id: 'b',
        tag: 'OTHER DEPT CRUSH',
        emoji: '👀',
        en: 'Has a secret 1-side crush in another department / bus route',
        desi: 'பக்கத்து டிபார்ட்மென்ட்ல சீக்ரெட் க்ரஷ் வச்சிட்டு சும்மா நடக்குறது',
        img: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-pink-500 to-rose-700'
      },
      {
        id: 'c',
        tag: 'BUSY ON CALL',
        emoji: '📞',
        en: 'Secretly Committed — Always walks away saying "Amma calling"',
        desi: '"அம்மா கால் பண்றாங்க மச்சான்"னு சொல்லிட்டு தனியா போய் கடலை போடுறது',
        img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-purple-500 to-indigo-800'
      },
      {
        id: 'd',
        tag: 'CAREER FOCUS LIE',
        emoji: '💼',
        en: 'Says "No love bro, only focusing on Career" (Biggest Lie)',
        desi: '"எனக்கு இதெல்லாம் செட் ஆகாது மச்சான், ஒன்லி கேரியர் ஃபோகஸ்!" (உலக மகா உருட்டு)',
        img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
        gradient: 'from-emerald-500 to-teal-800'
      }
    ]
  }
];

// ============================================================================
// 4. REAL VISUAL AVATAR PORTRAITS (WITH ONLINE PHOTO + FALLBACK)
// ============================================================================
const AVATAR_BADGES = [
  {
    id: 'av1',
    emoji: '😎',
    bg: '#B8FF01',
    label: 'Mass Rebel',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av2',
    emoji: '🏍️',
    bg: '#FF3366',
    label: 'Biker Boy',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av3',
    emoji: '👑',
    bg: '#FFB800',
    label: 'Last Bench King',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av4',
    emoji: '🎧',
    bg: '#00E5FF',
    label: 'U1 / Ani Vibe',
    img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av5',
    emoji: '🎮',
    bg: '#A855F7',
    label: 'Squad Gamer',
    img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av6',
    emoji: '✨',
    bg: '#FF90E8',
    label: 'College Queen',
    img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av7',
    emoji: '🏏',
    bg: '#A3E635',
    label: 'Turf Captain',
    img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av8',
    emoji: '🔥',
    bg: '#FB923C',
    label: 'Hostel Legend',
    img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80'
  }
];

const QUIZ_THEMES = [
  {
    id: 'block',
    icon: '🚫',
    color: '#FF3366',
    enTitle: 'College Squad Block Test',
    desiTitle: 'மச்சான் Block List டெஸ்ட் 🚫',
    enDesc: 'Score the pass mark or get blocked from the gang!',
    desiDesc: 'பாஸ் மார்க் எடு, இல்லன்னா நேரா வாட்ஸ்அப் Block List தான்!'
  },
  {
    id: 'bestie',
    icon: '🤞',
    color: '#B8FF01',
    enTitle: 'Chuddy Buddy vs Fake Snake',
    desiTitle: 'உயிர் நண்பனா? பச்சோந்தியா? 🐍',
    enDesc: 'Find out who really knows your favorite actor, food & bench!',
    desiDesc: 'என் ஃபேவரைட் ஹீரோ, பிரியாணி, பெஞ்ச் யாருக்கு கரெக்டா தெரியும்?'
  },
  {
    id: 'squad',
    icon: '🏍️',
    color: '#00E5FF',
    enTitle: 'Last Bench & Hostel Audit',
    desiTitle: 'லாஸ்ட் பெஞ்ச் & டீ கடை தகுதி தேர்வு ☕',
    enDesc: 'Do you deserve a seat at our Tea Kadai table?',
    desiDesc: 'நம்ம டீ கடை கேங்ல இருக்க தகுதி இருக்கானு செக் பண்ணு!'
  }
];

const RELATIONSHIP_TAGS = [
  { id: 'bestie', emoji: '🤞', en: 'Chuddy Buddy / Day-1', desi: 'உயிர் நண்பன் / Chuddy Buddy' },
  { id: 'squad', emoji: '🪑', en: 'Last Bench Machan', desi: 'காலேஜ் பெஞ்ச்மேட் மச்சான்' },
  { id: 'hostel', emoji: '🍜', en: 'Hostel / Roommate', desi: 'ஹாஸ்டல் / ரூம்மேட் பங்காளி' },
  { id: 'crush', emoji: '👀', en: 'Secret Crush / Dept', desi: 'சீக்ரெட் க்ரஷ் 👀' },
  { id: 'vibes', emoji: '🏍️', en: 'Tea Kadai & Turf Partner', desi: 'டீ கடை & கிரிக்கெட் தோஸ்து' }
];

const RADAR_AXES = [
  { key: 'cinema', labelEn: 'Cinema & Anime', labelDesi: 'சினிமா & கார்ட்டூன்', emoji: '🎬' },
  { key: 'food', labelEn: 'Food & Tea Sync', labelDesi: 'பிரியாணி & டீ', emoji: '🍗' },
  { key: 'college', labelEn: 'College Survival', labelDesi: 'காலேஜ் & எக்ஸாம்', emoji: '📚' },
  { key: 'squad', labelEn: 'Squad Loyalty', labelDesi: 'மச்சான் பாசம்', emoji: '🏍️' },
  { key: 'vibe', labelEn: 'Music & Vibe', labelDesi: 'மியூசிக் & வைப்', emoji: '🎧' }
];

// ============================================================================
// 5. CLEAN STARTER QUIZ (NO FAKE USERS OR SEEDED SCORES)
// ============================================================================
const INITIAL_DEMO_QUIZ = {
  id: 'START01',
  creatorName: 'Your Squad',
  pronoun: 'm',
  avatar: 'av1',
  customAvatarUrl: '',
  themeId: 'block',
  passScore: 7,
  pin: '',
  createdAt: Date.now(),
  questions: QUESTION_POOL.slice(0, 10).map((q) => ({
    ...q,
    correctOptionId: null,
    isDealbreaker: false
  })),
  attempts: []
};

// ============================================================================
// 6. HELPER FUNCTIONS (PRONOUNS, RADAR CALCULATOR, CLIPBOARD)
// ============================================================================
function formatQuestionText(template, creatorName, pronoun) {
  if (!template) return '';
  const name = creatorName || 'Your Friend';
  const map = {
    m: { he: 'he', him: 'him', his: 'his' },
    f: { he: 'she', him: 'her', his: 'her' },
    t: { he: 'they', him: 'them', his: 'their' }
  }[pronoun || 'm'];

  return template
    .replace(/\{name\}/g, name)
    .replace(/\{he\}/g, map.he)
    .replace(/\{him\}/g, map.him)
    .replace(/\{his\}/g, map.his);
}

async function copyTextBulletproof(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fallback below
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch (err) {
    return false;
  }
}

function computeRadarMetrics(questions, answersMap) {
  const buckets = {
    cinema: { right: 0, total: 0 },
    food: { right: 0, total: 0 },
    college: { right: 0, total: 0 },
    squad: { right: 0, total: 0 },
    vibe: { right: 0, total: 0 }
  };

  (questions || []).forEach((q, idx) => {
    const axisKey = q.axis || RADAR_AXES[idx % RADAR_AXES.length].key;
    if (!buckets[axisKey]) buckets[axisKey] = { right: 0, total: 0 };
    buckets[axisKey].total += 1;
    if (answersMap && answersMap[q.id] === q.correctOptionId) {
      buckets[axisKey].right += 1;
    }
  });

  return RADAR_AXES.map((ax) => {
    const b = buckets[ax.key];
    const pct = b && b.total > 0 ? Math.round((b.right / b.total) * 100) : 70;
    return {
      ...ax,
      pct
    };
  });
}

// ============================================================================
// 7. SMART REAL ONLINE IMAGE COMPONENT + 3D TILT TRADING CARD
// ============================================================================
// Free, openly licensed photos are discovered from Wikimedia Commons at runtime.
// Search results include the file page and license metadata so credits remain visible.
const commonsPhotoCache = new Map();
// Avoid assigning the same Commons file to multiple answer cards in one session.
const claimedCommonsPhotoUrls = new Map();
const COMMONS_STORAGE_KEY = 'college-squad-commons-photos-v2';
const COMMONS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const COMMONS_FETCH_TIMEOUT = 4500;
const COMMONS_IMAGE_TIMEOUT = 3200;

const plainCommonsText = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const readCommonsStorage = (key) => {
  try {
    const cache = JSON.parse(window.localStorage.getItem(COMMONS_STORAGE_KEY) || '{}');
    const entry = cache[key];
    if (entry?.expiresAt > Date.now() && entry.photo?.url && entry.photo?.pageUrl) return entry.photo;
  } catch (error) {}
  return null;
};

const writeCommonsStorage = (key, photo) => {
  try {
    const cache = JSON.parse(window.localStorage.getItem(COMMONS_STORAGE_KEY) || '{}');
    cache[key] = { photo, expiresAt: Date.now() + COMMONS_CACHE_TTL };
    const entries = Object.entries(cache)
      .filter(([, entry]) => entry?.expiresAt > Date.now())
      .sort((a, b) => (b[1]?.expiresAt || 0) - (a[1]?.expiresAt || 0))
      .slice(0, 80);
    window.localStorage.setItem(COMMONS_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    // Storage can be unavailable in private browsing or when quota is exhausted.
  }
};

const preloadCommonsImage = (url) => new Promise((resolve) => {
  if (typeof window === 'undefined' || typeof window.Image !== 'function') {
    resolve(false);
    return;
  }
  let settled = false;
  const image = new window.Image();
  const finish = (success) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    resolve(success);
  };
  const timer = window.setTimeout(() => finish(false), COMMONS_IMAGE_TIMEOUT);
  image.onload = () => finish(true);
  image.onerror = () => finish(false);
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.src = url;
  if (typeof image.decode === 'function') image.decode().then(() => finish(true)).catch(() => {});
});

const fetchCommonsPhoto = (query) => {
  const rawQuery = String(query || '').trim().slice(0, 180);
  if (!rawQuery || typeof window === 'undefined') return Promise.resolve(null);
  const cacheKey = rawQuery.toLowerCase();
  if (commonsPhotoCache.has(cacheKey)) return commonsPhotoCache.get(cacheKey);

  const storedPhoto = readCommonsStorage(cacheKey);
  if (storedPhoto && (!claimedCommonsPhotoUrls.has(storedPhoto.url) || claimedCommonsPhotoUrls.get(storedPhoto.url) === cacheKey)) {
    claimedCommonsPhotoUrls.set(storedPhoto.url, cacheKey);
    const cachedRequest = preloadCommonsImage(storedPhoto.url).then((loaded) => {
      if (!loaded && claimedCommonsPhotoUrls.get(storedPhoto.url) === cacheKey) claimedCommonsPhotoUrls.delete(storedPhoto.url);
      return loaded ? storedPhoto : null;
    });
    commonsPhotoCache.set(cacheKey, cachedRequest);
    return cachedRequest;
  }

  // Keep option-specific words first; vague question words often produce repeated photos.
  const stopWords = new Set(['what','who','which','where','when','why','how','does','did','can','will','would','your','you','the','and','for','with','from','into','about','this','that','their','they','still','always','actual','favorite','favourite','during','college','question','option','name','vibe','status','best','energy','style','relatable','unforgettable','fixed','ultimate','real','all','day']);
  const terms = rawQuery.toLowerCase().replace(/[^a-z0-9\\s-]/g, ' ').split(/\\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
  const cleanQuery = [...new Set(terms)].slice(0, 5).join(' ') || rawQuery.split(/\\s+/).slice(0, 4).join(' ');
  const queryTerms = [...new Set(terms)].filter((word) => word.length > 2);
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: cleanQuery,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '640',
    format: 'json',
    origin: '*',
    smaxage: '86400',
    maxage: '86400'
  });

  const request = (async () => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), COMMONS_FETCH_TIMEOUT) : null;
    try {
      const response = await fetch('https://commons.wikimedia.org/w/api.php?' + params.toString(), {
        signal: controller?.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Commons image search unavailable');
      const data = await response.json();
      const pages = Object.values(data?.query?.pages || {});
      // Rank candidates against the option's own topic, and exclude photos already used
      // by another option so neighbouring cards cannot all show the same search result.
      const rankedPages = pages.map((page) => {
        const info = page.imageinfo?.[0];
        const title = String(page.title || '').replace(/^File:/i, '').toLowerCase().replace(/\\.[a-z0-9]{2,5}$/i, '').replace(/[^a-z0-9]+/g, ' ');
        const metadata = info?.extmetadata || {};
        const description = plainCommonsText(metadata.ImageDescription?.value || '').toLowerCase();
        const searchable = title + ' ' + description;
        const matches = queryTerms.filter((word) => searchable.includes(word));
        const specificity = matches.reduce((score, word) => score + (word.length >= 5 ? 2 : 1), 0);
        return { page, info, title, specificity, matchCount: matches.length };
      }).sort((a, b) => b.specificity - a.specificity || b.matchCount - a.matchCount);
      const candidate = rankedPages.find(({ info, title, specificity }) => {
        const mime = String(info?.mime || '');
        const metadata = info?.extmetadata || {};
        const hasLicense = Boolean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
        const url = info?.thumburl || info?.url;
        return Boolean(url) &&
          !claimedCommonsPhotoUrls.has(url) &&
          /^image\\/(jpeg|png|webp|gif)$/i.test(mime) &&
          Number(info.width || 0) >= 320 &&
          hasLicense &&
          specificity >= 2 &&
          !/\\b(logo|icon|favicon|watermark|poster template|collage)\\b/i.test(title);
      });
      if (!candidate) return null;
      const usable = candidate.page;
      const info = candidate.info;
      const selectedUrl = info.thumburl || info.url;
      claimedCommonsPhotoUrls.set(selectedUrl, cacheKey);
      const meta = info.extmetadata || {};
      const photo = {
        url: selectedUrl,
        pageUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(usable.title || '').replace(/%3A/gi, ':').replace(/%20/g, '_'),
        title: String(usable.title || '').replace(/^File:/, ''),
        artist: plainCommonsText(meta.Artist?.value || ''),
        license: plainCommonsText(meta.LicenseShortName?.value || meta.UsageTerms?.value || 'License details'),
        licenseUrl: meta.LicenseUrl?.value || ''
      };
      // Do not swap the visible fallback for a remote URL until that image is actually loadable.
      const loaded = await preloadCommonsImage(photo.url);
      if (!loaded) { if (claimedCommonsPhotoUrls.get(selectedUrl) === cacheKey) claimedCommonsPhotoUrls.delete(selectedUrl); return null; }
      writeCommonsStorage(cacheKey, photo);
      return photo;
    } catch (error) {
      if (error?.name !== 'AbortError') console.info('Open image search skipped:', error?.message || error);
      return null;
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  })();
  commonsPhotoCache.set(cacheKey, request);
  return request;
};

const useCommonsPhoto = (query) => {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let active = true;
    setPhoto(null);
    fetchCommonsPhoto(query).then((result) => {
      if (active && result?.url) setPhoto(result);
    });
    return () => { active = false; };
  }, [query]);
  return photo;
};

const PhotoCredit = ({ photo, compact = false }) => {
  if (!photo?.pageUrl) return null;
  const credit = [photo.artist, photo.license].filter(Boolean).join(' · ');
  return (
    <a
      href={photo.pageUrl}
      target="_blank"
      rel="noreferrer"
      title={credit ? `Photo credit: ${credit}` : `Photo source: Wikimedia Commons`}
      aria-label={credit ? `Photo credit: ${credit}` : 'Open photo source'}
      onClick={(event) => event.stopPropagation()}
      className={`absolute z-20 left-2 bottom-2 max-w-[76%] truncate rounded-md bg-black/75 text-white border border-white/30 px-1.5 py-1 text-[9px] leading-tight ${compact ? '' : 'sm:text-[10px]'}`}
    >
      {photo.artist ? `© ${photo.artist} · ${photo.license}` : `Wikimedia Commons · ${photo.license}`}
    </a>
  );
};

const OnlineQuestionBanner = ({ src, query, alt, className = 'w-full h-full object-cover opacity-65' }) => {
  const photo = useCommonsPhoto(query);
  const [failedUrl, setFailedUrl] = useState('');
  useEffect(() => setFailedUrl(''), [photo?.url, src]);
  const safeFallback = typeof src === 'string' && /^https:\/\//i.test(src.trim()) ? src.trim() : '';
  const imageSrc = photo?.url && photo.url !== failedUrl ? photo.url : safeFallback;
  return (
    <>
      {imageSrc && (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={alt || 'Question photo'}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            if (photo?.url && imageSrc === photo.url && safeFallback) setFailedUrl(imageSrc);
            else event.currentTarget.style.opacity = '0';
          }}
          className={className}
        />
      )}
      <PhotoCredit photo={photo} compact />
    </>
  );
};

const SmartCardImage = ({ src, query, alt, emoji = '✨', tag, gradient = 'from-rose-500 to-amber-500', className = 'h-36' }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(!src);
  const [failedOnlineUrl, setFailedOnlineUrl] = useState('');
  const photo = useCommonsPhoto(query);
  const safeSrc = typeof src === 'string' && /^https:\/\//i.test(src.trim()) ? src.trim() : '';
  const displaySrc = photo?.url && photo.url !== failedOnlineUrl ? photo.url : safeSrc;

  useEffect(() => {
    setLoaded(false);
    setErrored(!displaySrc);
  }, [displaySrc]);

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-neutral-900 border-b-[3px] border-[#111] select-none`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {(!loaded || errored || !displaySrc) && (
          <div className={`w-full h-full flex flex-col items-center justify-center p-3 text-white text-center ${!errored && displaySrc ? 'animate-pulse bg-white/10' : ''}`}>
            <span className="text-4xl drop-shadow">{emoji}</span>
            {errored && tag && <span className="mt-2 text-[10px] font-black uppercase tracking-wider bg-black/40 px-2 py-1 rounded">{tag}</span>}
          </div>
        )}
      </div>
      {displaySrc && (
        <img
          key={displaySrc}
          src={displaySrc}
          alt={alt || tag || 'Card visual'}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => { setLoaded(true); setErrored(false); }}
          onError={() => {
            setLoaded(false);
            if (photo?.url && displaySrc === photo.url && safeSrc) {
              setFailedOnlineUrl(displaySrc);
              setErrored(false);
            } else {
              setErrored(true);
            }
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
      {tag && <div className="absolute top-2.5 left-2.5 z-10 max-w-[80%] truncate px-2.5 py-0.5 rounded-md bg-[#111]/90 text-[#B8FF01] border border-white/30 font-black text-[10px] tracking-wider uppercase shadow">{tag}</div>}
      <div className="absolute bottom-2 right-2.5 z-10 w-9 h-9 rounded-xl bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center text-lg">{emoji}</div>
      <PhotoCredit photo={photo} />
    </div>
  );
};

const TiltTradingCard = ({
  opt,
  lang,
  creatorName,
  pronoun,
  isSelected,
  badgeStatus, // null | 'correct' | 'wrong'
  onSelect
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    const rotateY = (xPct - 0.5) * 14;
    const rotateX = (0.5 - yPct) * 14;
    setTilt({
      x: rotateX,
      y: rotateY,
      glareX: xPct * 100,
      glareY: yPct * 100,
      active: true
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });
  };

  let frameBg = 'bg-white hover:bg-[#FFFDF5]';
  if (badgeStatus === 'correct') {
    frameBg = 'bg-[#B8FF01] ring-4 ring-[#111]';
  } else if (badgeStatus === 'wrong') {
    frameBg = 'bg-[#FF3366] text-white';
  } else if (isSelected) {
    frameBg = 'bg-[#B8FF01]';
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(opt.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: tilt.active
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px)`
          : isSelected
          ? 'translateY(-4px)'
          : 'none',
        transition: tilt.active ? 'transform 60ms ease-out' : 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
      className={`group relative w-full rounded-2xl border-[3px] border-[#111] overflow-hidden text-left flex flex-col justify-between ${frameBg} ${
        isSelected
          ? 'shadow-[6px_6px_0px_#111]'
          : 'shadow-[4px_4px_0px_#111] hover:shadow-[6px_6px_0px_#111]'
      }`}
    >
      {/* Interactive Holographic Glare Overlay */}
      {tilt.active && (
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-25"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.9), transparent 60%)`
          }}
        />
      )}

      {/* Real Online Photography Header */}
      <SmartCardImage
        src={opt.img}
        query={opt.imageQuery || `${opt.tag} ${opt.en}`}
        alt={opt.en}
        emoji={opt.emoji}
        tag={opt.tag}
        gradient={opt.gradient}
        className="h-36 sm:h-40"
      />

      {/* Option Caption Body */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-2 flex-1">
        <p className="font-extrabold text-sm sm:text-base leading-snug">
          {formatQuestionText(lang === 'en' ? opt.en : opt.desi, creatorName, pronoun)}
        </p>

        {isSelected && !badgeStatus && (
          <div className="w-7 h-7 rounded-full bg-[#111] text-[#B8FF01] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}
        {badgeStatus === 'correct' && (
          <span className="px-2 py-1 rounded-lg bg-[#111] text-[#B8FF01] font-black text-xs shrink-0">
            MASS! +100
          </span>
        )}
        {badgeStatus === 'wrong' && (
          <span className="px-2 py-1 rounded-lg bg-black text-white font-black text-xs shrink-0">
            MISS 💀
          </span>
        )}
      </div>
    </button>
  );
};

// ============================================================================
// 8. MOTION GRAPHICS COMPONENTS: 5-AXIS SVG RADAR & SPEEDOMETER GAUGE
// ============================================================================
const FriendshipRadarChart = ({ metrics, lang }) => {
  const [animScale, setAnimScale] = useState(0.1);

  useEffect(() => {
    const t = setTimeout(() => setAnimScale(1), 80);
    return () => clearTimeout(t);
  }, [metrics]);

  const size = 290;
  const center = size / 2;
  const radius = 92;

  const getPoint = (idx, pctVal) => {
    const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
    const r = (pctVal / 100) * radius * animScale;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const polygonPoints = metrics
    .map((m, idx) => {
      const pt = getPoint(idx, Math.max(m.pct, 15));
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Concentric Pentagon Webs */}
        {[25, 50, 75, 100].map((lvl) => {
          const pts = [0, 1, 2, 3, 4]
            .map((i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              const r = (lvl / 100) * radius;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            })
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill={lvl === 100 ? '#FFFDF5' : 'none'}
              stroke="#111111"
              strokeWidth={lvl === 100 ? '2.5' : '1'}
              strokeDasharray={lvl === 100 ? 'none' : '3 3'}
              opacity={lvl === 100 ? 1 : 0.4}
            />
          );
        })}

        {/* Axis Spokes */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="#111"
              strokeWidth="1.5"
              opacity="0.35"
            />
          );
        })}

        {/* Animated Data Polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(184, 255, 1, 0.55)"
          stroke="#FF3366"
          strokeWidth="3.5"
          style={{ transition: 'all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Vertex Nodes & Axis Labels */}
        {metrics.map((m, idx) => {
          const pt = getPoint(idx, Math.max(m.pct, 15));
          const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
          const labelR = radius + 34;
          const lx = center + labelR * Math.cos(angle);
          const ly = center + labelR * Math.sin(angle);

          return (
            <g key={m.key}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill="#FF3366"
                stroke="#111"
                strokeWidth="2.5"
                style={{ transition: 'all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
              <text
                x={lx}
                y={ly - 4}
                textAnchor="middle"
                className="font-black text-[10px] fill-[#111]"
              >
                {m.emoji} {lang === 'en' ? m.labelEn : m.labelDesi}
              </text>
              <text
                x={lx}
                y={ly + 10}
                textAnchor="middle"
                className="font-black text-[11px] fill-[#FF3366]"
              >
                {m.pct}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const FriendshipSpeedometer = ({ scorePct, isSafe, lang }) => {
  const [needlePct, setNeedlePct] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setNeedlePct(scorePct), 120);
    return () => clearTimeout(t);
  }, [scorePct]);

  // Needle angle: -90deg (0%) to +90deg (100%)
  const deg = -90 + (needlePct / 100) * 180;

  let tierLabel =
    scorePct >= 80
      ? lang === 'en'
        ? '🔥 CHUDDY BUDDY / MACHAN FOR LIFE!'
        : '🔥 உயிர் நண்பன் / பங்காளி!'
      : scorePct >= 50
      ? lang === 'en'
        ? '☕ TEA KADAI ACQUAINTANCE'
        : '☕ டீ கடை ஃப்ரெண்ட்'
      : lang === 'en'
      ? '🚫 FAKE SNAKE — INSTANT BLOCK!'
      : '🚫 பச்சோந்தி — உடனே BLOCK!';

  return (
    <div className="flex flex-col items-center">
      <svg width="260" height="155" viewBox="0 0 260 155" className="overflow-visible">
        {/* Red Block Zone Arc */}
        <path
          d="M 25 130 A 105 105 0 0 1 85 35"
          fill="none"
          stroke="#FF3366"
          strokeWidth="22"
          strokeLinecap="butt"
        />
        {/* Yellow Tea Kadai Zone Arc */}
        <path
          d="M 87 34 A 105 105 0 0 1 173 34"
          fill="none"
          stroke="#FFB800"
          strokeWidth="22"
          strokeLinecap="butt"
        />
        {/* Neon Lime Bestie Zone Arc */}
        <path
          d="M 175 35 A 105 105 0 0 1 235 130"
          fill="none"
          stroke="#B8FF01"
          strokeWidth="22"
          strokeLinecap="butt"
        />

        {/* Outer Bold Stroke */}
        <path
          d="M 25 130 A 105 105 0 0 1 235 130"
          fill="none"
          stroke="#111"
          strokeWidth="4"
        />

        {/* Labels */}
        <text x="18" y="148" className="text-[10px] font-black fill-[#FF3366]">
          0% BLOCK
        </text>
        <text x="130" y="16" textAnchor="middle" className="text-[10px] font-black fill-[#111]">
          50% TEA GANG
        </text>
        <text x="242" y="148" textAnchor="end" className="text-[10px] font-black fill-[#15803d]">
          100% MACHAN
        </text>

        {/* Sweeping Needle */}
        <g
          transform={`translate(130, 130) rotate(${deg})`}
          style={{ transition: 'transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <polygon points="-6,0 0,-92 6,0" fill="#111111" />
          <circle cx="0" cy="0" r="13" fill={isSafe ? '#B8FF01' : '#FF3366'} stroke="#111" strokeWidth="3.5" />
        </g>
      </svg>

      <div className="mt-1 text-center">
        <div className="text-2xl font-black">{scorePct}% SYNC</div>
        <div
          className={`mt-1 px-3 py-1 rounded-full border-2 border-[#111] font-black text-xs inline-block ${
            isSafe ? 'bg-[#B8FF01] text-[#111]' : 'bg-[#FF3366] text-white'
          }`}
        >
          {tierLabel}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 9. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [lang, setLang] = useState('en'); // 'en' | 'desi'
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  // Firebase User & Quizzes State
  const [user, setUser] = useState(null);
  const [quizzesMap, setQuizzesMap] = useState({
    [INITIAL_DEMO_QUIZ.id]: INITIAL_DEMO_QUIZ
  });
  const [activeQuizId, setActiveQuizId] = useState(INITIAL_DEMO_QUIZ.id);
  const [localStoreReady, setLocalStoreReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkedQuizId, setLinkedQuizId] = useState('');
  const [linkedQuizError, setLinkedQuizError] = useState('');
  const [cloudSnapshotReady, setCloudSnapshotReady] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(db ? 'connecting' : 'offline');
  const [isRetryingCloudPublish, setIsRetryingCloudPublish] = useState(false);

  // View Mode: 'create' | 'share' | 'play' | 'scoreboard'
  const [mode, setMode] = useState('create');

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3200);
  };

  // --------------------------------------------------------------------------
  // Creator Studio State
  // --------------------------------------------------------------------------
  const [creatorStep, setCreatorStep] = useState(1);
  const [cName, setCName] = useState('');
  const [cPronoun, setCPronoun] = useState('m');
  const [cAvatar, setCAvatar] = useState('av1');
  const [cCustomAvatarUrl, setCCustomAvatarUrl] = useState('');
  const [cTheme, setCTheme] = useState('block');
  const [cPassScore, setCPassScore] = useState(7);
  const [cPin] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [cQuestions, setCQuestions] = useState(() =>
    QUESTION_POOL.slice(0, 10).map((q) => ({
      ...q,
      correctOptionId: null,
      isDealbreaker: false
    }))
  );
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Custom Question Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customQText, setCustomQText] = useState('');
  const [customOpts, setCustomOpts] = useState([
    {
      id: 'a',
      emoji: '🔥',
      tag: 'OPTION 1',
      text: '',
      img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'b',
      emoji: '😂',
      tag: 'OPTION 2',
      text: '',
      img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'c',
      emoji: '🏍️',
      tag: 'OPTION 3',
      text: '',
      img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'd',
      emoji: '😎',
      tag: 'OPTION 4',
      text: '',
      img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'
    }
  ]);

  // --------------------------------------------------------------------------
  // Friend Gameplay State (With Combo Streak, Timer & Kinetic XP Popups)
  // --------------------------------------------------------------------------
  const [playerStep, setPlayerStep] = useState('entry'); // 'entry' | 'quiz' | 'result'
  const [friendName, setFriendName] = useState('');
  const [friendAvatar, setFriendAvatar] = useState('av3');
  const [relationshipId, setRelationshipId] = useState('squad');
  const [instantFeedback, setInstantFeedback] = useState(true);
  const [pQuestionIdx, setPQuestionIdx] = useState(0);
  const [pAnswers, setPAnswers] = useState({});
  const [lastSelectedOption, setLastSelectedOption] = useState(null);
  const answerLockRef = useRef(false);
  const cloudQuizIdsRef = useRef(new Set());
  // Track confirmed remote attempt IDs separately from local attempts so failed writes can retry.
  const cloudAttemptIdsRef = useRef(new Map());
  const [latestAttempt, setLatestAttempt] = useState(null);

  // Combo Streak & Live Timer
  const [comboStreak, setComboStreak] = useState(0);
  const [maxComboStreak, setMaxComboStreak] = useState(0);
  const [xpPoints, setXpPoints] = useState(0);
  const [questionElapsedSec, setQuestionElapsedSec] = useState(0);
  const [totalTimeSec, setTotalTimeSec] = useState(0);
  const [kineticPopup, setKineticPopup] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [stampSlammed, setStampSlammed] = useState(false);

  const receiptCanvasRef = useRef(null);

  useEffect(() => () => sfx.stopMusic(), []);

  // Some mobile browsers suspend Web Audio when a tab returns from the background.
  // Resume only after the user has explicitly enabled music.
  useEffect(() => {
    if (!musicOn || muted || typeof document === 'undefined') return undefined;
    const resumeWhenVisible = () => {
      if (document.visibilityState === 'visible' && sfx.ctx?.state !== 'running') {
        sfx.startMusic();
      }
    };
    document.addEventListener('visibilitychange', resumeWhenVisible);
    return () => document.removeEventListener('visibilitychange', resumeWhenVisible);
  }, [musicOn, muted]);

  // --------------------------------------------------------------------------
  // Scoreboard & Admin Moderation State
  // --------------------------------------------------------------------------
  const [boardFilter, setBoardFilter] = useState('all');
  const [inspectedAttempt, setInspectedAttempt] = useState(null);
  const [unlockedQuizzes, setUnlockedQuizzes] = useState({});
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [codeSearchInput, setCodeSearchInput] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);

  const activeQuiz = useMemo(() => {
    return quizzesMap[activeQuizId] || INITIAL_DEMO_QUIZ;
  }, [quizzesMap, activeQuizId]);

  const activeTheme = useMemo(() => {
    return QUIZ_THEMES.find((t) => t.id === activeQuiz.themeId) || QUIZ_THEMES[0];
  }, [activeQuiz]);

  const activeAvatar = useMemo(() => {
    return AVATAR_BADGES.find((a) => a.id === activeQuiz.avatar) || AVATAR_BADGES[0];
  }, [activeQuiz]);

  // Live per-question stopwatch during gameplay
  useEffect(() => {
    if (mode !== 'play' || playerStep !== 'quiz' || lastSelectedOption) return;
    setQuestionElapsedSec(0);
    const interval = setInterval(() => {
      setQuestionElapsedSec((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(interval);
  }, [mode, playerStep, pQuestionIdx, lastSelectedOption]);

  // Trigger Rubber Stamp Slam on Result Screen
  useEffect(() => {
    if (mode === 'play' && playerStep === 'result') {
      setStampSlammed(false);
      const t = setTimeout(() => {
        setStampSlammed(true);
        sfx.stampSlam();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [mode, playerStep]);

  // ============================================================================
  // Local persistence provides offline recovery and same-browser/tab sync.
  // Cross-device sync requires valid Firebase client configuration and Firestore rules.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('dont-block-me:quizzes:v1');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          delete saved.Y0TJMqL; // legacy seeded demo quiz; never restore fake leaderboard entries
          setQuizzesMap((prev) => ({ ...prev, ...saved }));
        }
      }
    } catch (err) {
      console.warn('Local quiz restore skipped:', err);
    } finally {
      setLocalStoreReady(true);
    }

    const handleStorage = (event) => {
      if (event.key !== 'dont-block-me:quizzes:v1' || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue);
        if (incoming && typeof incoming === 'object') {
          delete incoming.Y0TJMqL;
          setQuizzesMap((prev) => ({ ...prev, ...incoming }));
        }
      } catch (err) {
        console.warn('Cross-tab quiz sync skipped:', err);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!localStoreReady) return;
    try {
      window.localStorage.setItem('dont-block-me:quizzes:v1', JSON.stringify(quizzesMap));
    } catch (err) {
      console.warn('Local quiz save skipped (storage may be full):', err);
    }
  }, [quizzesMap, localStoreReady]);

  // Restore unfinished drafts and gameplay after an accidental page refresh.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('dont-block-me:session:v1');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          if (saved.lang === 'en' || saved.lang === 'desi') setLang(saved.lang);
          if (typeof saved.muted === 'boolean') { setMuted(saved.muted); sfx.setMuted(saved.muted); }
          if (typeof saved.cName === 'string') setCName(saved.cName);
          if (['m', 'f', 't'].includes(saved.cPronoun)) setCPronoun(saved.cPronoun);
          if (typeof saved.cAvatar === 'string') setCAvatar(saved.cAvatar);
          if (typeof saved.cCustomAvatarUrl === 'string') setCCustomAvatarUrl(saved.cCustomAvatarUrl);
          if (typeof saved.cTheme === 'string') setCTheme(saved.cTheme);
          if (Number.isFinite(saved.cPassScore)) setCPassScore(saved.cPassScore);
          if (Array.isArray(saved.cQuestions) && saved.cQuestions.length) setCQuestions(saved.cQuestions);
          if (Number.isInteger(saved.currentQIndex)) setCurrentQIndex(Math.max(0, Math.min(saved.currentQIndex, (saved.cQuestions?.length || 10) - 1)));
          if (saved.creatorStep === 1 || saved.creatorStep === 2) setCreatorStep(saved.creatorStep);
          if (typeof saved.activeQuizId === 'string') setActiveQuizId(saved.activeQuizId);
          if (['create', 'share', 'play', 'scoreboard'].includes(saved.mode)) setMode(saved.mode);
          if (typeof saved.friendName === 'string') setFriendName(saved.friendName);
          if (typeof saved.friendAvatar === 'string') setFriendAvatar(saved.friendAvatar);
          if (typeof saved.relationshipId === 'string') setRelationshipId(saved.relationshipId);
          if (Number.isInteger(saved.pQuestionIdx)) setPQuestionIdx(Math.max(0, saved.pQuestionIdx));
          if (saved.pAnswers && typeof saved.pAnswers === 'object') setPAnswers(saved.pAnswers);
          if (['entry', 'quiz', 'result'].includes(saved.playerStep)) setPlayerStep(saved.playerStep);
          if (saved.latestAttempt && typeof saved.latestAttempt === 'object') setLatestAttempt(saved.latestAttempt);
          if (Number.isFinite(saved.totalTimeSec)) setTotalTimeSec(saved.totalTimeSec);
          if (Number.isFinite(saved.xpPoints)) setXpPoints(saved.xpPoints);
          if (Number.isFinite(saved.comboStreak)) setComboStreak(saved.comboStreak);
          if (Number.isFinite(saved.maxComboStreak)) setMaxComboStreak(saved.maxComboStreak);
        }
      }
    } catch (err) { console.warn('Session restore skipped:', err); }
    finally { setSessionReady(true); }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    try {
      window.localStorage.setItem('dont-block-me:session:v1', JSON.stringify({
        lang, muted, cName, cPronoun, cAvatar, cCustomAvatarUrl, cTheme, cPassScore,
        cQuestions, currentQIndex, creatorStep, activeQuizId, mode, friendName, friendAvatar,
        relationshipId, pQuestionIdx, pAnswers, playerStep, latestAttempt, totalTimeSec,
        xpPoints, comboStreak, maxComboStreak
      }));
    } catch (err) { console.warn('Session save skipped:', err); }
  }, [sessionReady, lang, muted, cName, cPronoun, cAvatar, cCustomAvatarUrl, cTheme,
      cPassScore, cQuestions, currentQIndex, creatorStep, activeQuizId, mode, friendName,
      friendAvatar, relationshipId, pQuestionIdx, pAnswers, playerStep, latestAttempt,
      totalTimeSec, xpPoints, comboStreak, maxComboStreak]);

  // Resolve shared quiz links on the deployed app origin.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const linkedId = params.get('id');
    if (!linkedId) return;
    const normalizedId = linkedId.trim().slice(0, 32);
    if (!normalizedId) return;
    setLinkedQuizId(normalizedId);
    setLinkedQuizError('');
    setCloudSnapshotReady(false);
    setCloudSyncStatus(db ? 'connecting' : 'offline');
    setActiveQuizId(normalizedId);
    setMode('share');
  }, []);

  // Never silently substitute the starter quiz for a missing shared quiz.
  useEffect(() => {
    if (!linkedQuizId || !localStoreReady) return;
    if (quizzesMap[linkedQuizId]) {
      setLinkedQuizError('');
      return;
    }
    if (!db) {
      setLinkedQuizError('missing');
      return;
    }
    if (cloudSnapshotReady) setLinkedQuizError('missing');
  }, [linkedQuizId, localStoreReady, quizzesMap, db, cloudSnapshotReady]);

  // FIREBASE AUTH & REAL-TIME SYNC
  // ============================================================================
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.warn('Firebase authentication failed:', e);
        setCloudSnapshotReady(true);
        setCloudSyncStatus('error');
        setLinkedQuizError('cloud');
        showToast('Cloud sign-in failed. Check Firebase Authentication settings and retry.', 'error');
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setCloudSyncStatus('connecting');
      if (!u) {
        setCloudSnapshotReady(true);
        setCloudSyncStatus('error');
        setLinkedQuizError('cloud');
      } else {
        setLinkedQuizError('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const quizzesCol = collection(db, 'artifacts', appId, 'public', 'data', 'quizzes');
    const unsubscribe = onSnapshot(
      quizzesCol,
      (snapshot) => {
        const fetched = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.id && data.id !== 'Y0TJMqL') {
            try {
              fetched[data.id] = {
                ...data,
                questions:
                  typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions,
                attempts:
                  typeof data.attempts === 'string'
                    ? JSON.parse(data.attempts)
                    : data.attempts || []
              };
            } catch (e) {
              // Ignore malformed
            }
          }
        });
        if (Object.keys(fetched).length > 0) {
          Object.keys(fetched).forEach((quizId) => cloudQuizIdsRef.current.add(quizId));
          setQuizzesMap((prev) => mergeQuizSnapshots(prev, fetched));
        }
        setCloudSnapshotReady(true);
        setCloudSyncStatus('live');
      },
      (err) => {
        setCloudSnapshotReady(true);
        setCloudSyncStatus('error');
        console.warn('Firestore snapshot fallback:', err);
        showToast('Could not load shared quizzes. Check your connection and Firebase access rules.', 'error');
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Attempt documents are independent records, so simultaneous players never
  // replace a shared attempts array on the parent quiz document.
  const cloudQuizIds = Object.keys(quizzesMap).sort().join('|');
  useEffect(() => {
    if (!user || !db || !cloudQuizIds) return undefined;
    const cleanups = cloudQuizIds.split('|').filter(Boolean).map((quizId) => {
      const attemptsCol = collection(
        db, 'artifacts', appId, 'public', 'data', 'quizzes', quizId, 'attempts'
      );
      const attemptsQuery = query(attemptsCol, orderBy('timestamp', 'desc'), limit(500));
      return onSnapshot(attemptsQuery, (snapshot) => {
        const remoteAttempts = [];
        snapshot.forEach((attemptDoc) => remoteAttempts.push({ ...attemptDoc.data(), id: attemptDoc.id }));
        cloudAttemptIdsRef.current.set(quizId, new Set(remoteAttempts.map((attempt) => attempt.id)));
        if (!remoteAttempts.length) return;
        setQuizzesMap((prev) => {
          const quiz = prev[quizId];
          if (!quiz) return prev;
          // Cloud records win on duplicate IDs; legacy embedded attempts remain visible.
          const attempts = mergeAttempts(quiz.attempts || [], remoteAttempts);
          return { ...prev, [quizId]: { ...quiz, attempts } };
        });
      }, (error) => {
        console.warn('Attempt sync unavailable for quiz', quizId, error);
      });
    });
    return () => cleanups.forEach((unsubscribe) => unsubscribe());
  }, [user, cloudQuizIds]);

  const saveQuizToCloud = async (quizObj) => {
    const incomingAttempts = quizObj.attempts || [];
    const knownAttemptIds = cloudAttemptIdsRef.current.get(quizObj.id) || new Set();
    // Local presence is not proof of cloud persistence: retry every attempt not confirmed remotely.
    const attemptsToWrite = incomingAttempts.filter((attempt) => attempt?.id && !knownAttemptIds.has(attempt.id));

    // Keep local/offline data complete, merging attempts to avoid stale UI writes.
    setQuizzesMap((prev) => {
      const current = prev[quizObj.id];
      const mergedAttempts = new Map();
      [...(current?.attempts || []), ...incomingAttempts].forEach((attempt) => {
        if (attempt?.id) mergedAttempts.set(attempt.id, attempt);
      });
      return {
        ...prev,
        [quizObj.id]: {
          ...(current || {}),
          ...quizObj,
          attempts: [...mergedAttempts.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        }
      };
    });

    if (!user || !db) {
      if (attemptsToWrite.length) {
        showToast('Result saved on this device. Cloud scoreboard is not connected.', 'error');
      }
      return;
    }

    try {
      const quizRef = doc(db, 'artifacts', appId, 'public', 'data', 'quizzes', quizObj.id);
      if (!cloudQuizIdsRef.current.has(quizObj.id)) {
        // Sync local-only quizzes when cloud becomes available. Quiz metadata is immutable
        // after publish. Do not publish the creator PIN.
        const { attempts: _attempts, pin: _pin, ...publicQuiz } = quizObj;
        await setDoc(quizRef, {
          ...publicQuiz,
          questions: JSON.stringify(publicQuiz.questions)
        });
        cloudQuizIdsRef.current.add(quizObj.id);
      }

      // Each attempt has a stable document ID: concurrent players cannot overwrite
      // each other's scores, retries are idempotent, and the quiz document stays small.
      for (const attempt of attemptsToWrite) {
        if (!isValidAttempt(attempt, quizObj.questions?.length || attempt.total)) {
          console.warn('Skipped malformed scoreboard attempt:', attempt?.id);
          continue;
        }
        const attemptRef = doc(
          db, 'artifacts', appId, 'public', 'data', 'quizzes', quizObj.id, 'attempts', attempt.id
        );
        await setDoc(attemptRef, attempt);
        const syncedIds = cloudAttemptIdsRef.current.get(quizObj.id) || new Set();
        syncedIds.add(attempt.id);
        cloudAttemptIdsRef.current.set(quizObj.id, syncedIds);
      }
    } catch (e) {
      console.warn('Cloud save skipped:', e);
      showToast(
        'Saved on this device, but cloud sync failed. Check Firebase config, anonymous sign-in, and Firestore rules.',
        'error'
      );
      throw e;
    }
  };

  // ============================================================================
  // CREATOR STUDIO HANDLERS
  // ============================================================================
  const handleStartBuildingQuestions = (e) => {
    e.preventDefault();
    sfx.click();
    if (cName.trim().length < 2) {
      showToast(
        lang === 'en' ? 'Enter a name with at least 2 characters first!' : 'குறைந்தது 2 எழுத்து பெயரை உள்ளிடுங்கள்!',
        'error'
      );
      return;
    }
    setCreatorStep(2);
    setCurrentQIndex(0);
  };

  const handleSelectCreatorAnswer = (optionId) => {
    sfx.click();
    const updated = [...cQuestions];
    updated[currentQIndex] = {
      ...updated[currentQIndex],
      correctOptionId: optionId
    };
    setCQuestions(updated);

    if (currentQIndex < cQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQIndex((prev) => Math.min(cQuestions.length - 1, prev + 1));
      }, 250);
    }
  };

  const handleSwapQuestion = () => {
    sfx.swap();
    const usedIds = new Set(cQuestions.map((q) => q.id));
    const available = QUESTION_POOL.filter((q) => !usedIds.has(q.id));
    if (available.length === 0) {
      showToast('All 14 college questions cycled!', 'info');
      return;
    }
    const randomPick = available[Math.floor(Math.random() * available.length)];
    const updated = [...cQuestions];
    updated[currentQIndex] = {
      ...randomPick,
      correctOptionId: null,
      isDealbreaker: updated[currentQIndex].isDealbreaker
    };
    setCQuestions(updated);
    showToast(
      lang === 'en' ? 'Swapped for a new College Question! 🔄' : 'வேற புது காலேஜ் கேள்வி மாத்தியாச்சு! 🔄',
      'success'
    );
  };

  const handleToggleDealbreaker = () => {
    const currentDealbreakers = cQuestions.filter((q) => q.isDealbreaker).length;
    const isCurrentlyDealbreaker = cQuestions[currentQIndex].isDealbreaker;

    if (!isCurrentlyDealbreaker && currentDealbreakers >= 2) {
      sfx.wrong();
      showToast('Max 2 Dealbreaker questions allowed per quiz!', 'error');
      return;
    }

    sfx.dealbreaker();
    const updated = [...cQuestions];
    updated[currentQIndex] = {
      ...updated[currentQIndex],
      isDealbreaker: !isCurrentlyDealbreaker
    };
    setCQuestions(updated);
  };

  const handleSaveCustomQuestion = (e) => {
    e.preventDefault();
    if (!customQText.trim() || customOpts.some((o) => !o.text.trim())) {
      showToast('Fill out the question and all 4 options!', 'error');
      return;
    }
    sfx.correct(2);
    const newQ = {
      id: 'custom_' + Date.now(),
      axis: 'squad',
      category: 'College Inside Joke ✨',
      bannerImg:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
      en: customQText.trim(),
      desi: customQText.trim(),
      options: customOpts.map((o) => ({
        id: o.id,
        emoji: o.emoji,
        tag: o.tag,
        en: o.text.trim(),
        desi: o.text.trim(),
        img: o.img,
        gradient: 'from-purple-600 to-indigo-900'
      })),
      correctOptionId: null,
      isDealbreaker: cQuestions[currentQIndex].isDealbreaker
    };
    const updated = [...cQuestions];
    updated[currentQIndex] = newQ;
    setCQuestions(updated);
    setShowCustomModal(false);
    setCustomQText('');
    showToast('Custom College Question Added! 🎯', 'success');
  };

  const handlePublishQuiz = async () => {
    const unansweredIdx = cQuestions.findIndex((q) => !q.correctOptionId);
    if (unansweredIdx !== -1) {
      sfx.wrong();
      setCurrentQIndex(unansweredIdx);
      showToast(`Pick your answer for Question #${unansweredIdx + 1}!`, 'error');
      return;
    }

    sfx.fanfare();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newId = '';
    for (let i = 0; i < 6; i++) {
      newId += chars[Math.floor(Math.random() * chars.length)];
    }

    const newQuiz = {
      id: newId,
      creatorName: cName.trim(),
      pronoun: cPronoun,
      avatar: cAvatar,
      customAvatarUrl: cCustomAvatarUrl.trim(),
      themeId: cTheme,
      passScore: cPassScore,
      pin: cPin,
      createdAt: Date.now(),
      questions: cQuestions,
      attempts: []
    };

    // A cloud write can fail even though the quiz is safely stored locally.
    // Do not leave the creator trapped in the editor on a network/rules error.
    let cloudPublished = false;
    try {
      await saveQuizToCloud(newQuiz);
      cloudPublished = Boolean(db && user);
    } catch (error) {
      console.error('Quiz cloud publish failed; keeping the local draft:', error);
    }

    setActiveQuizId(newId);
    setUnlockedQuizzes((prev) => ({ ...prev, [newId]: true }));
    setMode('share');
    if (cloudPublished) {
      showToast(`Quiz #${newId} is published! Share with your College Gang 🚀`, 'success');
    } else {
      showToast('Quiz saved on this device, but online sharing is not ready. Check Firebase setup and retry before sending the link.', 'error');
    }
  };

  // ============================================================================
  // FRIEND GAMEPLAY HANDLERS (WITH STREAK, SPEED BONUS & SHAKE)
  // ============================================================================
  const handleStartFriendPlay = (e) => {
    e.preventDefault();
    if (!activeQuiz.questions?.length || activeQuiz.questions.some((q) => !q.correctOptionId || !q.options?.some((o) => o.id === q.correctOptionId))) {
      showToast('This quiz is not published yet. Create your quiz and select the correct answer for every question first.', 'error');
      setMode('create');
      setCreatorStep(2);
      return;
    }
    const cleanName = friendName.trim();
    if (!cleanName || cleanName.length < 2) {
      sfx.wrong();
      showToast('Enter your nickname (min 2 chars)!', 'error');
      return;
    }
    sfx.click();
    setPAnswers({});
    setPQuestionIdx(0);
    setComboStreak(0);
    setMaxComboStreak(0);
    setXpPoints(0);
    setTotalTimeSec(0);
    setLastSelectedOption(null);
    answerLockRef.current = false;
    setPlayerStep('quiz');
  };

  const handleFriendPickOption = (optionId) => {
    if (answerLockRef.current || lastSelectedOption || playerStep !== 'quiz') return;
    if (!activeQuiz.questions?.length || pQuestionIdx < 0 || pQuestionIdx >= activeQuiz.questions.length) {
      showToast('This quiz question is unavailable. Please restart the quiz.', 'error');
      return;
    }
    answerLockRef.current = true;
    const currentQ = activeQuiz.questions[pQuestionIdx];
    const isCorrect = optionId === currentQ.correctOptionId;

    const newTotalTime = +(totalTimeSec + questionElapsedSec).toFixed(1);
    setTotalTimeSec(newTotalTime);

    let nextStreak = comboStreak;
    let nextMaxStreak = maxComboStreak;
    let nextXp = xpPoints;

    if (isCorrect) {
      nextStreak = comboStreak + 1;
      nextMaxStreak = Math.max(maxComboStreak, nextStreak);
      const speedBonus = questionElapsedSec < 3.5 ? 50 : 20;
      const gained = 100 + nextStreak * 25 + speedBonus;
      nextXp += gained;

      setComboStreak(nextStreak);
      setMaxComboStreak(nextMaxStreak);
      setXpPoints(nextXp);

      if (instantFeedback) {
        sfx.correct(nextStreak);
        setKineticPopup({
          text:
            nextStreak >= 3
              ? `🔥 ${nextStreak}x MASS STREAK! +${gained} XP`
              : `⚡ SEMA MATCH! +${gained} XP`,
          good: true
        });
      } else {
        sfx.click();
      }
    } else {
      nextStreak = 0;
      setComboStreak(0);
      if (instantFeedback) {
        sfx.wrong();
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 420);
        setKineticPopup({
          text: currentQ.isDealbreaker
            ? '💀 DEALBREAKER MISSED! BLOCK ALERT!'
            : '❌ WRONG GUESS! STREAK LOST!',
          good: false
        });
      } else {
        sfx.click();
      }
    }

    setLastSelectedOption(optionId);
    const updatedAnswers = { ...pAnswers, [currentQ.id]: optionId };
    setPAnswers(updatedAnswers);

    setTimeout(async () => {
      setKineticPopup(null);

      if (pQuestionIdx < activeQuiz.questions.length - 1) {
        answerLockRef.current = false;
        setLastSelectedOption(null);
        setPQuestionIdx((prev) => prev + 1);
      } else {
        let score = 0;
        let missedDealbreaker = false;
        activeQuiz.questions.forEach((q) => {
          if (updatedAnswers[q.id] === q.correctOptionId) {
            score += 1;
          } else if (q.isDealbreaker) {
            missedDealbreaker = true;
          }
        });

        const passed = score >= activeQuiz.passScore && !missedDealbreaker;
        if (passed) sfx.fanfare();
        else sfx.blockedAlarm();

        const avgTimeSec = +(newTotalTime / activeQuiz.questions.length).toFixed(1);

        const attemptObj = {
          id: 'att_' + Date.now(),
          friendName: friendName.trim(),
          avatarId: friendAvatar,
          relationshipId,
          score,
          total: activeQuiz.questions.length,
          avgTimeSec,
          maxStreak: nextMaxStreak,
          xpEarned: nextXp,
          missedDealbreaker,
          answers: updatedAnswers,
          timestamp: Date.now()
        };

        const updatedQuiz = {
          ...activeQuiz,
          attempts: [attemptObj, ...(activeQuiz.attempts || [])]
        };

        setLatestAttempt(attemptObj);
        setPlayerStep('result');
        try {
          await saveQuizToCloud(updatedQuiz);
        } catch (error) {
          console.error('Attempt save failed:', error);
          showToast('Your result is shown, but saving it failed. Please retry when online.', 'error');
        }
      }
    }, instantFeedback ? 650 : 240);
  };

  // ============================================================================
  // UPGRADED HTML5 CANVAS RECEIPT GENERATOR (WITH RADAR SUMMARY & STAMP)
  // ============================================================================
  useEffect(() => {
    if (mode !== 'play' || playerStep !== 'result' || !latestAttempt || !receiptCanvasRef.current) {
      return;
    }
    const canvas = receiptCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = 700;
    const H = 1020;
    canvas.width = W;
    canvas.height = H;

    const isSafe = latestAttempt.score >= activeQuiz.passScore && !latestAttempt.missedDealbreaker;
    const radar = computeRadarMetrics(activeQuiz.questions, latestAttempt.answers);

    // Paper Base
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(0, 0, W, H);

    // Sawtooth receipt edges
    ctx.fillStyle = '#111111';
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 10, 14);
      ctx.lineTo(x + 20, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + 10, H - 14);
      ctx.lineTo(x + 20, H);
      ctx.fill();
    }

    // Outer Brutalist Frame
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 26, W - 44, H - 52);

    // Header Banner
    ctx.fillStyle = isSafe ? '#B8FF01' : '#FF3366';
    ctx.fillRect(25, 29, W - 50, 118);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(22, 147);
    ctx.lineTo(W - 22, 147);
    ctx.stroke();

    ctx.fillStyle = isSafe ? '#111111' : '#FFFFFF';
    ctx.font = '900 31px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("DON'T BLOCK ME! // COLLEGE SQUAD RECEIPT", W / 2, 78);
    ctx.font = 'bold 19px monospace';
    ctx.fillText(
      `HOST: ${activeQuiz.creatorName.toUpperCase()}  |  QUIZ #${activeQuiz.id}  |  PASS: ${activeQuiz.passScore}/${activeQuiz.questions.length}`,
      W / 2,
      118
    );

    // Candidate Info
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    ctx.font = 'bold 21px monospace';
    const relObj =
      RELATIONSHIP_TAGS.find((r) => r.id === latestAttempt.relationshipId) || RELATIONSHIP_TAGS[0];
    ctx.fillText(`CANDIDATE : ${latestAttempt.friendName}`, 46, 188);
    ctx.fillText(`RELATION  : ${relObj.en.toUpperCase()}`, 46, 220);
    ctx.fillText(
      `SPEED/XP  : ${latestAttempt.avgTimeSec || 3.8}s AVG  |  🔥 ${latestAttempt.maxStreak || 3}x STREAK`,
      46,
      252
    );

    // Score Box
    ctx.fillStyle = '#111111';
    ctx.fillRect(W - 216, 168, 166, 98);
    ctx.fillStyle = isSafe ? '#B8FF01' : '#FFB800';
    ctx.fillRect(W - 222, 162, 166, 98);
    ctx.strokeRect(W - 222, 162, 166, 98);

    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.font = '900 44px sans-serif';
    ctx.fillText(`${latestAttempt.score}/${latestAttempt.total || activeQuiz.questions.length}`, W - 139, 218);
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${latestAttempt.xpEarned || 850} XP EARNED`, W - 139, 245);

    const drawDash = (y) => {
      ctx.save();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(W - 44, y);
      ctx.stroke();
      ctx.restore();
    };

    drawDash(282);

    // 5-Axis Compatibility Bars inside Receipt
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#111111';
    ctx.fillText('SQUAD VIBE RADAR BREAKDOWN:', 46, 310);

    radar.forEach((r, idx) => {
      const bx = 46 + (idx % 2) * 305;
      const by = 338 + Math.floor(idx / 2) * 34;
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#111';
      ctx.fillText(`${r.labelEn.slice(0, 14).padEnd(14, ' ')} ${r.pct}%`, bx, by);
    });

    drawDash(432);

    // 10 Questions Table
    ctx.font = 'bold 15px monospace';
    ctx.fillText('Q#   TOPIC                      DEALBREAKER    STATUS', 46, 458);
    drawDash(470);

    activeQuiz.questions.forEach((q, idx) => {
      const y = 500 + idx * 32;
      const gotRight = latestAttempt.answers[q.id] === q.correctOptionId;
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#111111';
      const numStr = String(idx + 1).padStart(2, '0');
      const catStr = (q.category || 'Question').replace(/[^\w\s&]/g, '').trim().padEnd(24, ' ').slice(0, 24);
      const dbStr = q.isDealbreaker ? '⚠️ CRITICAL' : '    -      ';
      ctx.fillText(`${numStr}   ${catStr}  ${dbStr}`, 46, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = gotRight ? '#047857' : '#DC2626';
      ctx.fillText(gotRight ? '[MASS +1]' : '[FLOP +0]', W - 46, y);
      ctx.textAlign = 'left';
    });

    drawDash(815);

    // Giant Rubber Stamp Verdict
    ctx.save();
    ctx.translate(W / 2, 880);
    ctx.rotate(-0.04);
    ctx.fillStyle = isSafe ? '#B8FF01' : '#FF3366';
    ctx.fillRect(-245, -36, 490, 72);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.strokeRect(-245, -36, 490, 72);

    ctx.fillStyle = isSafe ? '#111111' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = '900 29px sans-serif';
    ctx.fillText(
      isSafe ? '✅ APPROVED CHUDDY BUDDY' : '🚫 BLOCKED FROM THE SQUAD',
      0,
      10
    );
    ctx.restore();

    // Barcode Footer
    ctx.fillStyle = '#111111';
    for (let bx = 170; bx < W - 170; bx += 7) {
      const bw = bx % 14 === 0 ? 4 : 2;
      ctx.fillRect(bx, 935, bw, 28);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(
      `BLOCK.YOUTEST.ME/#${activeQuiz.id} • ${new Date(latestAttempt.timestamp).toLocaleTimeString()}`,
      W / 2,
      982
    );
  }, [mode, playerStep, latestAttempt, activeQuiz]);

  const handleDownloadReceipt = () => {
    if (!receiptCanvasRef.current) return;
    sfx.click();
    try {
      const dataUrl = receiptCanvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SquadReceipt-${activeQuiz.creatorName}-${latestAttempt?.friendName || 'Machan'}.png`;
      link.href = dataUrl;
      link.click();
      showToast('High-Res Squad Receipt Downloaded! Post on IG Story 📸', 'success');
    } catch (e) {
      showToast('Receipt ready! Screenshot or save to share.', 'info');
    }
  };

  // ============================================================================
  // SCOREBOARD ANALYTICS & ACCURACY BAR GRAPH DATA
  // ============================================================================
  const isOwnerUnlocked = !!unlockedQuizzes[activeQuiz.id];

  const boardAnalytics = useMemo(() => {
    const attempts = activeQuiz.attempts || [];
    const total = attempts.length;
    const safeList = attempts.filter(
      (a) => a.score >= activeQuiz.passScore && !a.missedDealbreaker
    );
    const blockList = attempts.filter(
      (a) => a.score < activeQuiz.passScore || a.missedDealbreaker
    );
    const avgScore =
      total > 0 ? (attempts.reduce((acc, a) => acc + a.score, 0) / total).toFixed(1) : '0.0';

    const questionStats = (activeQuiz.questions || []).map((q, idx) => {
      const rightCount = attempts.filter((a) => a.answers?.[q.id] === q.correctOptionId).length;
      const pct = total > 0 ? Math.round((rightCount / total) * 100) : 0;
      const rightOpt = q.options.find((o) => o.id === q.correctOptionId);
      return {
        idx: idx + 1,
        id: q.id,
        category: q.category,
        pct,
        rightCount,
        isDealbreaker: q.isDealbreaker,
        rightLabel: rightOpt ? `${rightOpt.emoji} ${rightOpt.tag}` : ''
      };
    });

    // Squad average radar
    const avgRadar = RADAR_AXES.map((ax) => {
      if (total === 0) return { ...ax, pct: 75 };
      const sum = attempts.reduce((acc, att) => {
        const r = computeRadarMetrics(activeQuiz.questions, att.answers).find(
          (item) => item.key === ax.key
        );
        return acc + (r ? r.pct : 70);
      }, 0);
      return { ...ax, pct: Math.round(sum / total) };
    });

    return {
      total,
      safeCount: safeList.length,
      blockCount: blockList.length,
      avgScore,
      questionStats,
      avgRadar
    };
  }, [activeQuiz]);

  const filteredAttempts = useMemo(() => {
    const list = activeQuiz.attempts || [];
    let filtered = list;
    if (boardFilter === 'safe') {
      filtered = list.filter((a) => a.score >= activeQuiz.passScore && !a.missedDealbreaker);
    } else if (boardFilter === 'blocked') {
      filtered = list.filter((a) => a.score < activeQuiz.passScore || a.missedDealbreaker);
    } else if (boardFilter === 'dealbreaker') {
      filtered = list.filter((a) => a.missedDealbreaker);
    }
    // Rank actual players by score, then XP, then speed. Never insert synthetic entries.
    return [...filtered].sort((a, b) =>
      (Number(b.score) || 0) - (Number(a.score) || 0) ||
      (Number(b.xpEarned) || 0) - (Number(a.xpEarned) || 0) ||
      (Number(a.avgTimeSec ?? Infinity)) - (Number(b.avgTimeSec ?? Infinity)) ||
      (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)
    );
  }, [activeQuiz, boardFilter]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?id=${encodeURIComponent(activeQuiz.id)}&q=${encodeURIComponent(activeQuiz.pronoun || 'm')}`
    : `/?id=${encodeURIComponent(activeQuiz.id)}&q=${encodeURIComponent(activeQuiz.pronoun || 'm')}`;
  // A share URL is useful to other devices only after this quiz document exists in Firestore.
  const canShareQuizOnline = cloudSyncStatus === 'live' && cloudQuizIdsRef.current.has(activeQuiz.id);

  // ============================================================================
  // RENDER APPLICATION
  // ============================================================================
  return (
    <div
      className={`min-h-screen text-[#111111] pb-20 selection:bg-[#FF3366] selection:text-white transition-transform ${
        screenShake ? ' translate-x-2 -translate-y-1 ' : ''
      }`}
      style={{
        backgroundColor: '#FFFDF5',
        backgroundImage: 'radial-gradient(#111111 1.15px, transparent 1.15px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* FLOATING TOAST ALERT */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl border-[3px] border-[#111] shadow-[5px_5px_0px_#111] font-black flex items-center gap-3 ${
              toast.type === 'error'
                ? 'bg-[#FF3366] text-white'
                : toast.type === 'success'
                ? 'bg-[#B8FF01] text-[#111]'
                : 'bg-[#00E5FF] text-[#111]'
            }`}
          >
            <Zap className="w-5 h-5 shrink-0" />
            <span className="text-sm leading-tight">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-auto p-1 hover:bg-black/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STICKY HEADER & NAVIGATION BAR */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5]/95 backdrop-blur border-b-[3px] border-[#111] px-3 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo */}
          <div
            onClick={() => {
              sfx.click();
              setMode('create');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src="/squad-logo.svg"
              alt="Don't Block Me College Squad logo"
              width="48"
              height="48" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-[3px] border-[#111] shadow-[3px_3px_0px_#111] group-hover:-rotate-6 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight">
                  DON&apos;T BLOCK ME!
                </span>
                <span className="bg-[#B8FF01] text-[#111] text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-[#111] uppercase">
                  College Squad 3.0
                </span>
              </div>
              <p className="text-xs font-bold text-neutral-600 hidden sm:block">
                {lang === 'en'
                  ? 'Visual Trading Cards • 3D Motion Physics • Live Friendship Radar'
                  : 'காலேஜ் மச்சான் & பெஸ்டி தகுதித் தேர்வு • லைவ் ரேடார் கிராப்'}
              </p>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2 header-quick-actions">
            <button
              onClick={() => {
                sfx.click();
                setLang((prev) => (prev === 'en' ? 'desi' : 'en'));
              }}
              className="px-3.5 py-2 rounded-xl bg-[#FFB800] border-[2.5px] border-[#111] shadow-[3px_3px_0px_#111] active:translate-y-0.5 font-black text-xs sm:text-sm flex items-center gap-1.5"
            >
              <Globe className="w-4 h-4" />
              {lang === 'en' ? 'Switch to Tamil 🔥' : 'English Mode 🌐'}
            </button>

            <button
              onClick={() => {
                sfx.click();
                setShowCodeModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-white border-[2.5px] border-[#111] shadow-[3px_3px_0px_#111] font-black text-xs sm:text-sm flex items-center gap-1"
            >
              <Hash className="w-4 h-4 text-[#FF3366]" />
              <span>#{activeQuiz.id}</span>
            </button>

            <button
              type="button"
              aria-label={musicOn ? 'Turn background music off' : 'Turn background music on'}
              aria-pressed={musicOn}
              onClick={async () => {
                const next = !musicOn;
                if (next) {
                  const started = await sfx.startMusic();
                  setMusicOn(started);
                  if (started) sfx.click();
                  else showToast('Tap again to allow audio, or check your device media volume.', 'info');
                } else {
                  sfx.stopMusic();
                  setMusicOn(false);
                  sfx.click();
                }
              }}
              className={`p-2 rounded-xl border-[2.5px] border-[#111] shadow-[3px_3px_0px_#111] ${musicOn ? 'bg-[#B8FF01]' : 'bg-white'}`}
              title={musicOn ? 'Background music on' : 'Background music off'}
            >
              <Music className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const nextMuted = !muted;
                sfx.setMuted(nextMuted);
                setMuted(nextMuted);
                if (!nextMuted && musicOn) sfx.startMusic();
              }}
              className={`p-2 rounded-xl border-[2.5px] border-[#111] shadow-[3px_3px_0px_#111] ${
                muted ? 'bg-neutral-200' : 'bg-[#00E5FF]'
              }`}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {linkedQuizId && (linkedQuizError || (db && !cloudSnapshotReady && !quizzesMap[linkedQuizId])) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FFFDF5] p-5">
          <div role="alert" className="w-full max-w-lg rounded-3xl border-[3px] border-[#111] bg-white p-6 text-center shadow-[7px_7px_0px_#111]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-[#111] bg-[#FFB800]">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black">Quiz link unavailable</h1>
            <p className="mt-3 text-sm font-bold text-neutral-600">
              {!linkedQuizError
                ? 'Loading the shared quiz securely…'
                : linkedQuizError === 'missing'
                ? 'This quiz could not be found on this device or in the cloud. Ask the creator to publish it again and send a fresh link.'
                : 'Cloud sign-in or sync failed. Check your connection and Firebase Authentication/Firestore rules, then retry.'}
            </p>
            {linkedQuizError && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-xl border-[3px] border-[#111] bg-[#B8FF01] px-5 py-3 font-black"
                >Try again</button>
                <button
                  type="button"
                  onClick={() => { window.history.replaceState({}, '', window.location.pathname); setLinkedQuizId(''); setLinkedQuizError(''); setActiveQuizId(INITIAL_DEMO_QUIZ.id); setMode('create'); }}
                  className="rounded-xl border-[3px] border-[#111] bg-white px-5 py-3 font-black"
                >Create a quiz instead</button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Flow Switcher Bar */}
        <div className="max-w-6xl mx-auto mt-3 pt-2.5 border-t-2 border-dashed border-neutral-300 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 header-flow-actions">
            <button
              onClick={() => {
                sfx.click();
                setMode('create');
              }}
              className={`px-3.5 py-1.5 rounded-xl border-2 border-[#111] font-black text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
                mode === 'create'
                  ? 'bg-[#111] text-[#B8FF01] shadow-[2px_2px_0px_#FF3366]'
                  : 'bg-white hover:bg-neutral-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              {lang === 'en' ? '1. Creator Studio' : '1. குவிஸ் உருவாக்கு'}
            </button>

            <button
              onClick={() => {
                sfx.click();
                setMode('share');
              }}
              className={`px-3.5 py-1.5 rounded-xl border-2 border-[#111] font-black text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
                mode === 'share'
                  ? 'bg-[#111] text-[#00E5FF] shadow-[2px_2px_0px_#FF3366]'
                  : 'bg-white hover:bg-neutral-100'
              }`}
            >
              <Share2 className="w-4 h-4" />
              {lang === 'en' ? '2. Share Quiz' : '2. க்விஸ் பகிர்'}
            </button>

            <button
              onClick={() => {
                sfx.click();
                setPlayerStep('entry');
                setMode('play');
              }}
              className={`px-3.5 py-1.5 rounded-xl border-2 border-[#111] font-black text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
                mode === 'play'
                  ? 'bg-[#FF3366] text-white shadow-[2px_2px_0px_#111]'
                  : 'bg-white hover:bg-neutral-100'
              }`}
            >
              <Play className="w-4 h-4" />
              {lang === 'en' ? '3. Play as Friend (3D Cards)' : '3. நண்பனாக விளையாடு'}
            </button>

            <button
              onClick={() => {
                sfx.click();
                setMode('scoreboard');
              }}
              className={`px-3.5 py-1.5 rounded-xl border-2 border-[#111] font-black text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
                mode === 'scoreboard'
                  ? 'bg-[#B8FF01] text-[#111] shadow-[2px_2px_0px_#111]'
                  : 'bg-white hover:bg-neutral-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {lang === 'en' ? '4. Scoreboard & Stats' : '4. கிராப் & ஸ்கோர்போர்டு'}
              <span className="px-1.5 py-0.2 bg-[#111] text-white rounded-full text-[11px]">
                {(activeQuiz.attempts || []).length}
              </span>
            </button>
          </div>


        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN BODY */}
      {/* ==================================================================== */}
      <main className="max-w-5xl mx-auto px-4 pt-7">
        {/* ================================================================== */}
        {/* VIEW 1: CREATOR STUDIO (PHOTO AVATARS + VISUAL QUESTION BUILDER) */}
        {/* ================================================================== */}
        {mode === 'create' && (
          <div>
            {creatorStep === 1 ? (
              /* STEP 1: CREATOR PROFILE & REAL PHOTO AVATAR PICKER */
              <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#111]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-[#FF3366] text-white border-2 border-[#111] font-black text-xs uppercase mb-2">
                      STEP 1 OF 2 • COLLEGE SQUAD EDITION
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black">
                      {lang === 'en'
                        ? 'Create Your "Don’t Block Me" Squad Quiz 🔥'
                        : 'உங்க காலேஜ் நண்பர்களுக்கான Block Test உருவாக்குங்க 🔥'}
                    </h1>
                  </div>
                </div>

                <form onSubmit={handleStartBuildingQuestions} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block font-black text-sm mb-2">
                        {lang === 'en'
                          ? '1. Your Name / College Nickname *'
                          : '1. உங்க பெயர் / காலேஜ் பட்டப்பெயர் *'}
                      </label>
                      <input
                        type="text"
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        placeholder={
                          lang === 'en'
                            ? 'e.g., Santhosh, Surya, Priya, Harish...'
                            : 'உதா: கார்த்திக், சூர்யா, திவ்யா...'
                        }
                        maxLength={22}
                        className="w-full px-4 py-3.5 rounded-xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[3px_3px_0px_#111] font-bold text-base focus:outline-none focus:bg-[#B8FF01]/20"
                      />
                    </div>

                    <div>
                      <label className="block font-black text-sm mb-2">
                        {lang === 'en' ? '2. Choose Your Pronouns' : '2. பாலினம் / Pronoun'}
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { id: 'm', label: 'Machan (He) 👦' },
                          { id: 'f', label: 'Bestie (She) 👧' },
                          { id: 't', label: 'Squad (They) ✨' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              sfx.click();
                              setCPronoun(p.id);
                            }}
                            className={`py-3.5 px-2 rounded-xl border-[3px] border-[#111] font-black text-xs sm:text-sm transition-all ${
                              cPronoun === p.id
                                ? 'bg-[#FF3366] text-white shadow-[3px_3px_0px_#111] -translate-y-0.5'
                                : 'bg-[#FFFDF5] hover:bg-neutral-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Real Portrait Avatar Picker + Custom URL */}
                  <div>
                    <label className="block font-black text-sm mb-2">
                      {lang === 'en'
                        ? '3. Choose Your Real Portrait Card (Or Paste Custom Photo URL)'
                        : '3. உங்க புரொபைல் கார்டை தேர்ந்தெடுங்க'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mb-3">
                      {AVATAR_BADGES.map((av) => {
                        const selected = cAvatar === av.id && !cCustomAvatarUrl;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              sfx.click();
                              setCAvatar(av.id);
                              setCCustomAvatarUrl('');
                            }}
                            className={`group relative rounded-2xl border-[3px] border-[#111] overflow-hidden transition-all ${
                              selected
                                ? 'shadow-[4px_4px_0px_#111] -translate-y-1 ring-4 ring-[#B8FF01]'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="h-20 w-full bg-neutral-900 relative">
                              <img
                                src={av.img}
                                alt={av.label} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <span className="absolute bottom-1 right-1 text-base bg-white rounded-md px-1 border border-[#111]">
                                {av.emoji}
                              </span>
                            </div>
                            <div
                              style={{ backgroundColor: av.bg }}
                              className="py-1 px-1 text-center font-black text-[10px] border-t-2 border-[#111] truncate"
                            >
                              {av.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-neutral-500 shrink-0" />
                      <input
                        type="url"
                        value={cCustomAvatarUrl}
                        onChange={(e) => setCCustomAvatarUrl(e.target.value)}
                        placeholder="Optional: Paste your own Instagram/Profile Photo URL..."
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFDF5] border-2 border-[#111] text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Theme Selector */}
                  <div>
                    <label className="block font-black text-sm mb-2">
                      {lang === 'en' ? '4. Pick Squad Challenge Mode' : '4. சவால் தீம் (Theme)'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {QUIZ_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            sfx.click();
                            setCTheme(theme.id);
                          }}
                          className={`p-4 rounded-2xl border-[3px] border-[#111] text-left transition-all ${
                            cTheme === theme.id
                              ? 'shadow-[4px_4px_0px_#111] -translate-y-1 bg-[#FFFDF5]'
                              : 'bg-white opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              style={{ backgroundColor: theme.color }}
                              className="w-9 h-9 rounded-xl border-2 border-[#111] flex items-center justify-center text-lg"
                            >
                              {theme.icon}
                            </span>
                            {cTheme === theme.id && (
                              <span className="px-2 py-0.5 rounded-full bg-[#111] text-[#B8FF01] font-black text-[10px]">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="font-black text-sm">
                            {lang === 'en' ? theme.enTitle : theme.desiTitle}
                          </div>
                          <div className="text-xs font-bold text-neutral-600 mt-1">
                            {lang === 'en' ? theme.enDesc : theme.desiDesc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pass Cut-Off & Recovery PIN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[3px_3px_0px_#111]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm">5. Pass Cut-Off Score</span>
                        <span className="px-3 py-1 rounded-xl bg-[#FF3366] text-white border-2 border-[#111] font-black text-sm">
                          {cPassScore} / {cQuestions.length}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="10"
                        value={cPassScore}
                        onChange={(e) => setCPassScore(Number(e.target.value))}
                        className="w-full accent-[#FF3366] cursor-pointer"
                      />
                      <p className="text-xs font-bold text-neutral-600 mt-1">
                        Friends scoring under {cPassScore}/{cQuestions.length} get slammed with the BLOCKED stamp!
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#00E5FF]/20 border-[3px] border-[#111] shadow-[3px_3px_0px_#111] flex items-center justify-between">
                      <div>
                        <div className="font-black text-sm flex items-center gap-1.5">
                          <Lock className="w-4 h-4" /> Creator 4-Digit Admin PIN
                        </div>
                        <p className="text-xs font-bold text-neutral-700 mt-1">
                          Keep this PIN private. It is a convenience check on this device, not account-level security.
                        </p>
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-white border-[3px] border-[#111] font-mono font-black text-xl">
                        {cPin}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-[#B8FF01] hover:bg-[#a6e800] border-[3px] border-[#111] shadow-[5px_5px_0px_#111] active:translate-y-1 font-black text-lg flex items-center justify-center gap-2"
                  >
                    {lang === 'en'
                      ? 'Next: Pick Your Photo Trading Cards'
                      : 'அடுத்து: 10 கேள்விகளுக்கு உங்க பதிலை தேர்வு செய்யுங்க'}
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </form>
              </div>
            ) : (
              /* STEP 2: 10-QUESTION PHOTO TRADING CARD PICKER */
              <div className="bg-white border-[3px] border-[#111] rounded-3xl p-5 sm:p-8 shadow-[6px_6px_0px_#111]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <button
                    onClick={() => {
                      sfx.click();
                      setCreatorStep(1);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FFFDF5] border-2 border-[#111] font-black text-xs flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#B8FF01] border-2 border-[#111] font-black text-xs">
                      {cQuestions.filter((q) => q.correctOptionId).length} / Answered
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#FF3366] text-white border-2 border-[#111] font-black text-xs">
                      ⚠️ {cQuestions.filter((q) => q.isDealbreaker).length}/2 Dealbreakers
                    </span>
                  </div>
                </div>

                {/* Question Number Pills */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
                  {cQuestions.map((q, idx) => {
                    const isCurrent = idx === currentQIndex;
                    const isAnswered = !!q.correctOptionId;
                    return (
                      <button
                        key={q.id + idx}
                        onClick={() => {
                          sfx.click();
                          setCurrentQIndex(idx);
                        }}
                        className={`py-2 rounded-xl border-[2.5px] border-[#111] font-black text-xs relative transition-all ${
                          isCurrent
                            ? 'bg-[#111] text-[#B8FF01] -translate-y-1 shadow-[2px_2px_0px_#FF3366]'
                            : isAnswered
                            ? 'bg-[#B8FF01] text-[#111]'
                            : 'bg-[#FFFDF5] text-neutral-600'
                        }`}
                      >
                        #{idx + 1}
                        {q.isDealbreaker && (
                          <span className="absolute -top-1.5 -right-1 text-xs">⚠️</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Visual Question Card */}
                {(() => {
                  const activeQ = cQuestions[currentQIndex];
                  return (
                    <div className="p-4 sm:p-6 rounded-3xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[4px_4px_0px_#111] mb-6">
                      {/* Question Banner Header with Real Photo */}
                      <div className="question-banner relative min-h-[300px] sm:min-h-0 h-auto sm:h-36 rounded-2xl border-[3px] border-[#111] overflow-hidden mb-4 bg-neutral-900">
                        <OnlineQuestionBanner
                          src={activeQ.bannerImg}
                          query={activeQ.imageQuery || `${activeQ.category} ${activeQ.en}`}
                          alt={activeQ.category}
                          className="w-full h-full object-cover opacity-65"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30 p-3 sm:p-4 flex flex-col justify-between gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-lg bg-[#00E5FF] text-[#111] border-2 border-[#111] font-black text-xs uppercase">
                              Q{currentQIndex + 1} • {activeQ.category}
                            </span>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleSwapQuestion}
                                className="px-3 py-1.5 rounded-xl bg-[#FFB800] text-[#111] border-2 border-[#111] font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_#111]"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                {lang === 'en' ? 'Swap Question (14 Pool)' : 'வேற கேள்வி மாத்து'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  sfx.click();
                                  setShowCustomModal(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white text-[#111] border-2 border-[#111] font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_#111]"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                {lang === 'en' ? 'Custom Q' : 'சொந்த கேள்வி'}
                              </button>

                              <button
                                type="button"
                                onClick={handleToggleDealbreaker}
                                className={`px-3 py-1.5 rounded-xl border-2 border-[#111] font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_#111] ${
                                  activeQ.isDealbreaker
                                    ? 'bg-[#FF3366] text-white'
                                    : 'bg-white text-[#111]'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {activeQ.isDealbreaker ? 'Dealbreaker ON ⚠️' : 'Dealbreaker'}
                              </button>
                            </div>
                          </div>

                          <h3 className="text-white font-black text-lg sm:text-2xl leading-snug drop-shadow break-words">
                            {formatQuestionText(
                              lang === 'en' ? activeQ.en : activeQ.desi,
                              cName,
                              cPronoun
                            )}
                          </h3>
                        </div>
                      </div>

                      {/* 4 Interactive 3D Photo Trading Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeQ.options.map((opt) => (
                          <TiltTradingCard
                            key={opt.id}
                            opt={opt}
                            lang={lang}
                            creatorName={cName}
                            pronoun={cPronoun}
                            isSelected={activeQ.correctOptionId === opt.id}
                            badgeStatus={null}
                            onSelect={handleSelectCreatorAnswer}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Builder Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentQIndex === 0}
                      onClick={() => {
                        sfx.click();
                        setCurrentQIndex((i) => Math.max(0, i - 1));
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white border-[2.5px] border-[#111] font-black text-sm disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      disabled={currentQIndex === cQuestions.length - 1}
                      onClick={() => {
                        sfx.click();
                        setCurrentQIndex((i) => Math.min(cQuestions.length - 1, i + 1));
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white border-[2.5px] border-[#111] font-black text-sm disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePublishQuiz}
                    className="px-6 py-3.5 rounded-2xl bg-[#FF3366] text-white border-[3px] border-[#111] shadow-[5px_5px_0px_#111] active:translate-y-0.5 font-black text-base flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {lang === 'en'
                      ? 'Publish Squad Quiz & Get Link 🚀'
                      : 'குவிஸை வெளியிட்டு லிங்க் எடு 🚀'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* VIEW 2: SHARE HUB & WHATSAPP/IG DYNAMIC CARD */}
        {/* ================================================================== */}
        {mode === 'share' && (
          <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#111]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#B8FF01] border-2 border-[#111] font-black text-xs uppercase mb-1">
                  {cloudSyncStatus === 'live' ? 'SQUAD QUIZ LIVE' : cloudSyncStatus === 'connecting' ? 'CONNECTING TO CLOUD…' : 'DEVICE-ONLY / OFFLINE'} • #{activeQuiz.id}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black">
                  Share {activeQuiz.creatorName}&apos;s College Audit ⚡
                </h1>
              </div>
              {activeQuiz.pin ? (
                <div className="px-4 py-2 rounded-2xl bg-[#FFFDF5] border-[3px] border-[#111] text-right">
                  <div className="text-[10px] font-black text-neutral-500">CREATOR PIN</div>
                  <div className="font-mono font-black text-lg">{activeQuiz.pin}</div>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-neutral-100 border-2 border-neutral-300 text-right">
                  <div className="text-[10px] font-black text-neutral-500">OWNER ACCESS</div>
                  <div className="text-xs font-bold">Creator device only</div>
                </div>
              )}
            </div>

            {!canShareQuizOnline ? (
              <div role="status" className="mb-6 rounded-2xl border-[3px] border-[#111] bg-amber-50 p-4 shadow-[3px_3px_0px_#111]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm">{cloudSyncStatus === 'connecting' ? 'Connecting to online sharing…' : 'This quiz is not available to other devices yet'}</p>
                    <p className="text-sm mt-1">{cloudSyncStatus === 'connecting' ? 'Waiting for Firebase to confirm a live connection. If this takes too long, check your connection and Firebase setup.' : 'This quiz is stored on this device until it is successfully published to Firebase. Copying or sharing its link now would not let friends on other devices load it.'}</p>
                    {db && user ? (
                      <button
                        type="button"
                        disabled={isRetryingCloudPublish}
                        onClick={async () => {
                          if (isRetryingCloudPublish || !db || !user) return;
                          setIsRetryingCloudPublish(true);
                          try {
                            await saveQuizToCloud(activeQuiz);
                            setCloudSyncStatus('live');
                            setCloudSnapshotReady(true);
                            showToast('Quiz sync succeeded. Your share link is ready.', 'success');
                          } catch (error) {
                            console.error('Manual quiz sync failed:', error);
                            showToast('Sync still failed. Check Firebase permissions and try again.', 'error');
                          } finally {
                            setIsRetryingCloudPublish(false);
                          }
                        }}
                        className="mt-3 rounded-xl border-2 border-[#111] bg-[#B8FF01] px-4 py-2.5 text-sm font-black shadow-[2px_2px_0px_#111] disabled:opacity-50"
                      >
                        {isRetryingCloudPublish ? 'Retrying sync…' : 'Retry online sync'}
                      </button>
                    ) : (
                      <p className="mt-3 text-xs font-bold text-amber-900">Firebase setup or sign-in is not ready yet. Check the connection, Anonymous Authentication, and Firestore rules.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Social OG Preview Card with Real Photo */}
            <div className="mb-6">
              <label className="block font-black text-xs uppercase text-neutral-600 mb-2">
                📱 Quiz link preview: 
              </label>
              <div className="max-w-xl rounded-2xl bg-[#111] text-white border-[3px] border-[#111] p-4 shadow-[5px_5px_0px_#FF3366] flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl border-2 border-[#B8FF01] shrink-0 overflow-hidden bg-gradient-to-br from-[#FF3366] to-[#FFB800] flex items-center justify-center" aria-label={`${activeQuiz.creatorName} avatar`}>
                  <span className="text-3xl" aria-hidden="true">{activeAvatar.emoji || '👥'}</span>
                  <img
                    src={activeQuiz.customAvatarUrl || activeAvatar.img}
                    alt=""
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-[#B8FF01] uppercase">
                    COLLEGE SQUAD • SHAREABLE QUIZ
                  </div>
                  <h3 className="font-black text-base sm:text-lg leading-tight truncate">
                    ⚠️ {activeQuiz.creatorName} is auditing the College Gang!
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1">
                    Guess my favorite hero, cartoon, food and bench spot. Score{' '}
                    {activeQuiz.passScore}/10 or get BLOCKED 🚫
                  </p>
                  <div className="mt-2 text-xs font-mono text-[#00E5FF] truncate">{shareUrl}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                disabled={!canShareQuizOnline}
                onClick={async () => {
                  if (!canShareQuizOnline) return;
                  sfx.correct(2);
                  await copyTextBulletproof(shareUrl);
                  showToast('Quiz link copied. Paste it into your group chat 📋', 'success');
                }}
                className="py-3.5 px-4 rounded-2xl bg-[#B8FF01] border-[3px] border-[#111] shadow-[4px_4px_0px_#111] font-black text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="w-4 h-4" /> Copy Quiz Link
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🔥 *${activeQuiz.creatorName}'s College Squad Block Test!*\nGuess my favorite hero, cartoon, food and bench spot. Score *${activeQuiz.passScore}/${activeQuiz.questions.length}* or get BLOCKED 🚫👇\n${shareUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!canShareQuizOnline}
                onClick={(e) => {
                  if (!canShareQuizOnline) {
                    e.preventDefault();
                    showToast('Online sharing is unavailable until this quiz syncs to Firebase.', 'error');
                  }
                }}
                className={`py-3.5 px-4 rounded-2xl bg-[#25D366] text-[#111] border-[3px] border-[#111] shadow-[4px_4px_0px_#111] font-black text-sm flex items-center justify-center gap-2 ${!canShareQuizOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MessageCircle className="w-4 h-4" /> Share on WhatsApp
              </a>

              <button
                onClick={() => {
                  sfx.click();
                  setPlayerStep('entry');
                  setMode('play');
                }}
                className="py-3.5 px-4 rounded-2xl bg-[#FF3366] text-white border-[3px] border-[#111] shadow-[4px_4px_0px_#111] font-black text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Test Play Now
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* VIEW 3: FRIEND GAMEPLAY (3D CARDS + STREAK METER + RADAR RESULTS) */}
        {/* ================================================================== */}
        {mode === 'play' && (
          <div>
            {playerStep === 'entry' && (
              <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#111] max-w-2xl mx-auto">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-3">
                    <img
                      src={activeQuiz.customAvatarUrl || activeAvatar.img}
                      alt={activeQuiz.creatorName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
                      className="w-24 h-24 rounded-3xl object-cover border-[3px] border-[#111] shadow-[4px_4px_0px_#111]"
                    />
                    <span className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-[#B8FF01] border-2 border-[#111] flex items-center justify-center text-lg">
                      {activeAvatar.emoji}
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-[#FF3366] text-white border-2 border-[#111] font-black text-xs uppercase">
                    {lang === 'en' ? activeTheme.enTitle : activeTheme.desiTitle} • #{activeQuiz.id}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black mt-2">
                    {lang === 'en'
                      ? `Do You Really Know ${activeQuiz.creatorName}?`
                      : `உங்களுக்கு ${activeQuiz.creatorName} பத்தி உண்மையிலேயே தெரியுமா?`}
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1">
                    {lang === 'en'
                      ? `Pass Mark: ${activeQuiz.passScore}/${activeQuiz.questions.length} • Build Combo Streaks for Bonus XP • Don't miss Dealbreakers!`
                      : `பாஸ் மார்க்: ${activeQuiz.passScore}/10 • வேகமா பதில் சொல்லி Combo XP அள்ளுங்க!`}
                  </p>
                </div>

                <form onSubmit={handleStartFriendPlay} className="space-y-5">
                  <div>
                    <label className="block font-black text-sm mb-2">
                      {lang === 'en' ? '1. Your Name / Squad Nickname *' : '1. உங்க பெயர் *'}
                    </label>
                    <input
                      type="text"
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      placeholder="e.g., Vignesh, Surya_07, Keerthi..."
                      maxLength={22}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[3px_3px_0px_#111] font-bold text-base focus:outline-none"
                    />
                  </div>

                  {/* Player Portrait Picker */}
                  <div>
                    <label className="block font-black text-sm mb-2">
                      {lang === 'en' ? '2. Pick Your Player Avatar' : '2. உங்க அவதாரை தேர்வு செய்யுங்க'}
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {AVATAR_BADGES.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            sfx.click();
                            setFriendAvatar(av.id);
                          }}
                          className={`rounded-xl border-2 border-[#111] overflow-hidden transition-all ${
                            friendAvatar === av.id
                              ? 'ring-4 ring-[#FF3366] -translate-y-1 shadow-[3px_3px_0px_#111]'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={av.img} alt={av.label} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }} className="w-full h-12 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Relationship Tag */}
                  <div>
                    <label className="block font-black text-sm mb-2">
                      {lang === 'en'
                        ? `3. Your Bond with ${activeQuiz.creatorName}`
                        : `3. ${activeQuiz.creatorName} கூட உங்க நட்பு`}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {RELATIONSHIP_TAGS.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            sfx.click();
                            setRelationshipId(tag.id);
                          }}
                          className={`p-3 rounded-xl border-[2.5px] border-[#111] font-black text-xs text-left flex items-center gap-2 transition-all ${
                            relationshipId === tag.id
                              ? 'bg-[#B8FF01] shadow-[3px_3px_0px_#111] -translate-y-0.5'
                              : 'bg-[#FFFDF5]'
                          }`}
                        >
                          <span className="text-lg">{tag.emoji}</span>
                          <span>{lang === 'en' ? tag.en : tag.desi}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-[#FF3366] text-white border-[3px] border-[#111] shadow-[5px_5px_0px_#111] active:translate-y-1 font-black text-lg flex items-center justify-center gap-2"
                  >
                    {lang === 'en'
                      ? 'Start 3D Trading Card Challenge 🚀'
                      : 'சோதனையை தொடங்கு மச்சான்! 🚀'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}

            {playerStep === 'quiz' && (
              /* ULTRA-INTERACTIVE 3D TRADING CARD GAMEPLAY WITH STREAK & STOPWATCH */
              <div className="relative bg-white border-[3px] border-[#111] rounded-3xl p-5 sm:p-7 shadow-[6px_6px_0px_#111] max-w-3xl mx-auto">
                {/* Floating Kinetic XP / Streak Popup */}
                {kineticPopup && (
                  <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
                    <div
                      className={`px-5 py-2.5 rounded-2xl border-[3px] border-[#111] shadow-[5px_5px_0px_#111] font-black text-sm sm:text-base ${
                        kineticPopup.good ? 'bg-[#B8FF01] text-[#111]' : 'bg-[#FF3366] text-white'
                      }`}
                    >
                      {kineticPopup.text}
                    </div>
                  </div>
                )}

                {(() => {
                  const q = activeQuiz.questions[pQuestionIdx];
                  const progressPct = ((pQuestionIdx + 1) / activeQuiz.questions.length) * 100;
                  return (
                    <>
                      {/* Top HUD: Question Counter, Combo Flame Meter, XP & Timer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-[#111] text-white font-black text-xs">
                            Q{pQuestionIdx + 1} / {activeQuiz.questions.length}
                          </span>
                          <span className="px-3 py-1 rounded-xl bg-[#FFFDF5] border-2 border-[#111] font-black text-xs flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-[#FF3366]" />
                            {questionElapsedSec.toFixed(1)}s
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Combo Streak Pill */}
                          <div
                            className={`px-3 py-1 rounded-xl border-2 border-[#111] font-black text-xs flex items-center gap-1 transition-all ${
                              comboStreak >= 2
                                ? 'bg-[#FFB800] scale-105 shadow-[2px_2px_0px_#111]'
                                : 'bg-[#FFFDF5]'
                            }`}
                          >
                            <Flame className="w-4 h-4 text-[#FF3366] fill-[#FF3366]" />
                            {comboStreak}x Streak
                          </div>

                          {/* XP Counter */}
                          <div className="px-3 py-1 rounded-xl bg-[#00E5FF] border-2 border-[#111] font-black text-xs">
                            ⚡ {xpPoints} XP
                          </div>

                          {q.isDealbreaker && (
                            <span className="px-3 py-1 rounded-xl bg-[#FF3366] text-white border-2 border-[#111] font-black text-xs animate-pulse">
                              ⚠️ DEALBREAKER
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-3.5 rounded-full bg-[#FFFDF5] border-2 border-[#111] overflow-hidden mb-5">
                        <div
                          className="h-full bg-[#B8FF01] border-r-2 border-[#111] transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Question Banner with Real Photography */}
                      <div className="question-banner relative min-h-[220px] sm:min-h-0 h-auto sm:h-36 rounded-2xl border-[3px] border-[#111] overflow-hidden mb-5 bg-neutral-900">
                        <OnlineQuestionBanner
                          src={q.bannerImg}
                          query={q.imageQuery || `${q.category} ${q.en}`}
                          alt={q.category}
                          className="w-full h-full object-cover opacity-65"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/25 p-3 sm:p-4 flex flex-col justify-end gap-2">
                          <span className="text-[11px] font-black uppercase text-[#B8FF01] tracking-wider">
                            {q.category}
                          </span>
                          <h2 className="text-white text-lg sm:text-2xl font-black leading-snug break-words">
                            {formatQuestionText(
                              lang === 'en' ? q.en : q.desi,
                              activeQuiz.creatorName,
                              activeQuiz.pronoun
                            )}
                          </h2>
                        </div>
                      </div>

                      {/* 4 Interactive 3D Photo Trading Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {q.options.map((opt) => {
                          let badgeStatus = null;
                          if (lastSelectedOption && instantFeedback) {
                            if (opt.id === q.correctOptionId) badgeStatus = 'correct';
                            else if (opt.id === lastSelectedOption) badgeStatus = 'wrong';
                          }
                          return (
                            <TiltTradingCard
                              key={opt.id}
                              opt={opt}
                              lang={lang}
                              creatorName={activeQuiz.creatorName}
                              pronoun={activeQuiz.pronoun}
                              isSelected={lastSelectedOption === opt.id}
                              badgeStatus={badgeStatus}
                              onSelect={handleFriendPickOption}
                            />
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {playerStep === 'result' && latestAttempt && (
              /* ============================================================== */
              /* THE MOTION GRAPHICS RESULT DASHBOARD (STAMP + RADAR + GAUGE)   */
              /* ============================================================== */
              <div className="space-y-6">
                {(() => {
                  const isSafe =
                    latestAttempt.score >= activeQuiz.passScore &&
                    !latestAttempt.missedDealbreaker;
                  const radarMetrics = computeRadarMetrics(
                    activeQuiz.questions,
                    latestAttempt.answers
                  );
                  const scorePct = Math.round((latestAttempt.score / latestAttempt.total) * 100);

                  return (
                    <>
                      {/* Giant Verdict Hero Banner with Animated Physics Rubber Stamp */}
                      <div
                        className={`relative overflow-hidden border-[3px] border-[#111] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#111] ${
                          isSafe ? 'bg-[#B8FF01]' : 'bg-[#FF3366] text-white'
                        }`}
                      >
                        {/* Animated Rubber Stamp Overlay */}
                        <div
                          style={{
                            transform: stampSlammed
                              ? 'rotate(-8deg) scale(1)'
                              : 'rotate(-25deg) scale(2.4)',
                            opacity: stampSlammed ? 1 : 0,
                            transition: 'all 380ms cubic-bezier(0.22, 1.4, 0.36, 1)'
                          }}
                          className="hidden md:flex absolute right-64 top-7 z-20 px-5 py-2 rounded-xl border-[4px] border-[#111] bg-white text-[#111] shadow-[4px_4px_0px_#111] font-black text-lg tracking-wider uppercase pointer-events-none"
                        >
                          {isSafe ? '✅ APPROVED MACHAN!' : '🚫 BLOCKED FOREVER!'}
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div>
                            <span className="inline-block px-3 py-1 rounded-full bg-[#111] text-[#B8FF01] font-black text-xs uppercase mb-2">
                              OFFICIAL SQUAD AUDIT VERDICT • #{activeQuiz.id}
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
                              {isSafe
                                ? lang === 'en'
                                  ? `CERTIFIED CHUDDY BUDDY! 🔥`
                                  : `நீ உண்மையான உயிர் நண்பன் மச்சான்! 🔥`
                                : lang === 'en'
                                ? `STRAIGHT TO THE BLOCK LIST! 🚫`
                                : `நேரா வாட்ஸ்அப் BLOCK LIST தான்! 🚫`}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="px-3 py-1 rounded-lg bg-black/20 font-black text-xs">
                                ⚡ {latestAttempt.xpEarned} XP Earned
                              </span>
                              <span className="px-3 py-1 rounded-lg bg-black/20 font-black text-xs">
                                🔥 {latestAttempt.maxStreak}x Max Streak
                              </span>
                              <span className="px-3 py-1 rounded-lg bg-black/20 font-black text-xs">
                                ⏱️ {latestAttempt.avgTimeSec}s Avg Speed
                              </span>
                            </div>
                          </div>

                          <div className="px-6 py-4 rounded-3xl bg-white text-[#111] border-[3px] border-[#111] shadow-[5px_5px_0px_#111] text-center shrink-0">
                            <div className="text-xs font-black uppercase text-neutral-500">
                              FINAL SCORE
                            </div>
                            <div className="text-4xl font-black">
                              {latestAttempt.score} / {latestAttempt.total}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t-2 border-[#111]/20">
                          <button
                            onClick={handleDownloadReceipt}
                            className="px-5 py-3 rounded-2xl bg-[#111] text-[#B8FF01] border-[2.5px] border-[#111] shadow-[3px_3px_0px_#FFF] font-black text-sm flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download Squad Receipt (PNG)
                          </button>
                          <button
                            onClick={() => {
                              sfx.click();
                              setMode('scoreboard');
                            }}
                            className="px-5 py-3 rounded-2xl bg-white text-[#111] border-[2.5px] border-[#111] font-black text-sm flex items-center gap-2"
                          >
                            <BarChart3 className="w-4 h-4" />
                            Open Squad Leaderboard & Graphs
                          </button>
                          <button
                            onClick={() => {
                              sfx.click();
                              setCreatorStep(1);
                              setMode('create');
                            }}
                            className="px-5 py-3 rounded-2xl bg-[#00E5FF] text-[#111] border-[2.5px] border-[#111] font-black text-sm flex items-center gap-2"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Create Your Own Quiz
                          </button>
                        </div>
                      </div>

                      {/* MOTION GRAPHICS ROW: 5-AXIS RADAR CHART + SPEEDOMETER GAUGE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border-[3px] border-[#111] rounded-3xl p-5 sm:p-6 shadow-[5px_5px_0px_#111] flex flex-col items-center">
                          <div className="w-full flex items-center justify-between mb-2">
                            <span className="font-black text-sm uppercase flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-[#FF3366]" />
                              5-Axis Squad Compatibility Radar
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#B8FF01] border border-[#111] font-black text-[10px]">
                              LIVE SVG GRAPH
                            </span>
                          </div>
                          <FriendshipRadarChart metrics={radarMetrics} lang={lang} />
                        </div>

                        <div className="bg-white border-[3px] border-[#111] rounded-3xl p-5 sm:p-6 shadow-[5px_5px_0px_#111] flex flex-col items-center justify-between">
                          <div className="w-full flex items-center justify-between mb-2">
                            <span className="font-black text-sm uppercase flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-[#FF3366]" />
                              Friendship Sync Speedometer
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#00E5FF] border border-[#111] font-black text-[10px]">
                              METER GAUGE
                            </span>
                          </div>
                          <div className="my-auto py-2">
                            <FriendshipSpeedometer
                              scorePct={scorePct}
                              isSafe={isSafe}
                              lang={lang}
                            />
                          </div>
                          <p className="text-xs font-bold text-neutral-600 text-center">
                            {isSafe
                              ? `${activeQuiz.creatorName} & ${latestAttempt.friendName} have certified Benchmate-level wavelength!`
                              : `Uh oh! ${latestAttempt.friendName} failed ${activeQuiz.creatorName}'s pass mark!`}
                          </p>
                        </div>
                      </div>

                      {/* RECEIPT CANVAS & PHOTO ANSWER COMPARISON */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-5 bg-white border-[3px] border-[#111] rounded-3xl p-4 shadow-[5px_5px_0px_#111] flex flex-col items-center">
                          <div className="w-full flex items-center justify-between mb-3">
                            <span className="font-black text-xs uppercase">
                              📸 Shareable IG Story Receipt
                            </span>
                            <button
                              onClick={handleDownloadReceipt}
                              className="px-3 py-1 rounded-lg bg-[#B8FF01] border-2 border-[#111] font-black text-xs flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> Save PNG
                            </button>
                          </div>
                          <canvas
                            ref={receiptCanvasRef}
                            className="w-full max-w-[340px] h-auto rounded-xl border-2 border-[#111]"
                          />
                        </div>

                        <div className="lg:col-span-7 bg-white border-[3px] border-[#111] rounded-3xl p-5 sm:p-6 shadow-[5px_5px_0px_#111]">
                          <h3 className="font-black text-lg mb-4">
                            🃏 Visual Trading Card Answer Breakdown
                          </h3>
                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {activeQuiz.questions.map((q, idx) => {
                              const pickedId = latestAttempt.answers[q.id];
                              const pickedOpt = q.options.find((o) => o.id === pickedId);
                              const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
                              const isRight = pickedId === q.correctOptionId;

                              return (
                                <div
                                  key={q.id}
                                  className={`p-3.5 rounded-2xl border-2 border-[#111] flex items-center gap-3.5 ${
                                    isRight ? 'bg-[#B8FF01]/20' : 'bg-[#FF3366]/10'
                                  }`}
                                >
                                  <img
                                    src={(correctOpt || q.options[0]).img}
                                    alt={q.category} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
                                    className="w-16 h-16 rounded-xl object-cover border-2 border-[#111] shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-black text-xs uppercase text-neutral-600">
                                        Q{idx + 1} • {q.category}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-[#111] ${
                                          isRight ? 'bg-[#B8FF01]' : 'bg-[#FF3366] text-white'
                                        }`}
                                      >
                                        {isRight ? 'MATCH ✅' : 'MISS ❌'}
                                      </span>
                                    </div>
                                    <div className="text-xs font-bold mt-1">
                                      <span className="font-black">Your Pick: </span>
                                      {pickedOpt
                                        ? `${pickedOpt.emoji} ${
                                            lang === 'en' ? pickedOpt.en : pickedOpt.desi
                                          }`
                                        : 'None'}
                                    </div>
                                    {!isRight && correctOpt && (
                                      <div className="text-xs font-black text-emerald-800 mt-0.5">
                                        {activeQuiz.creatorName}&apos;s Pick: {correctOpt.emoji}{' '}
                                        {lang === 'en' ? correctOpt.en : correctOpt.desi}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* VIEW 4: MOTION GRAPHICS ANALYTICS & LIVE SCOREBOARD */}
        {/* ================================================================== */}
        {mode === 'scoreboard' && (
          <div className="space-y-6">
            <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 shadow-[6px_6px_0px_#111]">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3.5">
                  <img
                    src={activeQuiz.customAvatarUrl || activeAvatar.img}
                    alt={activeQuiz.creatorName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
                    className="w-16 h-16 rounded-2xl object-cover border-[3px] border-[#111] shadow-[3px_3px_0px_#111]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#B8FF01] border-2 border-[#111] font-black text-xs">
                        #{activeQuiz.id}
                      </span>
                      <span className="text-xs font-black text-neutral-500 uppercase">
                        Pass Cut-Off: {activeQuiz.passScore}/10
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black">
                      {activeQuiz.creatorName}&apos;s Squad Analytics & Board
                    </h1>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">


                  {isOwnerUnlocked ? (
                    <span className="px-3.5 py-2 rounded-xl bg-[#B8FF01] border-2 border-[#111] font-black text-xs flex items-center gap-1.5">
                      <Unlock className="w-4 h-4" /> Admin Unlocked (PIN: {activeQuiz.pin})
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        sfx.click();
                        setShowPinModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#FFB800] border-2 border-[#111] font-black text-xs flex items-center gap-1.5"
                    >
                      <Lock className="w-4 h-4" /> Admin PIN
                    </button>
                  )}
                </div>
              </div>

              {/* MOTION GRAPHICS ANALYTICS SECTION (RADAR + HORIZONTAL ACCURACY BARS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-7">
                {/* Left: Squad Average Radar */}
                <div className="lg:col-span-5 p-5 rounded-3xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[4px_4px_0px_#111] flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="font-black text-xs uppercase">
                      🕸️ Whole Squad Vibe Radar
                    </span>
                    <span className="font-black text-xs text-[#FF3366]">
                      Avg: {boardAnalytics.avgScore}/10
                    </span>
                  </div>
                  <FriendshipRadarChart metrics={boardAnalytics.avgRadar} lang={lang} />
                </div>

                {/* Right: Question-by-Question Animated Accuracy Bar Graph */}
                <div className="lg:col-span-7 p-5 rounded-3xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[4px_4px_0px_#111]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-xs uppercase flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#FF3366]" />
                      Question-by-Question Squad Accuracy Graph
                    </span>
                    <span className="text-[11px] font-bold text-neutral-500">
                      Which question trapped your gang?
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                    {boardAnalytics.questionStats.map((qs) => (
                      <div key={qs.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span className="truncate">
                            Q{qs.idx}. {qs.category}{' '}
                            <span className="text-neutral-500 font-bold">({qs.rightLabel})</span>
                          </span>
                          <span
                            className={
                              qs.pct >= 70
                                ? 'text-emerald-700'
                                : qs.pct <= 40
                                ? 'text-[#FF3366]'
                                : 'text-amber-700'
                            }
                          >
                            {qs.pct}% Guessed Right
                          </span>
                        </div>
                        <div className="w-full h-3.5 rounded-lg bg-white border-2 border-[#111] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 ${
                              qs.pct >= 70
                                ? 'bg-[#B8FF01]'
                                : qs.pct <= 40
                                ? 'bg-[#FF3366]'
                                : 'bg-[#FFB800]'
                            }`}
                            style={{ width: `${Math.max(qs.pct, 6)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin Live Pass Cut-Off Slider */}
              {isOwnerUnlocked && (
                <div className="mb-5 p-3.5 rounded-2xl bg-[#FFFDF5] border-2 border-dashed border-[#111] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#FF3366]" />
                    Admin Control: Change Pass Score ({activeQuiz.passScore}/10) to dynamically
                    re-filter the Block List:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[5, 6, 7, 8, 9].map((val) => (
                      <button
                        key={val}
                        onClick={async () => {
                          sfx.click();
                          await saveQuizToCloud({ ...activeQuiz, passScore: val });
                        }}
                        className={`w-8 h-8 rounded-lg border-2 border-[#111] font-black text-xs ${
                          activeQuiz.passScore === val ? 'bg-[#FF3366] text-white' : 'bg-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {[
                  { id: 'all', label: `All Squad (${boardAnalytics.total})` },
                  { id: 'safe', label: `Approved Machans ✅ (${boardAnalytics.safeCount})` },
                  { id: 'blocked', label: `Block List 🚫 (${boardAnalytics.blockCount})` },
                  { id: 'dealbreaker', label: 'Missed Dealbreaker ⚠️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      sfx.click();
                      setBoardFilter(tab.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl border-2 border-[#111] font-black text-xs ${
                      boardFilter === tab.id
                        ? 'bg-[#111] text-[#B8FF01] shadow-[2px_2px_0px_#FF3366]'
                        : 'bg-[#FFFDF5]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Leaderboard Cards with Real Avatars, Streak & XP */}
              <div className="space-y-3">
                {filteredAttempts.map((att, idx) => {
                  const isSafe =
                    att.score >= activeQuiz.passScore && !att.missedDealbreaker;
                  const rel =
                    RELATIONSHIP_TAGS.find((r) => r.id === att.relationshipId) ||
                    RELATIONSHIP_TAGS[0];
                  const avObj =
                    AVATAR_BADGES.find((a) => a.id === att.avatarId) ||
                    AVATAR_BADGES[idx % AVATAR_BADGES.length];

                  return (
                    <div
                      key={att.id}
                      className="p-4 rounded-2xl bg-[#FFFDF5] border-[3px] border-[#111] shadow-[3px_3px_0px_#111] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={avObj.img}
                            alt={att.friendName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-[#111]"
                          />
                          <span
                            className={`absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md border border-[#111] font-black text-[10px] ${
                              isSafe ? 'bg-[#B8FF01]' : 'bg-[#FF3366] text-white'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-base">{att.friendName}</span>
                            <span className="px-2 py-0.5 rounded-full bg-white border border-[#111] font-bold text-[11px]">
                              {rel.emoji} {lang === 'en' ? rel.en : rel.desi}
                            </span>
                            {att.maxStreak >= 3 && (
                              <span className="px-2 py-0.5 rounded-full bg-[#FFB800] border border-[#111] font-black text-[10px]">
                                🔥 {att.maxStreak}x Streak
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-neutral-600 mt-0.5">
                            {isSafe ? '✅ Approved Chuddy Buddy' : '🚫 On the Block List'} • ⚡{' '}
                            {att.xpEarned || att.score * 110} XP • ⏱️ {att.avgTimeSec || 4.2}s avg
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <div
                          className={`px-3.5 py-1.5 rounded-xl border-2 border-[#111] font-black text-sm ${
                            isSafe ? 'bg-[#B8FF01]' : 'bg-[#FF3366] text-white'
                          }`}
                        >
                          {att.score} / {att.total}
                        </div>

                        <button
                          onClick={() => {
                            sfx.click();
                            setInspectedAttempt(att);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#111] font-black text-xs flex items-center gap-1 hover:bg-[#00E5FF]/30"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>

                        {isOwnerUnlocked && (
                          <button
                            onClick={async () => {
                              sfx.click();
                              const updated = {
                                ...activeQuiz,
                                attempts: activeQuiz.attempts.filter((a) => a.id !== att.id)
                              };
                              await saveQuizToCloud(updated);
                              showToast('Entry removed!', 'info');
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-[#FF3366] hover:text-white border-2 border-[#111]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: CUSTOM QUESTION BUILDER */}
      {/* ==================================================================== */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 max-w-lg w-full shadow-[8px_8px_0px_#111]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl">✍️ Add College Inside-Joke Question</h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 rounded-lg border-2 border-[#111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomQuestion} className="space-y-4">
              <input
                type="text"
                value={customQText}
                onChange={(e) => setCustomQText(e.target.value)}
                placeholder="e.g., What happened during our IV trip to Ooty?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF5] border-2 border-[#111] font-bold text-sm"
              />
              <div className="space-y-2">
                {customOpts.map((o, idx) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={o.emoji}
                      onChange={(e) => {
                        const copy = [...customOpts];
                        copy[idx].emoji = e.target.value;
                        setCustomOpts(copy);
                      }}
                      className="w-12 text-center py-2 rounded-xl bg-[#FFFDF5] border-2 border-[#111]"
                    />
                    <input
                      type="text"
                      value={o.text}
                      onChange={(e) => {
                        const copy = [...customOpts];
                        copy[idx].text = e.target.value;
                        setCustomOpts(copy);
                      }}
                      placeholder={`Option ${idx + 1}...`}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FFFDF5] border-2 border-[#111] font-bold text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#B8FF01] border-[3px] border-[#111] font-black text-sm"
              >
                Save Custom Card Question ✅
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: INSPECT FRIEND'S 10 ANSWERS + INDIVIDUAL RADAR */}
      {/* ==================================================================== */}
      {inspectedAttempt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 max-w-2xl w-full shadow-[8px_8px_0px_#111] max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#111]">
              <div>
                <h3 className="font-black text-xl">
                  🔍 {inspectedAttempt.friendName}&apos;s Report ({inspectedAttempt.score}/{inspectedAttempt.total})
                </h3>
                <p className="text-xs font-bold text-neutral-600">
                  Max Streak: 🔥 {inspectedAttempt.maxStreak || 3}x • Speed:{' '}
                  {inspectedAttempt.avgTimeSec || 4.0}s
                </p>
              </div>
              <button
                onClick={() => setInspectedAttempt(null)}
                className="p-1.5 rounded-lg border-2 border-[#111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 my-4 pr-1">
              {activeQuiz.questions.map((q, idx) => {
                const pickedId = inspectedAttempt.answers?.[q.id];
                const pickedOpt = q.options.find((o) => o.id === pickedId);
                const rightOpt = q.options.find((o) => o.id === q.correctOptionId);
                const isRight = pickedId === q.correctOptionId;

                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border-2 border-[#111] flex items-center gap-3 text-xs ${
                      isRight ? 'bg-[#B8FF01]/25' : 'bg-[#FF3366]/15'
                    }`}
                  >
                    <img
                      src={(pickedOpt || q.options[0]).img}
                      alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.opacity = '0'; }}
                      className="w-12 h-12 rounded-lg object-cover border border-[#111] shrink-0"
                    />
                    <div className="flex-1">
                      <div className="font-black">
                        Q{idx + 1} ({q.category}):
                      </div>
                      <div>
                        <span className="font-black">Picked: </span>
                        {pickedOpt
                          ? `${pickedOpt.emoji} ${lang === 'en' ? pickedOpt.en : pickedOpt.desi}`
                          : 'None'}{' '}
                        {isRight ? '✅' : '❌'}
                      </div>
                      {!isRight && rightOpt && (
                        <div className="font-bold text-emerald-900">
                          Correct: {rightOpt.emoji} {lang === 'en' ? rightOpt.en : rightOpt.desi}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setInspectedAttempt(null)}
              className="w-full py-2.5 rounded-xl bg-[#111] text-white font-black text-sm"
            >
              Close Report
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: CREATOR PIN UNLOCK */}
      {/* ==================================================================== */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 max-w-sm w-full shadow-[8px_8px_0px_#111]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg">🔐 Creator Admin PIN</h3>
              <button
                onClick={() => setShowPinModal(false)}
                className="p-1 rounded-lg border-2 border-[#111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-neutral-600 mb-4">
              Enter the creator PIN saved when this quiz was published.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pinInput.trim() === activeQuiz.pin) {
                  sfx.fanfare();
                  setUnlockedQuizzes((prev) => ({ ...prev, [activeQuiz.id]: true }));
                  setShowPinModal(false);
                  setPinInput('');
                  showToast('Admin Mode Unlocked! 🔓', 'success');
                } else {
                  sfx.wrong();
                  showToast('Incorrect PIN. Try the PIN saved by the quiz creator.', 'error');
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter creator PIN"
                className="w-full text-center font-mono font-black text-2xl py-2.5 rounded-xl bg-[#FFFDF5] border-[3px] border-[#111]"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#B8FF01] border-[3px] border-[#111] font-black text-sm"
              >
                Unlock Controls
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: OPEN QUIZ BY CODE */}
      {/* ==================================================================== */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-[#111] rounded-3xl p-6 max-w-sm w-full shadow-[8px_8px_0px_#111]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg">🔎 Enter Squad Quiz Code</h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1 rounded-lg border-2 border-[#111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = codeSearchInput.replace('#', '').trim().toUpperCase();
                const match = Object.values(quizzesMap).find((q) => q.id !== 'Y0TJMqL' && q.id.toUpperCase() === clean);
                if (match) {
                  sfx.correct(2);
                  setActiveQuizId(match.id);
                  setPlayerStep('entry');
                  setMode('play');
                  setShowCodeModal(false);
                  setCodeSearchInput('');
                  showToast(`Loaded ${match.creatorName}'s Squad Quiz!`, 'success');
                } else {
                  sfx.wrong();
                  showToast('Code not found! check the quiz code and try again', 'error');
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={codeSearchInput}
                onChange={(e) => setCodeSearchInput(e.target.value)}
                placeholder="Enter quiz code"
                className="w-full text-center font-mono font-black text-xl py-2.5 rounded-xl bg-[#FFFDF5] border-[3px] border-[#111]"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#00E5FF] border-[3px] border-[#111] font-black text-sm"
              >
                Load Quiz →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}