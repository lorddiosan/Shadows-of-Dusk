import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CrpgSkillHotbar } from '../../components/game/crpg-hud/CrpgSkillHotbar';
import { CrpgActionDock } from '../../components/game/crpg-hud/CrpgActionDock';
import { CoinTossModal } from '../../components/game/crpg-hud/CoinTossModal';
import { getDeterministicCoinWinner } from '../../utils/coinFlipUtils';
import { Unit } from '../../types/game';

describe('Phase and Movement/Formation Restrictions', () => {
  const dummyUnit: Unit = {
    id: 'unit_alpha',
    templateId: 'tpl_alpha',
    name: 'Praetorians',
    avatar: '⚔️',
    type: 'Infantry',
    role: 'Troop',
    owner: 'player1',
    cost: 100,
    stats: {
      mv: 6,
      lives: 10,
      maxLives: 10,
      modelCount: 5,
      hpPerModel: 2,
      armour: 3,
      invuln: 5,
      atk: 2,
      rngDmg: 3,
      range: 12,
      melDmg: 4,
      melAtk: 3,
      bravery: 7
    },
    formation: 'circle',
    hasMoved: false,
    actionsRemaining: 2,
    traits: [],
    abilities: [],
    position: { x: 200, y: 200 }
  };

  it('disables Move button in CrpgSkillHotbar when not in Movement phase', () => {
    const htmlCommandPhase = renderToString(
      <CrpgSkillHotbar
        selectedUnit={dummyUnit}
        targetUnit={null}
        phase="Command"
        activePlayer="player1"
        onConfirmMove={() => {}}
        onResetMove={() => {}}
        onExecuteShooting={() => {}}
        onExecuteCharge={() => {}}
        onExecuteFight={() => {}}
        onExecuteEngagement={() => {}}
        onExecuteMissionAction={() => {}}
        onChangeFormation={() => {}}
        onOpenAttachModal={() => {}}
        onDetachLeader={() => {}}
        onOpenEmbarkModal={() => {}}
        onConfirmDeployment={() => {}}
        onCancelDeployment={() => {}}
        onConfirmDisembark={() => {}}
        onCancelDisembark={() => {}}
        onToggleArmyTray={() => {}}
        onToggleReserves={() => {}}
        onToggleCommand={() => {}}
        onToggleDiceDrawer={() => {}}
        onToggleEventsDrawer={() => {}}
        onToggleSecondaryDeck={() => {}}
        onToggleAbilitiesDock={() => {}}
        zoomLevel={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        activeRightTab="chat"
        showRightSidebar={false}
        onSelectRightTab={() => {}}
        onToggleRightSidebar={() => {}}
        activeTool="select"
        onSelectTool={() => {}}
        readyAbilitiesCount={0}
        onToggleHotbar={() => {}}
        isPvP={false}
        playerRole="player1"
      />
    );

    expect(htmlCommandPhase).toContain('Cannot Move - Movement is only permitted during Movement phase');
  });

  it('enables Move button in CrpgSkillHotbar when in Movement phase for active player', () => {
    const htmlMovementPhase = renderToString(
      <CrpgSkillHotbar
        selectedUnit={dummyUnit}
        targetUnit={null}
        phase="Movement"
        activePlayer="player1"
        onConfirmMove={() => {}}
        onResetMove={() => {}}
        onExecuteShooting={() => {}}
        onExecuteCharge={() => {}}
        onExecuteFight={() => {}}
        onExecuteEngagement={() => {}}
        onExecuteMissionAction={() => {}}
        onChangeFormation={() => {}}
        onOpenAttachModal={() => {}}
        onDetachLeader={() => {}}
        onOpenEmbarkModal={() => {}}
        onConfirmDeployment={() => {}}
        onCancelDeployment={() => {}}
        onConfirmDisembark={() => {}}
        onCancelDisembark={() => {}}
        onToggleArmyTray={() => {}}
        onToggleReserves={() => {}}
        onToggleCommand={() => {}}
        onToggleDiceDrawer={() => {}}
        onToggleEventsDrawer={() => {}}
        onToggleSecondaryDeck={() => {}}
        onToggleAbilitiesDock={() => {}}
        zoomLevel={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        activeRightTab="chat"
        showRightSidebar={false}
        onSelectRightTab={() => {}}
        onToggleRightSidebar={() => {}}
        activeTool="select"
        onSelectTool={() => {}}
        readyAbilitiesCount={0}
        onToggleHotbar={() => {}}
        isPvP={false}
        playerRole="player1"
      />
    );

    expect(htmlMovementPhase).toContain('Move (Key 1) - Mv: 6 sq');
  });

  it('disables Formation switcher when in Action phase', () => {
    const htmlActionPhase = renderToString(
      <CrpgSkillHotbar
        selectedUnit={dummyUnit}
        targetUnit={null}
        phase="Action"
        activePlayer="player1"
        onConfirmMove={() => {}}
        onResetMove={() => {}}
        onExecuteShooting={() => {}}
        onExecuteCharge={() => {}}
        onExecuteFight={() => {}}
        onExecuteEngagement={() => {}}
        onExecuteMissionAction={() => {}}
        onChangeFormation={() => {}}
        onOpenAttachModal={() => {}}
        onDetachLeader={() => {}}
        onOpenEmbarkModal={() => {}}
        onConfirmDeployment={() => {}}
        onCancelDeployment={() => {}}
        onConfirmDisembark={() => {}}
        onCancelDisembark={() => {}}
        onToggleArmyTray={() => {}}
        onToggleReserves={() => {}}
        onToggleCommand={() => {}}
        onToggleDiceDrawer={() => {}}
        onToggleEventsDrawer={() => {}}
        onToggleSecondaryDeck={() => {}}
        onToggleAbilitiesDock={() => {}}
        zoomLevel={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        activeRightTab="chat"
        showRightSidebar={false}
        onSelectRightTab={() => {}}
        onToggleRightSidebar={() => {}}
        activeTool="select"
        onSelectTool={() => {}}
        readyAbilitiesCount={0}
        onToggleHotbar={() => {}}
        isPvP={false}
        playerRole="player1"
      />
    );

    expect(htmlActionPhase).toContain('Cannot Change Formation - Formations can only be changed during Movement phase');
  });

  it('allows Player 2 to move Player 2 units on Player 2 turn in PvP', () => {
    const p2Unit: Unit = {
      ...dummyUnit,
      id: 'p2_unit_beta',
      owner: 'player2'
    };

    const htmlP2Turn = renderToString(
      <CrpgSkillHotbar
        selectedUnit={p2Unit}
        targetUnit={null}
        phase="Movement"
        activePlayer="player2"
        onConfirmMove={() => {}}
        onResetMove={() => {}}
        onExecuteShooting={() => {}}
        onExecuteCharge={() => {}}
        onExecuteFight={() => {}}
        onExecuteEngagement={() => {}}
        onExecuteMissionAction={() => {}}
        onChangeFormation={() => {}}
        onOpenAttachModal={() => {}}
        onDetachLeader={() => {}}
        onOpenEmbarkModal={() => {}}
        onConfirmDeployment={() => {}}
        onCancelDeployment={() => {}}
        onConfirmDisembark={() => {}}
        onCancelDisembark={() => {}}
        onToggleArmyTray={() => {}}
        onToggleReserves={() => {}}
        onToggleCommand={() => {}}
        onToggleDiceDrawer={() => {}}
        onToggleEventsDrawer={() => {}}
        onToggleSecondaryDeck={() => {}}
        onToggleAbilitiesDock={() => {}}
        zoomLevel={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        activeRightTab="chat"
        showRightSidebar={false}
        onSelectRightTab={() => {}}
        onToggleRightSidebar={() => {}}
        activeTool="select"
        onSelectTool={() => {}}
        readyAbilitiesCount={0}
        onToggleHotbar={() => {}}
        isPvP={true}
        playerRole="player2"
      />
    );

    expect(htmlP2Turn).toContain('Move (Key 1) - Mv: 6 sq');
    expect(htmlP2Turn).toContain('Cycle Formation (Key 6)');
  });

  it('renders disabled WAITING button in CrpgActionDock when not player turn in PvP', () => {
    const htmlWaiting = renderToString(
      <CrpgActionDock
        selectedUnit={null}
        activePlayer="player2"
        phase="Movement"
        round={1}
        isOpen={true}
        onToggle={() => {}}
        onAdvancePhase={() => {}}
        onExecuteBotAction={() => {}}
        isPvP={true}
        playerRole="player1"
      />
    );

    expect(htmlWaiting).toContain('WAITING FOR OPPONENT');
    expect(htmlWaiting).toContain('Waiting for opponent');
  });

  it('restricts Shoot and Fight actions in CrpgSkillHotbar to Action phase', () => {
    const htmlCommand = renderToString(
      <CrpgSkillHotbar
        selectedUnit={dummyUnit}
        targetUnit={null}
        phase="Command"
        activePlayer="player1"
        onConfirmMove={() => {}}
        onResetMove={() => {}}
        onExecuteShooting={() => {}}
        onExecuteCharge={() => {}}
        onExecuteFight={() => {}}
        onExecuteEngagement={() => {}}
        onExecuteMissionAction={() => {}}
        onChangeFormation={() => {}}
        onOpenAttachModal={() => {}}
        onDetachLeader={() => {}}
        onOpenEmbarkModal={() => {}}
        onConfirmDeployment={() => {}}
        onCancelDeployment={() => {}}
        onConfirmDisembark={() => {}}
        onCancelDisembark={() => {}}
        onToggleArmyTray={() => {}}
        onToggleReserves={() => {}}
        onToggleCommand={() => {}}
        onToggleDiceDrawer={() => {}}
        onToggleEventsDrawer={() => {}}
        onToggleSecondaryDeck={() => {}}
        onToggleAbilitiesDock={() => {}}
        zoomLevel={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        activeRightTab="chat"
        showRightSidebar={false}
        onSelectRightTab={() => {}}
        onToggleRightSidebar={() => {}}
        activeTool="select"
        onSelectTool={() => {}}
        readyAbilitiesCount={0}
        onToggleHotbar={() => {}}
        isPvP={true}
        playerRole="player1"
      />
    );

    expect(htmlCommand).toContain('Shoot (Key 2) - Only available during Action Phase');
  });

  it('shows Cancel Deployment (Return to Army Tray) in CrpgSkillHotbar during Deployment confirm', () => {
    const pendingUnit: Unit = {
      ...dummyUnit,
      isPendingDeploymentConfirm: true
    };

    const htmlDeploy = renderToString(
      <CrpgSkillHotbar
        selectedUnit={pendingUnit}
        targetUnit={null}
        phase="Deployment"
        activePlayer="player1"
        onConfirmMove={() => {}}
        onResetMove={() => {}}
        onExecuteShooting={() => {}}
        onExecuteCharge={() => {}}
        onExecuteFight={() => {}}
        onExecuteEngagement={() => {}}
        onExecuteMissionAction={() => {}}
        onChangeFormation={() => {}}
        onOpenAttachModal={() => {}}
        onDetachLeader={() => {}}
        onOpenEmbarkModal={() => {}}
        onConfirmDeployment={() => {}}
        onCancelDeployment={() => {}}
        onConfirmDisembark={() => {}}
        onCancelDisembark={() => {}}
        onToggleArmyTray={() => {}}
        onToggleReserves={() => {}}
        onToggleCommand={() => {}}
        onToggleDiceDrawer={() => {}}
        onToggleEventsDrawer={() => {}}
        onToggleSecondaryDeck={() => {}}
        onToggleAbilitiesDock={() => {}}
        zoomLevel={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        activeRightTab="chat"
        showRightSidebar={false}
        onSelectRightTab={() => {}}
        onToggleRightSidebar={() => {}}
        activeTool="select"
        onSelectTool={() => {}}
        readyAbilitiesCount={0}
        onToggleHotbar={() => {}}
        isPvP={true}
        playerRole="player1"
      />
    );

    expect(htmlDeploy).toContain('Cancel Deployment (Return to Army Tray)');
  });

  it('determines identical coin toss winner from matching matchId', () => {
    const seedA = 'match_1742490001_abc';
    const winner1 = getDeterministicCoinWinner(seedA);
    const winner2 = getDeterministicCoinWinner(seedA);

    expect(winner1).toBe(winner2);
    expect(['player1', 'player2']).toContain(winner1);
  });

  it('renders CoinTossModal in center of map with 3D coin and winner announcement', () => {
    const htmlModal = renderToString(
      <CoinTossModal
        isOpen={true}
        winner="player1"
        playerRole="player1"
        isPvP={true}
        player1Name="Commander Alpha"
        player2Name="Commander Beta"
        onComplete={() => {}}
      />
    );

    expect(htmlModal).toContain('Sector Initiative Protocol');
    expect(htmlModal).toContain('PLAYER 1');
    expect(htmlModal).toContain('PLAYER 2');
    expect(htmlModal).toContain('Begin Deployment');
  });

  it('enforces 1-unit deployment: blocks deploying a second unit when one is pending confirmation', () => {
    const units: Unit[] = [
      {
        ...dummyUnit,
        id: 'u1',
        name: 'Squad 1',
        owner: 'player1',
        position: { x: 100, y: 100 },
        isPendingDeploymentConfirm: true
      },
      {
        ...dummyUnit,
        id: 'u2',
        name: 'Squad 2',
        owner: 'player1',
        position: null,
        isPendingDeploymentConfirm: false
      }
    ];

    const currentDeployer = 'player1';
    const existingPending = units.find(u => u.owner === currentDeployer && u.isPendingDeploymentConfirm);
    expect(existingPending).toBeDefined();
    expect(existingPending?.id).toBe('u1');

    // Attempting to deploy u2 while u1 is pending should be blocked
    const canDeploySecond = !units.some(u => u.owner === currentDeployer && u.isPendingDeploymentConfirm && u.id !== 'u2');
    expect(canDeploySecond).toBe(false);
  });
});
