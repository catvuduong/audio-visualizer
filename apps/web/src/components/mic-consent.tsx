interface MicConsentProps {
  onAllow: () => void;
  onCancel: () => void;
}

/**
 * Explains the microphone request before the browser shows its own permission prompt.
 */
export function MicConsent({ onAllow, onCancel }: MicConsentProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mic-consent-title" data-testid="mic-consent">
        <h2 id="mic-consent-title">Use your microphone?</h2>
        <p>
          Your browser will ask for permission next. The sound is analysed live on this device to draw the
          visuals. Nothing is recorded or uploaded.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary" data-testid="mic-cancel" onClick={onCancel}>
            Not now
          </button>
          <button type="button" className="primary" data-testid="mic-allow" onClick={onAllow}>
            Allow microphone
          </button>
        </div>
      </div>
    </div>
  );
}
