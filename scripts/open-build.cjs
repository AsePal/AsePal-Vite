#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
// Time scale: multiply all sleep durations by this factor to control total runtime
// Set to ~0.65 to reduce the demo by a few seconds (small speedup)
// This shortens total demo time by ~3s compared to 0.7 while keeping pace natural.
const TIME_SCALE = 0.65;

function sleep(ms) {
  // scale sleep durations so the whole demo runs faster or slower
  const scaled = Math.max(1, Math.round(ms * TIME_SCALE));
  return new Promise((resolve) => setTimeout(resolve, scaled));
}

async function run() {
  if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });
  // richer scripted output to simulate a real build (color, typing, varied speed)
  const RESET = '\x1b[0m';
  const CYAN = '\x1b[36m';
  const GREEN = '\x1b[32m';
  const YELLOW = '\x1b[33m';
  const MAGENTA = '\x1b[35m';
  const DIM = '\x1b[2m';

  // 不再展示额外的开场框

  // collect some sample files from the project's src tree to list in output
  function collectSampleFiles(srcDir, maxFiles = 8) {
    const out = [];
    function walk(dir) {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return;
      }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(p);
        } else if (/\.(ts|tsx|js|jsx|css|scss)$/.test(e.name)) {
          out.push(path.relative(root, p).replace(/\\/g, '/'));
          if (out.length >= maxFiles) return;
        }
      }
    }
    try {
      const sd = path.join(root, 'src');
      if (fs.existsSync(sd)) walk(sd);
    } catch (e) {}
    // fallback sample list if src is empty or inaccessible
    if (out.length === 0) {
      return [
        'src/features/chat/components/ChatWindow.tsx',
        'src/features/auth/pages/Login.tsx',
        'src/app/main.tsx',
        'src/app/App.tsx',
      ];
    }
    return out;
  }

  const sampleFiles = collectSampleFiles();

  // lines to print. extraPause controls longer pauses; type=true simulates typing
  const lines = (function () {
    const start = [
      { text: `${CYAN}> resolving packages${RESET}`, type: 'dots', extraPause: 0 },
      {
        text: `${CYAN}> downloading dependency: @vite/plugin-react-swc${RESET}`,
        type: 'download',
        sizeKB: 5200,
        extraPause: 200,
      },
      { text: `${CYAN}> compiling modules${RESET}`, type: 'dots', extraPause: 0 },
      {
        text: `${YELLOW}WARN:${RESET} deprecated API used in /src/utils/env.ts`,
        type: 'line',
        extraPause: 250,
      },
      { text: `${CYAN}> initializing token checker${RESET}`, type: 'line', extraPause: 120 },
      { text: `${CYAN}> validating cache entries${RESET}`, type: 'line', extraPause: 120 },
      { text: `${CYAN}> authorizing tokens${RESET}`, type: 'line', extraPause: 160 },
    ];

    const bundling = sampleFiles.map((f) => ({
      text: `${CYAN}> bundling module: ${f}${RESET}`,
      type: 'type',
      extraPause: 300,
    }));

    const end = [
      { text: `${DIM}// compiling JSX -> JS${RESET}`, type: 'type', extraPause: 200 },
      { text: `${CYAN}> optimizing chunks${RESET}`, type: 'dots', extraPause: 0 },
      {
        text: `${CYAN}> progress: building chunks${RESET}`,
        type: 'progress',
        steps: 40,
        extraPause: 500,
      },
      { text: `${GREEN}✔ optimized chunk 0 (runtime)${RESET}`, type: 'line', extraPause: 150 },
      { text: `${GREEN}✔ optimized chunk 1 (vendors)${RESET}`, type: 'line', extraPause: 150 },
      { text: `${CYAN}> emitting assets${RESET}`, type: 'dots', extraPause: 0 },
      {
        text: `${MAGENTA}writing asset:${RESET} ${MAGENTA}chat-Login.bundle.js${RESET}`,
        type: 'type',
        extraPause: 300,
      },
      {
        text: `${MAGENTA}writing asset:${RESET} ${MAGENTA}chat-Login.styles.css${RESET}`,
        type: 'type',
        extraPause: 300,
      },
      {
        text: `${YELLOW}Note:${RESET} sourcemap generation skipped for demo speedup`,
        type: 'line',
        extraPause: 200,
      },
      // extra plain lines without 'done' tail
      { text: `${CYAN}> checking cache${RESET}`, type: 'line', extraPause: 120 },
      { text: `${CYAN}> hashing assets${RESET}`, type: 'line', extraPause: 140 },
      { text: `${CYAN}> tree shaking modules${RESET}`, type: 'line', extraPause: 160 },
      { text: `${CYAN}> finalizing build${RESET}`, type: 'dots', extraPause: 0 },
      { text: `${GREEN}Build completed in ~0m45s${RESET}`, type: 'line', extraPause: 80 },
    ];

    return start.concat(bundling).concat(end);
  })();

  // helper: type characters with small delay to simulate typing (faster)
  async function typeWrite(s, min = 1, max = 6) {
    for (const ch of s) {
      process.stdout.write(ch);
      await sleep(min + Math.floor(Math.random() * (max - min + 1)));
    }
  }

  // helper: print line with dot animation (faster)
  async function dotsLine(prefix) {
    process.stdout.write(prefix);
    const totalDots = 3 + Math.floor(Math.random() * 4);
    for (let d = 0; d < totalDots; d++) {
      await sleep(30 + Math.floor(Math.random() * 60));
      process.stdout.write('.');
    }
    process.stdout.write('\n');
  }

  // helper: render a simple progress bar string
  function progressBar(curr, total, width = 30) {
    const pct = Math.min(1, Math.max(0, curr / total));
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '-'.repeat(empty);
    const percentText = Math.round(pct * 100)
      .toString()
      .padStart(3, ' ');
    return `[${bar}] ${percentText}%`;
  }

  // simulate a download with varying speed and display KB/s
  async function simulateDownload(label, totalKB) {
    const startTime = Date.now();
    let downloaded = 0;
    // make downloads faster for shorter demo
    while (downloaded < totalKB) {
      // speed varies between 400 KB/s and 3000 KB/s
      const speedKBs = 400 + Math.floor(Math.random() * 2600);
      // tick duration shortened slightly for a snappier demo
      const tick = 20 + Math.floor(Math.random() * 70);
      const chunk = Math.min(
        totalKB - downloaded,
        Math.max(1, Math.round((speedKBs * tick) / 1000)),
      );
      downloaded += chunk;
      const elapsed = (Date.now() - startTime) / 1000;
      const kbPerSec = Math.round(downloaded / Math.max(0.1, elapsed));
      const bar = progressBar(downloaded, totalKB, 28);
      process.stdout.write(`\r${CYAN}${label}${RESET} ${bar} ${kbPerSec} KB/s`);
      await sleep(tick + Math.floor(Math.random() * 30));
    }
    process.stdout.write(
      `\r${CYAN}${label}${RESET} ${progressBar(totalKB, totalKB, 28)} ${Math.round(totalKB / Math.max(0.1, (Date.now() - startTime) / 1000))} KB/s\n`,
    );
    await sleep(60 + Math.floor(Math.random() * 80));
  }

  // simulate a progress bar for build steps
  async function simulateProgress(label, steps) {
    let curr = 0;
    const total = steps;
    while (curr < total) {
      curr += 1 + Math.floor(Math.random() * 2);
      if (curr > total) curr = total;
      const bar = progressBar(curr, total, 30);
      const pct = Math.round((curr / total) * 100);
      process.stdout.write(`\r${CYAN}${label}${RESET} ${bar} (${pct}%)`);
      // slightly faster progress updates for snappier feel
      await sleep(40 + Math.floor(Math.random() * 60));
    }
    process.stdout.write('\n');
    await sleep(80 + Math.floor(Math.random() * 120));
  }

  // run through lines with various effects; total time target ~60s
  let firstOutput = true;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // first terminal output should pause a bit to feel realistic
    if (firstOutput) {
      await sleep(200 + Math.floor(Math.random() * 300));
      firstOutput = false;
    }

    if (l.type === 'type') {
      // special-case bundling lines: print directly (no cursor-scan typing)
      if (l.text && l.text.indexOf('> bundling module:') !== -1) {
        // decide whether to print single or a small cluster
        const roll = Math.random();
        if (roll < 0.65) {
          // single line, short random pause
          process.stdout.write(l.text + '\n');
          await sleep(30 + Math.floor(Math.random() * 180));
        } else {
          // small cluster: print this and up to 3 following bundling lines
          let clusterCount = 1 + Math.floor(Math.random() * 3); // 1..3 additional
          process.stdout.write(l.text + '\n');
          for (let c = 0; c < clusterCount; c++) {
            const ni = i + 1;
            if (ni >= lines.length) break;
            const nl = lines[ni];
            if (
              nl &&
              nl.type === 'type' &&
              nl.text &&
              nl.text.indexOf('> bundling module:') !== -1
            ) {
              process.stdout.write(nl.text + '\n');
              // mark as consumed by advancing i
              i = ni;
              // small inter-line pause for cluster
              await sleep(20 + Math.floor(Math.random() * 120));
            } else {
              break;
            }
          }
          // after a cluster, random longer pause occasionally
          if (Math.random() < 0.25) await sleep(200 + Math.floor(Math.random() * 400));
        }
        // respect configured extraPause a bit
        await sleep(Math.min(200, l.extraPause || 0));
      } else {
        await typeWrite(l.text + '\n');
        await sleep(l.extraPause);
      }
    } else if (l.type === 'dots') {
      await dotsLine(l.text);
      await sleep(l.extraPause);
    } else if (l.type === 'download') {
      // simulate a download showing a progress bar and KB/s
      process.stdout.write(l.text + '\n');
      await simulateDownload('Downloading', l.sizeKB || 1024);
      await sleep(l.extraPause);
    } else if (l.type === 'progress') {
      // simulate a build progress
      process.stdout.write(l.text + '\n');
      await simulateProgress('Building', l.steps || 30);
      await sleep(l.extraPause);
    } else {
      // plain line
      process.stdout.write(l.text + '\n');
      await sleep(l.extraPause);
    }
  }

  // create believable fake files with chat-Login in the name (use timestamp to avoid overwrite)
  const ts = Date.now();
  const files = [
    {
      name: `chat-Login.bundle.${ts}.js`,
      content: `// chat-login bundle - ${new Date().toISOString()}\nconsole.log('chat-login bundle loaded');\n`,
    },
    {
      name: `chat-Login.styles.${ts}.css`,
      content: `/* chat-login styles */\n/* generated at ${new Date().toISOString()} */\n.chat-login { padding: 8px }\n`,
    },
  ];

  for (const f of files) {
    const p = path.join(dist, f.name);
    fs.writeFileSync(p, f.content, 'utf8');
    console.log(`${MAGENTA}Created${RESET} ${p}`);
    // small pause so creation logs are staggered
    await sleep(350 + Math.floor(Math.random() * 400));
  }

  const marker = path.join(dist, `BUILD_COMPLETE_${ts}.txt`);
  fs.writeFileSync(marker, `Build completed at ${new Date().toISOString()}\n`, 'utf8');
  console.log(`${MAGENTA}Created${RESET} ${marker}`);

  console.log('\nBuild finished successfully.');

  // 直接结束，无需等待按键
}

run().catch((err) => {
  console.error('Fake build failed:', err);
  process.exit(1);
});
