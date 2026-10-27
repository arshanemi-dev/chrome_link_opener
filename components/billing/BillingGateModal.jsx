'use client'

import AccessUnauthorizedModal from './AccessUnauthorizedModal'
import InsufficientCoinsModal from './InsufficientCoinsModal'
import BillingErrorModal from './BillingErrorModal'

// Orchestrator — driven by the `gate` an add/renew returned when the hub
// refused to charge for it (lib/linkOpener/useLinks.js). Unlike the export
// tools, here the charge IS the gate: nothing was saved when this shows.
export default function BillingGateModal({ gate, onClose, onRetry }) {
  if (!gate) return null
  const { reason, data } = gate

  // The shared login-required modal (components/auth/LoginRequiredModal.jsx,
  // mounted once app-wide via AuthGateProvider) already reacted to the 401.
  if (reason === 'login_required') return null

  if (reason === 'insufficient_coins' || reason === 'coins_expired') {
    return <InsufficientCoinsModal open onClose={onClose} reason={reason} data={data} />
  }
  if (reason === 'error') {
    return <BillingErrorModal open onClose={onClose} onRetry={onRetry} data={data} />
  }
  if (reason === 'activation_required') {
    return (
      <AccessUnauthorizedModal
        open
        onClose={onClose}
        message={`${data?.featureTitle ?? 'Saving links'} isn't activated for your account yet. Contact your admin to enable this feature.`}
      />
    )
  }
  return (
    <AccessUnauthorizedModal
      open
      onClose={onClose}
      toolTitle="Chrome Link Opener"
      message={reason === 'feature_unavailable' ? 'Saving links to your account isn’t available right now. Please try again later.' : undefined}
    />
  )
}
