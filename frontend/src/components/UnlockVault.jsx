import { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, CopyIcon } from './Icons';
import { decrypt } from '../utils/crypto';

function UnlockVault({ vault, masterPassword, onClose }) {
  const [password, setPassword] = useState(masterPassword || '');
  const [decryptedSecret, setDecryptedSecret] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleUnlock = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const decrypted = await decrypt(
        vault.encryptedSecret,
        password,
        vault.salt
      );
      setDecryptedSecret(decrypted);
    } catch (err) {
      setError(err.message || 'Failed to decrypt. Wrong password?');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (decryptedSecret) {
      navigator.clipboard.writeText(decryptedSecret);
    }
  };

  if (decryptedSecret) {
    return (
      <div className="unlock-container">
        <div className="unlock-card">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">{vault.name}</h2>
              <button className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="secret-display">
              {showSecret ? decryptedSecret : '••••••••••••'}
            </div>
            <div className="secret-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOffIcon /> : <EyeIcon />}
                {showSecret ? ' Hide' : ' Show'}
              </button>
              <button className="btn btn-secondary" onClick={handleCopy}>
                <CopyIcon />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unlock-container">
      <div className="unlock-card">
        <div className="unlock-icon">
          <LockIcon />
        </div>
        <h2 className="unlock-title">Unlock Vault</h2>
        <p className="unlock-subtitle">Enter your master password to decrypt</p>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <div className="form-group">
          <label className="form-label">Master Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Enter master password"
            autoFocus
          />
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleUnlock}
          disabled={loading || !password}
          style={{ width: '100%' }}
        >
          {loading ? <span className="spinner" /> : 'Unlock'}
        </button>
      </div>
    </div>
  );
}

export default UnlockVault;

