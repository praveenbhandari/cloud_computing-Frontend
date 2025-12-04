import { useState } from 'react';
import { XIcon } from './Icons';

function VaultModal({ isOpen, onClose, onSave, vault = null }) {
  const [name, setName] = useState(vault?.name || '');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!vault && !secret.trim()) {
      setError('Secret is required');
      return;
    }

    onSave({
      name: name.trim(),
      secret: secret.trim() || vault?.encryptedSecret
    });

    // Reset form
    setName('');
    setSecret('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{vault ? 'Edit Vault' : 'Create Vault'}</h2>
          <button className="modal-close" onClick={onClose}>
            <XIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Gmail Password"
                required
              />
            </div>

            {!vault && (
              <div className="form-group">
                <label className="form-label">Secret</label>
                <textarea
                  className="form-input"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter your secret..."
                  required
                />
                <div className="form-hint">This will be encrypted before storage</div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {vault ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VaultModal;

