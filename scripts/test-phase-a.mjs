import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const scratchBundle = '/Users/naveennk/.gemini/antigravity/brain/0d036a07-751d-4413-9d2a-9facf79621cf/scratch/phase_a_tests.mjs';
fs.mkdirSync('/Users/naveennk/.gemini/antigravity/brain/0d036a07-751d-4413-9d2a-9facf79621cf/scratch', { recursive: true });

await build({
  stdin: {
    contents: `
      import * as THREE from 'three';
      import { EventBus } from './src/core/EventBus.ts';
      import { CAMPAIGN_CHAPTERS, STORY_CHARACTERS, STORY_ENDINGS } from './src/story/StoryData.ts';
      import { CampaignManager } from './src/story/CampaignManager.ts';
      import { WeaponSystem, WEAPON_DEFS } from './src/combat/WeaponSystem.ts';
      import { VFXSystem } from './src/combat/VFXSystem.ts';
      import { buildNPCCharacter } from './src/entities/NPCCharacterModel.ts';
      import { buildProtagonistCharacter } from './src/entities/PlayerCharacterModel.ts';
      import { DEFAULT_LOADOUT } from './src/entities/CustomizationData.ts';

      export const exportsForTest = {
        THREE, EventBus, CAMPAIGN_CHAPTERS, STORY_CHARACTERS, STORY_ENDINGS,
        CampaignManager, WeaponSystem, WEAPON_DEFS, VFXSystem,
        buildNPCCharacter, buildProtagonistCharacter, DEFAULT_LOADOUT
      };
    `,
    resolveDir: process.cwd(),
    loader: 'ts'
  },
  bundle: true,
  outfile: scratchBundle,
  format: 'esm',
  platform: 'node'
});

globalThis.document = {
  createElement: () => ({
    width: 256, height: 256,
    getContext: () => ({
      fillStyle: '', strokeStyle: '', font: '', textAlign: '', textBaseline: '', lineWidth: 1,
      fillRect(){}, strokeRect(){}, fillText(){}, beginPath(){}, moveTo(){}, lineTo(){}, arc(){}, ellipse(){}, fill(){}, stroke(){}, clearRect(){}, save(){}, restore(){}, clip(){}, drawImage(){},
      createLinearGradient: () => ({ addColorStop(){} }),
      createRadialGradient: () => ({ addColorStop(){} })
    })
  })
};

const { exportsForTest } = await import(scratchBundle);
const {
  THREE, EventBus, CAMPAIGN_CHAPTERS, STORY_CHARACTERS, STORY_ENDINGS,
  CampaignManager, WeaponSystem, VFXSystem,
  buildNPCCharacter, buildProtagonistCharacter, DEFAULT_LOADOUT
} = exportsForTest;

// 1. EventBus pub/sub & unsubscribe
{
  const bus = new EventBus();
  let seen = 0;
  const off = bus.on('economy:cash', (p) => { seen += p.delta; });
  bus.emit('economy:cash', { delta: 500, total: 3000, reason: 'mission' });
  off();
  bus.emit('economy:cash', { delta: 999, total: 3999, reason: 'ignored' });
  assert.equal(seen, 500, 'EventBus should deliver while subscribed and stop after unsubscribe');
  console.log('✓ Test 1: EventBus pub/sub passed');
}

// 2. Campaign data structure: 8 chapters (1 per zone), 12 named characters, bosses, 2 endings
{
  assert.equal(CAMPAIGN_CHAPTERS.length, 8, 'Must have 8 chapters (1 per zone)');
  const zones = new Set(CAMPAIGN_CHAPTERS.map((c) => c.zone));
  assert.equal(zones.size, 8, 'All 8 Bengaluru zones must be uniquely represented');
  assert.ok(STORY_CHARACTERS.length >= 6, 'Must have 6+ original named characters');
  for (const ch of CAMPAIGN_CHAPTERS) {
    assert.ok(ch.missions.length >= 2 && ch.missions.some((m) => m.isBossMission), `Chapter ${ch.id} needs missions + boss`);
    assert.ok(ch.introCutscene.shots.length >= 1, `Chapter ${ch.id} needs intro cutscene`);
    assert.ok(ch.dialogue.choices.length >= 2, `Chapter ${ch.id} needs branching dialogue choices`);
  }
  assert.ok(STORY_ENDINGS.loyalty && STORY_ENDINGS.power, 'Both loyalty & power endings must exist');
  console.log(`✓ Test 2: 8-Chapter Campaign (${CAMPAIGN_CHAPTERS.reduce((s, c) => s + c.missions.length, 0)} missions, ${STORY_CHARACTERS.length} characters, 2 endings) passed`);
}

// 3. Campaign state machine, economy rewards, save/load snapshot, and Loyalty vs Power Endings
{
  const cmLoyalty = new CampaignManager(undefined, undefined, false);
  let totalCash = 2500;
  let totalRespect = 0;
  cmLoyalty.onRewardEconomy = (c, r) => { totalCash += c; totalRespect += r; };

  // Pick all loyalty choices
  for (const ch of CAMPAIGN_CHAPTERS) {
    const lc = ch.dialogue.choices.find((c) => c.alignment === 'loyalty');
    if (lc) cmLoyalty.applyDialogueChoice(lc);
    for (const m of ch.missions) {
      totalCash += m.rewardCash;
      totalRespect += m.rewardRespect;
      cmLoyalty.recordMissionComplete(m.id);
    }
  }
  assert.equal(cmLoyalty.completedChapterIds.size, 8, 'All 8 chapters completed');
  assert.equal(cmLoyalty.getEndingType(), 'loyalty', 'Loyalty choices must unlock Loyalty ending');
  assert.equal(cmLoyalty.endingUnlocked, 'loyalty');
  assert.ok(totalCash > 80000 && totalRespect > 5000, 'Economy rewards should accumulate cleanly');

  // Snapshot save/load round-trip
  const snap = cmLoyalty.toSnapshot();
  const restored = new CampaignManager(undefined, undefined, false);
  restored.loadSnapshot(snap);
  assert.equal(restored.completedChapterIds.size, 8);
  assert.equal(restored.loyalty, cmLoyalty.loyalty);
  assert.equal(restored.endingUnlocked, 'loyalty');

  // Power ending path
  const cmPower = new CampaignManager(undefined, undefined, false);
  for (const ch of CAMPAIGN_CHAPTERS) {
    const pc = ch.dialogue.choices.find((c) => c.alignment === 'power');
    if (pc) cmPower.applyDialogueChoice(pc);
    for (const m of ch.missions) cmPower.recordMissionComplete(m.id);
  }
  assert.equal(cmPower.getEndingType(), 'power', 'Power choices must unlock Power ending');
  assert.equal(cmPower.endingUnlocked, 'power');
  console.log('✓ Test 3: Mission state machine, save/load snapshot, economy & both endings passed');
}

// 4. Pocket gun holster + draw-from-pocket + real 3D enemy guns
{
  const rig = buildProtagonistCharacter(DEFAULT_LOADOUT);
  assert.ok(rig.pocketHolster && rig.backHolster, 'Player rig must have pocketHolster and backHolster');
  const scene = new THREE.Scene();
  scene.add(rig.root);
  const ws = new WeaponSystem(rig.weaponMount, { castRay: () => null }, new VFXSystem(scene), rig.pocketHolster, rig.backHolster);
  assert.equal(ws.isHolstered, true, 'Gun starts tucked safely in hip pocket');
  assert.equal(rig.pocketHolster.children.length, 1, 'Pistol mesh must visibly sit inside pocketHolster');

  let drawnFired = 0;
  ws.onWeaponDrawn = () => { drawnFired++; };
  ws.equip('deagle');
  assert.equal(drawnFired, 1, 'Choosing a firearm triggers draw-from-pocket event');
  ws.update(0.2, true);
  assert.equal(ws.isHolstered, false, 'Gun is drawn into shooting hand');
  assert.equal(rig.weaponMount.children.length >= 2, true, 'Gun moved into weaponMount (plus muzzleTip)');

  // All hostile NPC archetypes hold a real 3D gun with muzzleTip
  for (const arch of ['grunt', 'shooter', 'brute', 'boss']) {
    const npc = buildNPCCharacter('rival', arch, 0xff2e88, 1);
    assert.equal(npc.hasGun, true, `Rival ${arch} must carry a real 3D gun`);
    assert.ok(npc.muzzleTip.parent, `Rival ${arch} gun must have muzzleTip attached`);
  }
  const police = buildNPCCharacter('police', 'shooter', 0x1e3a8a, 2);
  assert.equal(police.hasGun, true, 'Metro Patrol police must carry a real 3D gun');
  console.log('✓ Test 4: Pocket gun holster, draw-from-pocket & real 3D enemy guns passed');
}

console.log('\nALL PHASE A & COMBAT UNIT TESTS PASSED!');
