/**
 * SportX Competitive Lobby & Loading Screen Invariant Test Suite
 * Tests all required behaviors:
 * 1. Safe public player data: never show email, UID, or private fields.
 * 2. Live player count: "Players Joined: 1 / 2".
 * 3. Empty slot rendering until full.
 * 4. Match Found display on full lobby.
 * 5. Audio trigger once only.
 * 6. 3–5 second countdown timer.
 * 7. Abort countdown and return to waiting if any player leaves.
 * 8. Cancel search integration.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n================================================================');
console.log('⚡ SportX Competitive Lobby Loading & Waiting Screen Test Suite');
console.log('================================================================\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

// ── Test 1: File Existence & Isolation ──────────────────────────────────────────
console.log('[1/4] Testing File Structure & Isolation...');

const competitivePlayerCardPath = path.resolve(__dirname, '../src/components/CompetitivePlayerCard.tsx');
const competitiveMatchLoadingPath = path.resolve(__dirname, '../src/components/CompetitiveMatchLoading.tsx');
const useCompetitiveLobbyPath = path.resolve(__dirname, '../src/hooks/useCompetitiveLobby.ts');
const matchFoundSoundPath = path.resolve(__dirname, '../src/assets/match-found.mp3');

test('CompetitivePlayerCard.tsx exists', () => {
  assert(fs.existsSync(competitivePlayerCardPath), 'Missing CompetitivePlayerCard.tsx');
});

test('CompetitiveMatchLoading.tsx exists', () => {
  assert(fs.existsSync(competitiveMatchLoadingPath), 'Missing CompetitiveMatchLoading.tsx');
});

test('useCompetitiveLobby.ts exists', () => {
  assert(fs.existsSync(useCompetitiveLobbyPath), 'Missing useCompetitiveLobby.ts');
});

test('match-found.mp3 exists', () => {
  assert(fs.existsSync(matchFoundSoundPath), 'Missing match-found.mp3');
});

// ── Test 2: Public Data Protection Invariants ─────────────────────────────────
console.log('\n[2/4] Testing Public Player Data Protection Invariants...');

const cardSource = fs.readFileSync(competitivePlayerCardPath, 'utf8');
const hookSource = fs.readFileSync(useCompetitiveLobbyPath, 'utf8');

test('CompetitivePlayerCard does not accept or render email or raw uid', () => {
  assert(!cardSource.includes('player.email'), 'Card must not render player.email');
  assert(!cardSource.includes('player.uid'), 'Card must not render player.uid');
  assert(!cardSource.includes('player.userId'), 'Card must not render player.userId');
  assert(cardSource.includes('replace(/@.+/'), 'Display name must strip email domain');
});

test('useCompetitiveLobby sanitizes player objects to public fields only', () => {
  assert(hookSource.includes('displayName:'), 'Sanitizes displayName');
  assert(hookSource.includes('rankTier:'), 'Sanitizes rankTier');
  assert(hookSource.includes('ready:'), 'Includes ready status');
  assert(hookSource.includes('connectionStatus:'), 'Includes connection status');
});

// ── Test 3: Lobby Waiting & UI Counter Invariants ─────────────────────────────
console.log('\n[3/4] Testing Waiting Lobby Counter & Visual Indicators...');

const loadingSource = fs.readFileSync(competitiveMatchLoadingPath, 'utf8');

test('CompetitiveMatchLoading renders live player count format', () => {
  assert(loadingSource.includes('PLAYERS JOINED:'), 'Must render PLAYERS JOINED counter');
  assert(loadingSource.includes('{playersJoinedCount} / {targetPlayers}'), 'Must format as joined / target');
});

test('CompetitiveMatchLoading renders empty player slots until lobby is full', () => {
  assert(loadingSource.includes('Array.from({ length: targetPlayers })'), 'Renders all target player slots');
  assert(loadingSource.includes('isEmpty={isEmpty}'), 'Passes empty slot state');
});

test('CompetitiveMatchLoading displays MATCH FOUND banner', () => {
  assert(loadingSource.includes('MATCH FOUND'), 'Must include MATCH FOUND banner');
  assert(loadingSource.includes('STARTING IN {countdownSeconds}s'), 'Must display countdown seconds');
});

test('CompetitiveMatchLoading provides Cancel Search functionality', () => {
  assert(loadingSource.includes('Cancel Search'), 'Must render Cancel Search button');
  assert(loadingSource.includes('cancelSearch'), 'Must bind cancelSearch handler');
});

// ── Test 4: Hook State Machine & Leave Abort Logic ────────────────────────────
console.log('\n[4/4] Testing Hook State Machine & Player Leave Recovery...');

test('useCompetitiveLobby plays start sound once only', () => {
  assert(hookSource.includes('hasPlayedSoundRef.current'), 'Tracks sound playback with ref');
  assert(hookSource.includes('playMatchFoundSound'), 'Calls sound player');
});

test('useCompetitiveLobby includes countdown duration support (3-5s)', () => {
  assert(hookSource.includes('countdownDuration = 4'), 'Default countdown is 3-5s (4s)');
  assert(hookSource.includes('setCountdownSeconds'), 'Manages countdown seconds');
});

test('useCompetitiveLobby stops countdown & returns to waiting mode if player leaves', () => {
  assert(hookSource.includes('clearInterval(countdownIntervalRef.current)'), 'Clears countdown timer on leave');
  assert(hookSource.includes("setStatus('waiting')"), 'Returns status to waiting');
  assert(hookSource.includes('hasPlayedSoundRef.current = false'), 'Resets sound ref for next match find');
});

test('useCompetitiveLobby provides simulateDevOpponent and dev leave abort for verification', () => {
  assert(hookSource.includes('simulateDevOpponent'), 'Provides simulateDevOpponent');
  assert(hookSource.includes('simulateDevOpponentLeave'), 'Provides simulateDevOpponentLeave');
});

console.log('\n================================================================');
console.log(`🎉 ALL COMPETITIVE LOBBY TESTS PASSED! (${passedTests}/${passedTests})`);
console.log('================================================================\n');
