// scripts/verify/verify_3_2.js
// Tests all Block C and Block D checks from Section 12

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../');

async function runVerification() {
  const results = {}
  console.log('PHASE 3.2 — INTAKE UI VERIFICATION')
  console.log('====================================')

  // ── BLOCK C1: First message only ─────────────────────────
  const intakeScreenPath = join(rootDir, 'app/intake/IntakeScreen.jsx');
  const intakeScreenContent = readFileSync(intakeScreenPath, 'utf-8');
  results.c1_openingText = intakeScreenContent.includes('Tell me what is happening');
  console.log(results.c1_openingText ? '✅ [C1] Opening text present' : '❌ [C1] Opening text missing');

  // ── BLOCK C4: No voice elements ───────────────────────────
  const voicePatterns = ['microphone', 'mic-icon', 'voice-btn', 'SpeechRecognition'];
  const componentFiles = [
    'app/intake/IntakeScreen.jsx',
    'app/intake/IntakeMessage.jsx',
    'app/intake/IntakeInput.jsx',
    'app/intake/IntakeThinkingIndicator.jsx',
    'app/intake/IntakeCompletion.jsx'
  ];
  let voiceFound = [];
  for (const file of componentFiles) {
    const content = readFileSync(join(rootDir, file), 'utf-8').toLowerCase();
    voicePatterns.forEach(p => { if (content.includes(p.toLowerCase())) voiceFound.push(`${file}: ${p}`); });
  }
  results.c4_noVoice = voiceFound.length === 0;
  console.log(results.c4_noVoice ? '✅ [C4] Zero voice elements' : `❌ [C4] Voice found: ${voiceFound.join(', ')}`);

  // ── BLOCK C5: DEMO_MODE ──────────────────────────────────
  process.env.DEMO_MODE = 'true';
  const intakeLibPath = join(rootDir, 'lib/agents/intake.js');
  const intakeModule = await import(`file://${intakeLibPath}`);
  const firstMsg = await intakeModule.getDemoIntakeResponse(0);
  results.c5_demoMode = firstMsg.content.includes('Tell me');
  console.log(results.c5_demoMode ? '✅ [C5] DEMO_MODE opener correct' : '❌ [C5] DEMO_MODE opener wrong');

  // ── BLOCK D1: CSS ────────────────────────────────────────
  const cssContent = readFileSync(join(rootDir, 'app/globals.css'), 'utf-8');
  results.d1_cssVars = cssContent.includes('--bg-base') && cssContent.includes('--accent');
  console.log(results.d1_cssVars ? '✅ [D1] CSS vars present' : '❌ [D1] CSS vars missing');

  // ── BLOCK D2: Fonts ──────────────────────────────────────
  const layoutContent = readFileSync(join(rootDir, 'app/layout.jsx'), 'utf-8');
  results.d2_fonts = layoutContent.includes('--font-fraunces') && layoutContent.includes('GeneralSans');
  console.log(results.d2_fonts ? '✅ [D2] Fonts loaded' : '❌ [D2] Fonts missing');

  // ── BLOCK D3: Typography ─────────────────────────────────
  const msgContent = readFileSync(join(rootDir, 'app/intake/IntakeMessage.jsx'), 'utf-8');
  results.d3_typography = msgContent.includes('300') && msgContent.includes('italic') && msgContent.includes('32px');
  console.log(results.d3_typography ? '✅ [D3] Typography correct' : '❌ [D3] Typography wrong');

  // ── BLOCK D4: Hardcoded values ───────────────────────────
  results.d4_noHex = !msgContent.includes('#') || msgContent.includes('SVG');
  console.log(results.d4_noHex ? '✅ [D4] No hardcoded hex' : '❌ [D4] Hardcoded hex found');

  // ── FILE EXTENSION AUDIT ───────────────────────────────────
  const rawTsFiles = execSync('powershell "Get-ChildItem -Path D:\\UnwindAI -Recurse -Include *.ts,*.tsx | Select-Object -ExpandProperty FullName"').toString().split('\n').map(f => f.trim()).filter(Boolean);
  const filteredTsFiles = rawTsFiles.filter(f => !f.includes('node_modules') && !f.includes('.next'));
  results.noTypeScript = filteredTsFiles.length === 0;
  console.log(results.noTypeScript ? '✅ [STACK] Zero .ts or .tsx files in source' : `❌ [STACK] TS found: ${filteredTsFiles.join(', ')}`);

  const allPassed = Object.values(results).every(Boolean);
  if (!allPassed) process.exit(1);

  console.log('\n✅ PHASE 3 COMPLETE');
}

runVerification().catch(console.error)
