'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { playClick, playSuccess } from '@/lib/sounds';
import { usePet } from '@/hooks/usePet';
import ChibiCompanionSprite, { CompanionAction } from '@/components/gamification/ChibiCompanionSprite';
import CompanionDrawer from '@/components/pets/CompanionDrawer';
import { playCompanionVocal } from '@/lib/companionAudio';
import { PetSpecies } from '@/types';

// Shared canvas cache to store processed transparent cropped canvas elements globally (across games/pages)
export const croppedCanvasCache: Record<string, HTMLCanvasElement> = {};

// Helper function to load, transparent-key, and crop a sprite (runs exactly once per skin in browser session)
export function getCroppedCanvas(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    if (croppedCanvasCache[src]) {
      resolve(croppedCanvasCache[src]);
      return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        reject(new Error("Could not get temporary context"));
        return;
      }
      
      tempCtx.drawImage(img, 0, 0);
      const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;

      // Find bounding box coordinates of non-black/colored pixels
      let minX = img.width, minY = img.height, maxX = 0, maxY = 0, hasPixels = false;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const idx = (y * img.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          if (r > 30 || g > 30 || b > 30) {
            hasPixels = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasPixels) {
        minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1;
      }

      const spriteW = maxX - minX + 1;
      const spriteH = maxY - minY + 1;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = spriteW;
      finalCanvas.height = spriteH;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        reject(new Error("Could not get final context"));
        return;
      }

      finalCtx.drawImage(img, minX, minY, spriteW, spriteH, 0, 0, spriteW, spriteH);

      // Key out near-black pixels to make background fully transparent
      const finalData = finalCtx.getImageData(0, 0, spriteW, spriteH);
      const pixels = finalData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] < 30 && pixels[i + 1] < 30 && pixels[i + 2] < 30) {
          pixels[i + 3] = 0;
        }
      }
      finalCtx.putImageData(finalData, 0, 0);

      croppedCanvasCache[src] = finalCanvas;
      resolve(finalCanvas);
    };
    img.onerror = (e) => reject(e);
  });
}

// Helper component to load a sprite and render it transparently
interface TransparentSpriteProps {
  src: string;
  className?: string;
}

// Wrapped in React.memo to prevent unnecessary re-renders when parent states update
export const TransparentSprite = React.memo(function TransparentSprite({ src, className }: TransparentSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    getCroppedCanvas(src).then((processedCanvas) => {
      canvas.width = processedCanvas.width;
      canvas.height = processedCanvas.height;
      ctx.drawImage(processedCanvas, 0, 0);
    }).catch(() => { /* fallback ignored */ });
  }, [src]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      style={{ imageRendering: 'pixelated' }} 
    />
  );
});

// Pixel Pet Companion Component
interface PixelPetProps {
  coins: number;
  addCoins: (amount: number) => Promise<void>;
}

export default function PixelPet({ coins, addCoins }: PixelPetProps) {
  const pathname = usePathname() || '';
  const [x, setX] = useState(50); // percentage (2 to 94)
  const [platform, setPlatform] = useState<'header' | 'footer'>('header'); // header border or footer
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isJumping, setIsJumping] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  
  // Remade High-Fidelity Skins: Cyber Cat, Scholar Owl, Emerald Dragon
  const skins = ['/pet_cat_remake.png', '/questie_remake.png', '/pet_dragon_remake.png'];
  const skinNames = ['Cyber Cat', 'Scholar Owl', 'Emerald Dragon'];
  // Pet visibility toggle (Off / On) with localStorage persistence
  const [petVisible, setPetVisible] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sq-pixel-pet-visible');
      if (saved !== null) setPetVisible(saved === 'true');
    } catch { /* ignore */ }
  }, []);

  const togglePetVisible = () => {
    setPetVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sq-pixel-pet-visible', String(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const [skinIndex, setSkinIndex] = useState(0);

  // Dialog bubble
  const [dialogue, setDialogue] = useState("Hey adventurer! Let's study together! 🐾");
  const [showBubble, setShowBubble] = useState(true);

  // Auto-dismiss dialogue bubble after 4 seconds on both laptop and mobile
  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => {
        setShowBubble(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showBubble, dialogue]);

  const { pet, updatePet } = usePet();

  // Stats (Level, EXP)
  const [stats, setStats] = useState({ level: 1, exp: 0 });

  // Sync stats from Firestore pet when it updates
  useEffect(() => {
    if (pet) {
      let currentLevel = pet.level ?? 1;
      let currentExp = pet.exp ?? 0;

      try {
        const stored = localStorage.getItem('sq-pixel-pet-stats');
        if (stored) {
          const parsed = JSON.parse(stored);
          const localLevel = parsed.level ?? 1;
          const localExp = parsed.exp ?? 0;

          // If local stats are higher, sync them up to Firestore to preserve progress
          if (localLevel > currentLevel || (localLevel === currentLevel && localExp > currentExp)) {
            currentLevel = localLevel;
            currentExp = localExp;
            updatePet({ level: localLevel, exp: localExp });
          }
        }
      } catch (e) { /* ignore */ }

      setStats({
        level: currentLevel,
        exp: currentExp
      });
      // Respect local skin choice if user previously chose Dino (index 2) or another skin
      try {
        const storedSkin = localStorage.getItem('sq-pixel-pet-skin');
        if (storedSkin !== null) {
          const sIndex = parseInt(storedSkin, 10);
          if (!isNaN(sIndex) && sIndex >= 0 && sIndex < skins.length) {
            setSkinIndex(sIndex);
            const localSpecies: 'cat' | 'owl' | 'dragon' = sIndex === 0 ? 'cat' : sIndex === 1 ? 'owl' : 'dragon';
            if (pet.species !== localSpecies) {
              updatePet({ species: localSpecies });
            }
          } else {
            const speciesIndex = pet.species === 'cat' ? 0 : pet.species === 'owl' ? 1 : 2;
            setSkinIndex(speciesIndex);
          }
        } else {
          const speciesIndex = pet.species === 'cat' ? 0 : pet.species === 'owl' ? 1 : 2;
          setSkinIndex(speciesIndex);
        }
      } catch {
        const speciesIndex = pet.species === 'cat' ? 0 : pet.species === 'owl' ? 1 : 2;
        setSkinIndex(speciesIndex);
      }
    }
  }, [pet, updatePet]);

  // Load stats from localStorage (as fallback when offline or no pet created)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sq-pixel-pet-stats');
      if (stored && !pet) {
        setStats(JSON.parse(stored));
      }
      const storedSkin = localStorage.getItem('sq-pixel-pet-skin');
      if (storedSkin && !pet) {
        setSkinIndex(parseInt(storedSkin) || 0);
      }
      const storedPlatform = localStorage.getItem('sq-pixel-pet-platform');
      if (storedPlatform) {
        setPlatform(storedPlatform as 'header' | 'footer');
      }
    } catch (e) { /* ignore */ }
  }, [pet]);

  const saveStats = async (newStats: { level: number; exp: number }) => {
    setStats(newStats);
    try {
      localStorage.setItem('sq-pixel-pet-stats', JSON.stringify(newStats));
      if (pet) {
        await updatePet({
          level: newStats.level,
          exp: newStats.exp
        });
      }
    } catch (e) { /* ignore */ }
  };

  const triggerJump = () => {
    if (isJumping) return;
    setIsJumping(true);
    playClick();
    
    // Parabolic horizontal jump push
    setX((prev) => {
      const step = direction === 'left' ? -5 : 5;
      return Math.max(2, Math.min(94, prev + step));
    });

    setTimeout(() => {
      setIsJumping(false);
    }, 450);
  };

  const speak = (msg: string) => {
    setDialogue(msg);
    setShowBubble(true);
  };

  // Compile context-aware dynamic dialogue messages based on navigation, skin, and time of day
  const getDynamicMessage = (): string[] => {
    const hour = new Date().getHours();
    
    // 1. Time-specific checks (25% chance)
    if (Math.random() < 0.25) {
      if (hour >= 22 || hour < 4) {
        return [
          "Burning the midnight oil? Don't stay up too late! 🌙",
          "Quiet night study sessions are the best. 🦉",
          "Remember to rest, sleep is crucial for memory! 💤",
          "Hush... deep studying in progress! 🤫"
        ];
      }
      if (hour >= 5 && hour < 9) {
        return [
          "Good morning! Early bird gets the EXP! ☀️",
          "Time for some quiet morning focus! ☕",
          "A fresh day, a fresh study quest! ⚔️",
          "Stretch your limbs, let's start the day strong! 🌅"
        ];
      }
    }

    // 2. Path/Navigation-specific checks
    if (pathname.includes('/notes')) {
      return [
        "Writing down wisdom? Your notes look amazing! 📝",
        "Let's summarize this key concept! 💡",
        "Need a reference? Search using Questie search! 🔍",
        "Keep jotting! Clear notes lead to clear grades. 📚"
      ];
    }
    if (pathname.includes('/tasks')) {
      return [
        "Ready to check off some goals today? 🎯",
        "A clean task list is a clean mind! 📜",
        "Which quest are we conquering next? ⚔️",
        "Crossing off a task feels so satisfying! Check!"
      ];
    }
    if (pathname.includes('/habits')) {
      return [
        "Building habits is how legends are made! 🌟",
        "Consistency beats intensity. Keep the streak going! 🔥",
        "A habit card a day keeps the slacking away! 🐾",
        "Little steps every day lead to giant leaps! 🚀"
      ];
    }
    if (pathname.includes('/shop')) {
      return [
        "Ooh, shopping! Can we buy some accessories? 🛒",
        "Look at all these premium goodies! 🪙",
        "Spend those hard-earned Quest Coins! 💰",
        "Study hard, shop harder! 🛍️"
      ];
    }
    if (pathname.includes('/arcade')) {
      return [
        "Study hard, play hard! Good luck in the dungeon! ⚔️",
        "A little brain break is good for focus! 🎮",
        "Trivia dungeon? Time to show off your smarts! 🧠",
        "Hehe, let's beat the high score! 🏆"
      ];
    }
    if (pathname.includes('/whiteboard')) {
      return [
        "Sketching out ideas? Draw me a cookie! 🎨",
        "Visual learning is super powerful! 🖼️",
        "A blank canvas of pure imagination! ✨"
      ];
    }
    if (pathname.includes('/timer')) {
      return [
        "Starting a Pomodoro? Let's dial in! ⏱️",
        "Focus for 25 minutes, then we play! 🍅",
        "Tick tock... stay in the zone! ⚡"
      ];
    }

    // 3. Skin-specific checks (30% chance)
    if (Math.random() < 0.3) {
      if (skinIndex === 0) { // Cat
        return [
          "Meow! Let's focus and study together! 🐱",
          "Purrr... you are doing an amazing job!",
          "I'm keeping watch. Keep studying! 🐾",
          "A cozy nap sounds nice, but let's finish this task! 💤"
        ];
      }
      if (skinIndex === 1) { // Owl
        return [
          "Hoot! Whooo is ready to study? 🦉",
          "Wise students take short breaks! 🧠",
          "Hoot! Let's fly high today! 🌟",
          "Knowledge is our greatest power! 📚"
        ];
      }
      if (skinIndex === 2) { // Dino
        return [
          "Rawr! Let's crush this study session! 🦖",
          "Dino-mite effort! I'm so proud of you!",
          "Stomp stomp... breaking through study blocks! 💥",
          "Jurassic focus mode initiated! ⚡"
        ];
      }
    }

    // 4. Default motivational / interactive dialogues
    return [
      "Focus mode active! Let's go! ⚡",
      "Don't forget to hydrate! 💧",
      "Doing great! Keep up the good work! 🌟",
      "Is it snack time yet? 🍪",
      "No slacking off! I'm watching you! 👀",
      "Leveling up is fun, but learning is better! 📚",
      "A journey of a thousand miles begins with a single quest! ⚔️",
      "Take a short deep breath! 🌸",
      "Your streak is looking strong! 🔥",
      "Need a break? Stretch your arms! 🧘",
      "You are capable of amazing things! ✨",
      "Every minute of focus counts towards success! 🎓"
    ];
  };

  // Sleep / Inactivity State
  const [isSleeping, setIsSleeping] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const isSleepingRef = useRef<boolean>(false);
  useEffect(() => { isSleepingRef.current = isSleeping; }, [isSleeping]);

  // User Inactivity & Sleep Mode Detection Effect
  useEffect(() => {
    let lastThrottled = 0;
    const updateActivity = () => {
      const now = Date.now();
      // 250ms throttle prevents 1,000Hz mouse flooding on the main UI thread
      if (now - lastThrottled < 250) return;
      lastThrottled = now;
      lastActivityRef.current = now;

      if (isSleepingRef.current) {
        setIsSleeping(false);
        const wakeMsgs = [
          "Yawn... I'm wide awake and ready to study! 🌅",
          "Stretch... let's get back to work! 🐾",
          "Hello! Ready to conquer more quests! ⚡",
        ];
        setDialogue(wakeMsgs[Math.floor(Math.random() * wakeMsgs.length)]);
        setShowBubble(true);
        triggerJump();
      }
    };

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    // Check idle status every 15 seconds: sleep after 2 minutes of inactivity or late night hours
    const checkIdleInterval = setInterval(() => {
      const now = Date.now();
      const hour = new Date().getHours();
      const isLateNight = hour >= 23 || hour < 5;
      const isIdle = now - lastActivityRef.current > 120000; // 2 minutes

      if ((isIdle || isLateNight) && !isSleepingRef.current) {
        setIsSleeping(true);
        setDialogue("Zzz... taking a cozy study nap 💤");
        setShowBubble(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(checkIdleInterval);
    };
  }, []);

  // Auto roaming (strictly horizontally along the header border line or footer line)
  useEffect(() => {
    if (!petVisible) return;

    const interval = setInterval(() => {
      if (isSleeping || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
      if (Math.random() > 0.4) return; // 60% chance to stay idle

      const rand = Math.random();
      if (rand < 0.45) {
        // Move left
        setX((prev) => Math.max(2, prev - (3 + Math.floor(Math.random() * 4))));
        setDirection('left');
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 500);
      } else if (rand < 0.90) {
        // Move right
        setX((prev) => Math.min(94, prev + (3 + Math.floor(Math.random() * 4))));
        setDirection('right');
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 500);
      } else {
        // Jump (vertical hop - lands back on border line)
        triggerJump();
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isJumping, isSleeping, petVisible]);

  const togglePlatform = () => {
    const nextPlatform = platform === 'header' ? 'footer' : 'header';
    setPlatform(nextPlatform);
    try {
      localStorage.setItem('sq-pixel-pet-platform', nextPlatform);
    } catch (e) { /* ignore */ }
    
    const msgs = nextPlatform === 'header' 
      ? ["Hup! Teleporting to the header! 🚀", "Up to the top! 🐾"] 
      : ["Wheee! Teleporting down to the footer! 🐾", "Let's hang out down here! 👇"];
    speak(msgs[Math.floor(Math.random() * msgs.length)]);
    triggerJump();
  };

  // Feed action
  const handleFeed = async () => {
    if (coins < 10) {
      speak("Oops! Cookies cost 10 coins. 🪙 Let's study to earn more!");
      toast.error("Not enough coins! 🪙");
      return;
    }

    try {
      await addCoins(-10);
      playSuccess();
      
      // Exp calculations
      let newExp = stats.exp + 25;
      let newLevel = stats.level;
      let leveledUp = false;

      if (newExp >= 100) {
        newLevel += 1;
        newExp = newExp - 100;
        leveledUp = true;
      }

      await saveStats({ level: newLevel, exp: newExp });

      if (leveledUp) {
        speak(`Yum! Level Up! Lv.${newLevel}! 🎉 I feel stronger!`);
        toast.success(`Companion leveled up to Lv.${newLevel}! 🐾`);
      } else {
        speak("Chomp chomp... delicious! 🍪 (+25 EXP)");
        toast.success("Companion fed! 🍪");
      }
      triggerJump();
    } catch (e) {
      toast.error("Feeding failed.");
    }
  };

  // Pet action
  const handlePet = () => {
    triggerJump();
    
    // Random pet message
    const petMsgs = [
      "Purrr... That feels so nice! 💖",
      "Hehe, tickles! 😊",
      "I love studying with you! 🐾",
      "You're my favorite human! ✨",
      "Let's get back to work, I believe in you!",
    ];
    const msg = petMsgs[Math.floor(Math.random() * petMsgs.length)];
    speak(msg);

    // Chance to find a coin
    if (Math.random() > 0.8) {
      addCoins(1).catch(() => {});
      toast.success("Found 1 Coin! 🪙");
    }
  };

  // Change skin
  const changeSkin = () => {
    const nextIndex = (skinIndex + 1) % skins.length;
    setSkinIndex(nextIndex);
    try {
      localStorage.setItem('sq-pixel-pet-skin', nextIndex.toString());
    } catch (e) { /* ignore */ }
    
    const nextSpecies: 'cat' | 'owl' | 'dragon' = nextIndex === 0 ? 'cat' : nextIndex === 1 ? 'owl' : 'dragon';
    if (updatePet) {
      updatePet({ species: nextSpecies });
    }

    speak(`Tada! Meet my new look! ✨ (${skinNames[nextIndex]})`);
    playClick();
  };

  const currentSpecies: PetSpecies = pet?.species || (skinIndex === 0 ? 'cat' : skinIndex === 1 ? 'owl' : 'dragon');

  const companionAction: CompanionAction = isSleeping
    ? 'sleep'
    : isJumping
    ? 'celebrate'
    : isMoving
    ? 'walk'
    : 'idle';

  const handlePetClick = () => {
    const randomMsgs = getDynamicMessage();
    const randomMsg = randomMsgs[Math.floor(Math.random() * randomMsgs.length)];
    speak(randomMsg);
    triggerJump();
    playCompanionVocal(currentSpecies);
  };

  // Position settings:
  // - On mobile & desktop floor rail, stands at bottom: 58px (directly on top of bottom nav bar)
  // - In header mode, stands along the top header bar with safe top clearance
  const positionStyle: React.CSSProperties = platform === 'header' 
    ? {
        top: '4px',
        left: `${x}%`,
      }
    : {
        bottom: '58px',
        left: `${x}%`,
      };

  return (
    <>
      {/* Global Viewport Pet Wrapper — Non-blocking click-through for site content underneath */}
      {petVisible && (
        <div 
          className="fixed transition-all duration-300 ease-out z-30 select-none pointer-events-none"
          style={{
            ...positionStyle,
            // In header mode, hop downward into visible viewport to prevent clipping against the top browser frame.
            // In footer mode, hop upward away from the bottom dock.
            transform: `translateY(${isJumping ? (platform === 'header' ? 10 : -22) : 0}px)`,
            transitionProperty: 'left, bottom, top, transform',
            transitionDuration: isJumping ? '0.2s' : '0.35s',
          }}
        >
          {/* Dialogue Bubble — Auto-dismisses after 4s */}
          <AnimatePresence>
            {showBubble && (
              platform === 'header' ? (
                // Display bubble BELOW the pet in header mode to prevent clipping off the top edge
                <motion.div 
                  className="absolute top-20 left-1/2 -translate-x-1/2 w-44 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] font-semibold p-2 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm z-30 text-center pointer-events-none"
                  style={{ transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, y: -10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.8 }}
                >
                  {dialogue}
                  {/* Pointer indicator pointing UP */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-900/95 dark:border-b-slate-950/95" />
                </motion.div>
              ) : (
                // Display bubble ABOVE the pet in footer mode
                <motion.div 
                  className="absolute bottom-15 left-1/2 -translate-x-1/2 w-44 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] font-semibold p-2 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm z-30 text-center pointer-events-none"
                  style={{ transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                >
                  {dialogue}
                  {/* Pointer indicator pointing DOWN */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95 dark:border-t-slate-950/95" />
                </motion.div>
              )
            )}
          </AnimatePresence>

          {/* Pet Sprite — Clickable interactive target */}
          <div 
            onClick={handlePetClick}
            className="cursor-pointer group flex flex-col items-center justify-center relative pointer-events-auto"
          >
            {/* Pet Indicator Name: in header mode appears below pet to prevent off-screen clipping */}
            <span 
              className={`text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity ${
                platform === 'header' ? 'order-2 mt-1' : 'order-1 mb-1'
              }`}
            >
              {pet ? pet.name : skinNames[skinIndex]} (Lv.{stats.level}) {isSleeping ? '😴' : ''}
            </span>
            <div className={`hover:scale-110 active:scale-95 transition-transform filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] ${
              platform === 'header' ? 'order-1' : 'order-2'
            }`}>
              <ChibiCompanionSprite
                species={currentSpecies}
                action={companionAction}
                size={58}
                direction={direction}
                isSquishing={false}
                bounceDirection={platform === 'header' ? 'down' : 'up'}
                showShadow={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Companion Hub Launcher Button */}
      <div className="fixed bottom-24 md:bottom-20 right-4 z-30">
        <motion.button 
          onClick={() => { setHudOpen(true); playClick(); }}
          className="w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all relative z-[1002] border border-white/20 cursor-pointer bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(99,102,241,0.4)]"
          whileTap={{ scale: 0.9 }}
          title="Open Companion Hub"
        >
          <span className="text-xl">🐾</span>
        </motion.button>
      </div>

      {/* Production-Grade Companion iOS Drawer & Quick-Dock */}
      <CompanionDrawer open={hudOpen} onOpenChange={setHudOpen} />
    </>
  );
}

// Global reusable component to display a pet companion as a 2.5D Chibi Sprite
// Wrapped in React.memo to prevent unnecessary re-renders in list displays (e.g. Pets page)
export const PixelPetSprite = React.memo(function PixelPetSprite({ 
  species, 
  stage, 
  className = "w-16 h-16" 
}: { 
  species: string; 
  stage: number; 
  className?: string; 
}) {
  const normSpecies: PetSpecies = 
    species === 'cat' ? 'cat' : 
    species === 'dragon' ? 'dragon' : 
    species === 'fox' ? 'fox' : 
    species === 'bunny' ? 'bunny' : 'owl';

  const size = stage === 0 ? 36 : stage === 1 ? 48 : stage === 2 ? 60 : 72;

  return (
    <span className={`inline-flex items-center justify-center relative overflow-visible ${className}`}>
      <ChibiCompanionSprite
        species={normSpecies}
        size={size}
        action={stage === 0 ? 'sleep' : 'idle'}
        showShadow={false}
        showAura={stage === 4}
      />
      {stage === 0 && (
        <span className="absolute bottom-0 right-0 text-xs">🥚</span>
      )}
    </span>
  );
});
