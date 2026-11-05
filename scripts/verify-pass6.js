const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deel\\.gemini\\antigravity\\brain\\ccf33a70-1a69-4749-9c22-1b2960e059b7';

const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1536x730', width: 1536, height: 730 },
  { name: '1920x880', width: 1920, height: 880 },
  { name: '2560x1300', width: 2560, height: 1300 },
];

async function runPass6Audit() {
  console.log('=== STARTING PASS 6 COMPREHENSIVE REGRESSION AUDIT ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  async function injectState(isPopulated) {
    await page.evaluateOnNewDocument((populated) => {
      localStorage.setItem('sq_dev_guest', 'true');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('studyquest_onboarding_completed', 'true');
      localStorage.setItem('sq_last_seen_patch', '2.0.0');
      sessionStorage.setItem('sq_patch_modal_dismissed_session', 'true');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');

      const today = new Date().toISOString().split('T')[0];

      if (populated) {
        localStorage.setItem('studyquest_gamification', JSON.stringify({
          xp: 4699,
          level: 9,
          streak: 3,
          xpHistory: { '2026-11-04': 95, '2026-11-05': 45 }
        }));
        localStorage.setItem('studyquest_timer_state', JSON.stringify({
          phase: 'focus',
          isRunning: true,
          timeLeft: 24 * 60,
          totalFocusToday: 2700,
          lastSavedTime: Date.now(),
        }));
        localStorage.setItem('studyquest_daily_quests', JSON.stringify([
          { id: 'dq-1', title: 'Review Physics Ch. 4 notes', completed: false, date: today, createdAt: Date.now() },
          { id: 'dq-2', title: 'Solve 10 Calculus integrals', completed: true, date: today, createdAt: Date.now() },
        ]));
        localStorage.setItem('studyquest_tasks', JSON.stringify([
          { id: 't-1', title: 'Physics Ch.4 Problem Set', status: 'in-progress', subtasks: [{ id: 's1', completed: true }, { id: 's2', completed: false }] },
          { id: 't-2', title: 'Essay Outline Draft', status: 'in-progress', subtasks: [{ id: 's3', completed: true }, { id: 's4', completed: true }] }
        ]));
        
        const n1 = { id: 'n1', title: 'AI Unit Test QB', folder: 'AI', content: 'A '.repeat(3909), updatedAt: Date.now() };
        const n2 = { id: 'n2', title: 'Thermodynamics Sheet', folder: 'GENERAL', content: 'B '.repeat(9683), updatedAt: Date.now() - 3600000 };
        const n3 = { id: 'n3', title: 'Organic Reactions Map', folder: 'GENERAL', content: 'C '.repeat(7036), updatedAt: Date.now() - 7200000 };
        localStorage.setItem('sq_local_note_n1', JSON.stringify(n1));
        localStorage.setItem('sq_local_note_n2', JSON.stringify(n2));
        localStorage.setItem('sq_local_note_n3', JSON.stringify(n3));
        localStorage.setItem('studyquest_notes', JSON.stringify([n1, n2, n3]));

        localStorage.setItem('studyquest_shop_inventory', JSON.stringify({ lastTreasureChestClaim: '2020-01-01' }));
      } else {
        localStorage.setItem('studyquest_gamification', JSON.stringify({ xp: 0, level: 1, streak: 0, xpHistory: {} }));
        localStorage.setItem('studyquest_timer_state', JSON.stringify({ phase: 'focus', isRunning: false, timeLeft: 25 * 60, totalFocusToday: 0, lastSavedTime: Date.now() }));
        localStorage.setItem('studyquest_daily_quests', JSON.stringify([]));
        localStorage.setItem('studyquest_tasks', JSON.stringify([]));
        localStorage.setItem('studyquest_notes', JSON.stringify([]));
        localStorage.removeItem('sq_local_note_n1');
        localStorage.removeItem('sq_local_note_n2');
        localStorage.removeItem('sq_local_note_n3');
        localStorage.setItem('studyquest_shop_inventory', JSON.stringify({ lastTreasureChestClaim: today }));
      }
    }, isPopulated);
  }

  const allResults = [];

  for (const stateType of ['empty_claimed', 'populated_ready']) {
    const isPopulated = stateType === 'populated_ready';
    console.log(`\n========================================`);
    console.log(`TESTING STATE: ${stateType.toUpperCase()}`);
    console.log(`========================================`);

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await injectState(isPopulated);
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise((r) => setTimeout(r, 1200));

      // Dismiss any lingering patch/welcome modals
      await page.evaluate(() => {
        const modalOverlays = document.querySelectorAll('.fixed.inset-0');
        for (const o of modalOverlays) {
          if (o.textContent.includes('Scroll of Updates') || o.textContent.includes('Welcome to StudyQuest')) {
            o.remove();
          }
        }
      });

      // Programmatic Audit in Browser Runtime
      const metrics = await page.evaluate((isPop) => {
        const issues = [];

        // 1. Check Horizontal Scroll
        const bodyScrollW = document.body.scrollWidth;
        const htmlScrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        const hasHScroll = bodyScrollW > innerW + 1 || htmlScrollW > innerW + 1;
        if (hasHScroll) {
          issues.push(`Horizontal scroll detected: body=${bodyScrollW}px, window=${innerW}px`);
        }

        // 2. Programmatic Overflow / Clipping Check on all Cards, Rows, and Wells
        const elementsToCheck = document.querySelectorAll('.panel, .well, [style*="overflow: hidden"], [class*="overflow-hidden"]');
        let overflowHiddenCount = 0;
        let clippingCount = 0;
        elementsToCheck.forEach((el) => {
          if (el.classList.contains('pointer-events-none') || el.closest('.pointer-events-none')) return;
          if (el.classList.contains('animate-sweep') || el.querySelector('.animate-sweep')) return;
          if (el.classList.contains('dash-grid')) return;

          const style = window.getComputedStyle(el);
          if (style.overflow === 'hidden' || style.overflowY === 'hidden' || style.overflowX === 'hidden') {
            overflowHiddenCount++;
            const diffY = el.scrollHeight - el.clientHeight;
            if (diffY > 1.5) {
              clippingCount++;
              const preview = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
              issues.push(`Clipping: <${el.tagName.toLowerCase()} class="${el.className.slice(0, 35)}"> scrollHeight(${el.scrollHeight}) > clientHeight(${el.clientHeight}) by ${diffY.toFixed(1)}px. Content: "${preview}"`);
            }
          }
        });

        // 3. Daily Quests Empty State Check (Bug 1)
        const dqPanel = document.querySelector('section[style*="grid-area: dq"], section[style*="grid-area:dq"]');
        let dqCheck = null;
        if (dqPanel) {
          const well = dqPanel.querySelector('.well');
          const isScrollable = dqPanel.querySelector('.overflow-y-auto') !== null;
          const scrollList = dqPanel.querySelector('.overflow-y-auto');
          let hasUnintendedScrollbar = false;
          if (!isPop && scrollList) {
            hasUnintendedScrollbar = scrollList.scrollHeight > scrollList.clientHeight + 1;
          }
          const addBtn = dqPanel.querySelector('footer button');
          dqCheck = {
            cardHeight: Math.round(dqPanel.getBoundingClientRect().height),
            hasUnintendedScrollbar,
            emptyWellPresent: !!well,
            footerBtnPresent: !!addBtn,
          };
          if (!isPop && hasUnintendedScrollbar) {
            issues.push(`Daily Quests: unintended scrollbar in empty state (scrollHeight=${scrollList.scrollHeight}, clientHeight=${scrollList.clientHeight})`);
          }
        }

        // 4. Active Quests Check
        const aqPanel = document.querySelector('section[style*="grid-area: aq"], section[style*="grid-area:aq"]');
        let aqCheck = null;
        if (aqPanel) {
          const aqRect = aqPanel.getBoundingClientRect();
          const taskBtn = aqPanel.querySelector('button');
          let btnInside = true;
          if (taskBtn) {
            const btnRect = taskBtn.getBoundingClientRect();
            btnInside = btnRect.bottom <= aqRect.bottom + 2 && btnRect.right <= aqRect.right + 2;
          }
          const isClipped = aqPanel.scrollHeight > aqPanel.clientHeight + 1;
          aqCheck = {
            cardHeight: Math.round(aqRect.height),
            btnInside,
            isClipped,
          };
          if (!btnInside) issues.push(`Active Quests: "+ Task" button hangs over card edge`);
          if (isClipped) issues.push(`Active Quests: card clipped (scrollHeight=${aqPanel.scrollHeight}, clientHeight=${aqPanel.clientHeight})`);
        }

        // 5. Top 3 Notes Stacked Cards Tag & Score Legibility Check (Bug 2 & 3)
        const notesPanel = document.querySelector('section[style*="grid-area: notes"], section[style*="grid-area:notes"]');
        let notesCardsCheck = [];
        let viewAllCheck = null;
        if (notesPanel) {
          const cards = Array.from(notesPanel.querySelectorAll('button[class*="rounded-[18px]"]'));
          if (cards.length >= 2) {
            for (let i = 1; i < cards.length; i++) {
              const prevCard = cards[i - 1]; // card directly in front of card i
              const currCard = cards[i];
              const tagEl = currCard.querySelector('span[class*="uppercase"]');
              const scoreEl = currCard.querySelector('span[class*="tabular-nums"]');
              
              if (tagEl && prevCard) {
                const prevRect = prevCard.getBoundingClientRect();
                const tagRect = tagEl.getBoundingClientRect();
                const clearance = prevRect.top - tagRect.bottom;
                const isFullyVisible = clearance >= -1;
                notesCardsCheck.push({
                  cardIndex: i,
                  tag: tagEl.textContent.trim(),
                  score: scoreEl ? scoreEl.textContent.trim() : '',
                  clearance: Math.round(clearance),
                  isFullyVisible,
                });
                if (!isFullyVisible) {
                  issues.push(`Notes Deck: Card ${i} tag "${tagEl.textContent.trim()}" is overlapped by front card (clearance=${clearance.toFixed(1)}px)`);
                }
              }
            }
          }

          // Check "View All" button glow margin inside card
          const viewAllBtn = notesPanel.querySelector('footer button');
          if (viewAllBtn) {
            const btnRect = viewAllBtn.getBoundingClientRect();
            const panelRect = notesPanel.getBoundingClientRect();
            const rightGutter = panelRect.right - btnRect.right;
            viewAllCheck = {
              rightGutter: Math.round(rightGutter),
              hasSafeGutter: rightGutter >= 3,
            };
            if (rightGutter < 2) {
              issues.push(`Notes Deck: "View All" button touches right border (gutter=${rightGutter}px), risking glow clip`);
            }
          }
        }

        // 6. Sidebar Check: Scrollbar & Vertical Axis Centering
        const sidebar = document.querySelector('aside[aria-label="Navigation Rail"]');
        let sidebarCheck = null;
        if (sidebar) {
          const middleArea = sidebar.querySelector('.overflow-y-auto');
          const hasScrollbar = middleArea ? middleArea.scrollHeight > middleArea.clientHeight + 1 : false;
          const icons = Array.from(sidebar.querySelectorAll('a, button, [class*="rounded-full"]'));
          const centers = [];
          icons.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 20 && r.height > 20) {
              centers.push({
                tag: el.tagName,
                cx: r.left + r.width / 2,
              });
            }
          });

          const uniqueX = centers.map((c) => c.cx);
          const minX = Math.min(...uniqueX);
          const maxX = Math.max(...uniqueX);
          const maxDeviation = maxX - minX;

          sidebarCheck = {
            hasScrollbar,
            maxDeviation: parseFloat(maxDeviation.toFixed(2)),
            iconsCount: centers.length,
          };

          if (maxDeviation > 1.5) {
            issues.push(`Sidebar: icons not centered on same vertical axis (max deviation=${maxDeviation.toFixed(1)}px)`);
          }
        }

        // 7. Study Velocity Tubes Check: Equal Distribution & Goal Pill Clearance
        const velPanel = document.querySelector('section[style*="grid-area: vel"], section[style*="grid-area:vel"]');
        let velCheck = null;
        if (velPanel) {
          const tubes = Array.from(velPanel.querySelectorAll('.well.rounded-full'));
          const goalBadge = Array.from(velPanel.querySelectorAll('span')).find((s) => s.textContent.includes('GOAL'));
          const baseline = velPanel.querySelector('div[class*="border-b"]');
          let goalOverlap = false;
          let tubeDistances = [];
          let maxSpacingDiff = 0;
          if (tubes.length === 7) {
            const tubeCenters = tubes.map((t) => {
              const r = t.getBoundingClientRect();
              return r.left + r.width / 2;
            });
            for (let i = 1; i < tubeCenters.length; i++) {
              tubeDistances.push(parseFloat((tubeCenters[i] - tubeCenters[i - 1]).toFixed(1)));
            }
            const minD = Math.min(...tubeDistances);
            const maxD = Math.max(...tubeDistances);
            maxSpacingDiff = parseFloat((maxD - minD).toFixed(1));

            if (goalBadge) {
              const goalRect = goalBadge.getBoundingClientRect();
              const thuRect = tubes[6].getBoundingClientRect();
              goalOverlap = !(goalRect.left > thuRect.right + 2);
              if (goalOverlap) issues.push(`Study Velocity: GOAL badge overlaps Thu tube`);
            }
          }
          velCheck = {
            tubesCount: tubes.length,
            distances: tubeDistances,
            maxSpacingDiff,
            goalOverlap,
            baselinePresent: !!baseline,
          };
          if (maxSpacingDiff > 3) {
            issues.push(`Study Velocity: tubes not distributed evenly (spacing variance=${maxSpacingDiff}px)`);
          }
        }

        // 8. Flow Station Clearance Check
        const flowPanel = document.querySelector('section[style*="grid-area: flow"], section[style*="grid-area:flow"]');
        let flowCheck = null;
        if (flowPanel) {
          const sub = flowPanel.querySelector('header p');
          const thumb = flowPanel.querySelector('[style*="translate(-50%,-50%)"]');
          const orb = flowPanel.querySelector('.orb');
          const controls = flowPanel.querySelector('div[class*="mt-6"], div[class*="mt-7"]');
          
          let headerToRing = null;
          let ringToControls = null;
          if (sub && thumb) {
            headerToRing = Math.round(thumb.getBoundingClientRect().top - sub.getBoundingClientRect().bottom);
          }
          if (orb && controls) {
            ringToControls = Math.round(controls.getBoundingClientRect().top - orb.getBoundingClientRect().bottom);
          }
          flowCheck = {
            headerToRing,
            ringToControls,
          };
        }

        // 9. Bottom Alignment Check
        const lofiPanel = document.querySelector('section[style*="grid-area: lofi"], section[style*="grid-area:lofi"]');
        const chestPanel = document.querySelector('section[style*="grid-area: chest"], section[style*="grid-area:chest"]');
        let bottomCheck = null;
        if (lofiPanel && velPanel && chestPanel && sidebar) {
          const lofiB = lofiPanel.getBoundingClientRect().bottom;
          const velB = velPanel.getBoundingClientRect().bottom;
          const chestB = chestPanel.getBoundingClientRect().bottom;
          const sideB = sidebar.getBoundingClientRect().bottom;

          const cardDiff = Math.max(Math.abs(lofiB - velB), Math.abs(velB - chestB));
          const sidebarDiff = Math.abs(sideB - lofiB);

          bottomCheck = {
            lofiBottom: Math.round(lofiB),
            velBottom: Math.round(velB),
            chestBottom: Math.round(chestB),
            sidebarBottom: Math.round(sideB),
            cardDiff: parseFloat(cardDiff.toFixed(1)),
            sidebarDiff: parseFloat(sidebarDiff.toFixed(1)),
          };

          if (cardDiff > 1.5) {
            issues.push(`Bottom cards misaligned: lofi=${lofiB}, vel=${velB}, chest=${chestB}`);
          }
          if (sidebarDiff > 2.5) {
            issues.push(`Sidebar bottom (${sideB}) misaligned with cards bottom (${lofiB}) by ${sidebarDiff.toFixed(1)}px`);
          }
        }

        return {
          hasHScroll,
          overflowHiddenCount,
          clippingCount,
          issues,
          dqCheck,
          aqCheck,
          notesCardsCheck,
          viewAllCheck,
          sidebarCheck,
          velCheck,
          flowCheck,
          bottomCheck,
        };
      }, isPopulated);

      // Screenshot capture
      const shotName = `pass6_${stateType}_${vp.name}.png`;
      const shotPath = path.join(ARTIFACT_DIR, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });

      const pass = metrics.issues.length === 0;
      console.log(`[PASS 6] ${stateType} @ ${vp.name} -> ${pass ? 'ALL CHECKS PASSED' : 'ISSUES FOUND'}`);
      if (!pass) {
        metrics.issues.forEach((iss) => console.log(`   [FAIL] ${iss}`));
      } else {
        console.log(`   [OK] HScroll: NONE | Clipped Elements: 0 / ${metrics.overflowHiddenCount}`);
        if (metrics.dqCheck) console.log(`   [OK] DailyQuests: Unintended Scrollbar: NONE, Well Present: ${metrics.dqCheck.emptyWellPresent}`);
        if (metrics.aqCheck) console.log(`   [OK] ActiveQuests: height=${metrics.aqCheck.cardHeight}px, btnInside=${metrics.aqCheck.btnInside}`);
        if (metrics.notesCardsCheck.length > 0) {
          metrics.notesCardsCheck.forEach((nc) => {
            console.log(`   [OK] NotesDeck Card ${nc.cardIndex} ("${nc.tag}") visible above front card (clearance=${nc.clearance}px)`);
          });
        }
        if (metrics.viewAllCheck) console.log(`   [OK] NotesDeck View All: Right Gutter=${metrics.viewAllCheck.rightGutter}px (Glow Safe: ${metrics.viewAllCheck.hasSafeGutter})`);
        if (metrics.velCheck) console.log(`   [OK] Velocity Tubes Spacing: [${metrics.velCheck.distances.join(', ')}] (variance=${metrics.velCheck.maxSpacingDiff}px), Goal Overlap: NONE, Baseline: ${metrics.velCheck.baselinePresent}`);
        if (metrics.sidebarCheck) console.log(`   [OK] Sidebar Centering Deviation: ${metrics.sidebarCheck.maxDeviation}px`);
        if (metrics.flowCheck) console.log(`   [OK] Flow Station Clearance: Header->Ring=${metrics.flowCheck.headerToRing}px, Ring->Controls=${metrics.flowCheck.ringToControls}px`);
        if (metrics.bottomCheck) console.log(`   [OK] Bottom Alignment: LoFi=${metrics.bottomCheck.lofiBottom}, Vel=${metrics.bottomCheck.velBottom}, Chest=${metrics.bottomCheck.chestBottom}, Sidebar=${metrics.bottomCheck.sidebarBottom} (diff=${metrics.bottomCheck.cardDiff}px)`);
      }

      allResults.push({
        state: stateType,
        viewport: vp.name,
        metrics,
        screenshot: shotName,
      });
    }
  }

  console.log('\n=== FINAL PASS 6 AUDIT SUMMARY ===');
  console.log(JSON.stringify(allResults, null, 2));

  await browser.close();
}

runPass6Audit().catch((err) => {
  console.error('Audit failed with fatal error:', err);
  process.exit(1);
});
