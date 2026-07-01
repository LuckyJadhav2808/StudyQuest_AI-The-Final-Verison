'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { playClick, playSuccess } from '@/lib/sounds';

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
  const [hudOpen, setHudOpen] = useState(false);
  
  // Skins: Cat, Owl, Dino
  const skins = ['/pet_cat.png', '/pet_owl.png', '/pet_dino.png'];
  const skinNames = ['Pixel Cat', 'Pixel Owl', 'Pixel Dino'];
  const [skinIndex, setSkinIndex] = useState(0);

  // Dialog bubble
  const [dialogue, setDialogue] = useState("Hey adventurer! Let's study together! 🐾");
  const [showBubble, setShowBubble] = useState(true);

  // Stats (Level, EXP)
  const [stats, setStats] = useState({ level: 1, exp: 0 });

  // Load stats from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sq-pixel-pet-stats');
      if (stored) {
        setStats(JSON.parse(stored));
      }
      const storedSkin = localStorage.getItem('sq-pixel-pet-skin');
      if (storedSkin) {
        setSkinIndex(parseInt(storedSkin) || 0);
      }
      const storedPlatform = localStorage.getItem('sq-pixel-pet-platform');
      if (storedPlatform) {
        setPlatform(storedPlatform as 'header' | 'footer');
      }
    } catch (e) { /* ignore */ }
  }, []);

  const saveStats = (newStats: { level: number; exp: number }) => {
    setStats(newStats);
    try {
      localStorage.setItem('sq-pixel-pet-stats', JSON.stringify(newStats));
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
    }, 300);
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

  // Auto roaming (strictly horizontally along the header border line or footer line)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) return; // 60% chance to stay idle

      const rand = Math.random();
      if (rand < 0.4) {
        // Move left
        setX((prev) => Math.max(2, prev - (3 + Math.floor(Math.random() * 4))));
        setDirection('left');
      } else if (rand < 0.8) {
        // Move right
        setX((prev) => Math.min(94, prev + (3 + Math.floor(Math.random() * 4))));
        setDirection('right');
      } else if (rand < 0.92) {
        // Jump (vertical hop - lands back on border line)
        triggerJump();
      } else {
        // Teleport platform (header <-> footer)
        const nextPlatform = platform === 'header' ? 'footer' : 'header';
        setPlatform(nextPlatform);
        try {
          localStorage.setItem('sq-pixel-pet-platform', nextPlatform);
        } catch (e) { /* ignore */ }
        
        // Pick from dynamic dialogues upon teleportation
        const msgs = nextPlatform === 'header' 
          ? ["Hup! Exploring the header! 🚀", "Up to the header we go! 🐾"] 
          : ["Wheee! Dropping down to the footer! 🐾", "Let's hang out down here! 👇"];
        speak(msgs[Math.floor(Math.random() * msgs.length)]);
        triggerJump();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isJumping, platform]);

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

      saveStats({ level: newLevel, exp: newExp });

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
    
    speak(`Tada! Meet my new look! ✨`);
    playClick();
  };

  const handlePetClick = () => {
    const randomMsgs = getDynamicMessage();
    const randomMsg = randomMsgs[Math.floor(Math.random() * randomMsgs.length)];
    speak(randomMsg);
    triggerJump();
  };

  // Position settings:
  // - Pet height is 72px (h-18)
  // - Header bottom line is at top: 64px.
  // - Footer bottom line is at bottom: 0px.
  const positionStyle: React.CSSProperties = platform === 'header' 
    ? {
        top: '64px',
        left: `${x}%`,
        marginTop: '-72px', // stands exactly on the bottom border line of the header (64px)
      }
    : {
        bottom: '0px',
        left: `${x}%`,
        marginBottom: '0px', // stands exactly on the bottom border line of the footer (0px)
      };

  return (
    <>
      {/* Global Viewport Pet Wrapper */}
      <div 
        className="fixed transition-all duration-305 ease-out z-[60] select-none"
        style={{
          ...positionStyle,
          transform: `translateY(${isJumping ? -80 : 0}px)`,
          transitionProperty: 'left, bottom, top, transform',
          transitionDuration: isJumping ? '0.15s' : '0.3s',
        }}
      >
        {/* Dialogue Bubble */}
        <AnimatePresence>
          {showBubble && (
            platform === 'header' ? (
              // Display bubble BELOW the pet in header mode to prevent clipping off the top edge
              <motion.div 
                className="absolute top-20 left-1/2 -translate-x-1/2 w-44 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] font-semibold p-2 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm z-50 text-center pointer-events-none"
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
                className="absolute bottom-15 left-1/2 -translate-x-1/2 w-44 bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] font-semibold p-2 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm z-50 text-center pointer-events-none"
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

        {/* Pet Sprite */}
        <div 
          onClick={handlePetClick}
          className="cursor-pointer group flex flex-col items-center justify-center relative"
        >
          {/* Pet Indicator Name */}
          <span 
            className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-555 bg-slate-105 dark:bg-slate-900/60 px-1.5 py-0.5 rounded-full mb-1 border border-slate-200/50 dark:border-slate-800/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {skinNames[skinIndex]} (Lv.{stats.level})
          </span>
          <span
            className="inline-block hover:scale-110 transition-transform"
            style={{ transform: `scaleX(${direction === 'left' ? -1 : 1})` }}
          >
            <TransparentSprite 
              src={skins[skinIndex]} 
              className="h-18 w-auto filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]"
            />
          </span>
        </div>
      </div>

      {/* Floating HUD Controller Toggle Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <motion.button 
          onClick={() => { setHudOpen(!hudOpen); playClick(); }}
          className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all ${
            hudOpen 
              ? 'bg-red-500 text-white rotate-45' 
              : 'bg-primary text-white hover:scale-105 active:scale-95'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          <span className="text-xl font-bold">{hudOpen ? '×' : '🐾'}</span>
        </motion.button>

        {/* Floating Controls HUD Panel */}
        <AnimatePresence>
          {hudOpen && (
            <motion.div 
              className="absolute bottom-16 right-0 w-64 bg-white/90 dark:bg-[#111328]/95 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-2xl backdrop-blur-md text-left text-slate-800 dark:text-white"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
            >
              {/* Pet Info */}
              <div className="flex items-center gap-3 mb-3 border-b border-slate-100 dark:border-slate-850 pb-2.5">
                <TransparentSprite src={skins[skinIndex]} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">{skinNames[skinIndex]}</h4>
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span>Level {stats.level}</span>
                    <span>{stats.exp}/100 XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-primary transition-all duration-305"
                      style={{ width: `${stats.exp}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Interaction buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleFeed}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-primary/30 flex items-center justify-center gap-1 transition-all"
                >
                  <span>🍪</span> Feed (10c)
                </button>
                <button 
                  onClick={handlePet}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-primary/30 flex items-center justify-center gap-1 transition-all"
                >
                  <span>💖</span> Pet Friend
                </button>
                <button 
                  onClick={changeSkin}
                  className="col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-primary/30 flex items-center justify-center gap-1 transition-all"
                >
                  <span>🔄</span> Change Skin
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// Global reusable component to display a pet as a static pixel sprite (replaces pet emojis)
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
  const skinMap: Record<string, string> = {
    cat: '/pet_cat.png',
    owl: '/pet_owl.png',
    dragon: '/pet_dino.png',
    fox: '/pet_dino.png',
    bunny: '/pet_dino.png',
  };

  const src = skinMap[species] || '/pet_cat.png';

  // Calculate size scale based on stage (0 = egg/tiny, 1 = baby, 2 = teen, 3 = adult, 4 = legendary)
  const scale = stage === 0 ? 0.5 : stage === 1 ? 0.7 : stage === 2 ? 0.85 : 1.0;
  
  // Legendary stage (stage 4) has a glowing purple drop-shadow filter
  const legendaryClass = stage === 4 
    ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] animate-pulse' 
    : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]';

  return (
    <span 
      className="inline-flex items-center justify-center relative overflow-visible w-full h-full"
    >
      <span 
        className="inline-block transition-transform duration-300"
        style={{ transform: `scale(${scale})` }}
      >
        <TransparentSprite 
          src={src} 
          className={`${className} ${legendaryClass}`} 
        />
      </span>
      {stage === 0 && (
        <span className="absolute bottom-0 right-0 text-xs">🥚</span>
      )}
    </span>
  );
});
