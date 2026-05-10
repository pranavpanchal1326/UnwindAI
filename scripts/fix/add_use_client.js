const fs = require('fs');
const path = require('path');

const files = [
  'app/intake/IntakeMessage.jsx',
  'app/intake/IntakeInput.jsx',
  'app/intake/IntakeThinkingIndicator.jsx',
  'app/intake/IntakeCompletion.jsx',
  'app/dashboard/SituationRoom.jsx',
  'app/dashboard/DashboardHeader.jsx',
  'app/dashboard/RiskScoreDisplay.jsx',
  'app/dashboard/ProfessionalGrid.jsx',
  'app/dashboard/DecisionInboxBadge.jsx',
  'app/dashboard/TimelineSummary.jsx',
  'app/dashboard/CaseDNA.jsx',
  'app/dashboard/MLPhaseTimeline.jsx',
  'app/dashboard/CostTracker.jsx',
  'app/dashboard/[case_id]/decisions/DecisionInbox.jsx',
  'app/dashboard/[case_id]/decisions/DecisionCard.jsx',
  'app/dashboard/[case_id]/decisions/TwoAMPrompt.jsx',
  'app/settlement/SettlementSimulatorPage.jsx',
  'app/settlement/PathCards.jsx',
  'app/settlement/SHAPExplanation.jsx',
  'app/settlement/SimilarCasesPanel.jsx',
  'app/settlement/WhatIfSimulator.jsx',
  'app/settlement/AnomalyWarning.jsx',
  'app/settlement/DisclaimerModal.jsx',
  'app/settlement/DisclaimerFooter.jsx',
  'app/vault/DocumentVault.jsx',
  'app/vault/WalletConnect.jsx',
  'app/professional/ProfessionalDashboard.jsx',
  'app/professional/ProfessionalHeader.jsx',
  'app/professional/PendingVerification.jsx',
  'app/professional/TaskInbox.jsx',
  'app/professional/TrustScoreCard.jsx',
  'app/professional/DocumentAccessPanel.jsx',
  'app/professional/signin/ProfessionalSignInPage.jsx',
  'app/settings/EmotionShieldConsent.jsx',
  'app/settings/DeadManSwitchCard.jsx',
  'app/settings/SettingsPage.jsx',
  'app/kids/KidsFirstPage.jsx',
  'app/components/ui/EmptyState.jsx',
  'app/components/ui/ErrorCard.jsx',
  'app/components/ui/PrivateMode.jsx',
  'app/components/ui/Skeleton.jsx',
  'app/components/ui/RiskBadge.jsx',
  'app/components/ui/TrustBadge.jsx',
  'lib/resilience/SyncManager.jsx',
  'lib/resilience/localStorage.js'
];

let addedCount = 0;

files.forEach(f => {
  const filePath = path.join(process.cwd(), f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes("'use client'") && !content.includes('"use client"')) {
      content = "'use client'\n" + content;
      fs.writeFileSync(filePath, content, 'utf8');
      addedCount++;
    }
  }
});
console.log('Added use client to ' + addedCount + ' files.');
