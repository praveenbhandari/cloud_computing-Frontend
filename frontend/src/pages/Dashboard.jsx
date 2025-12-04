import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { encrypt, generateSalt } from '../utils/crypto';
import Header from '../components/Header';
import VaultModal from '../components/VaultModal';
import UnlockVault from '../components/UnlockVault';
import { VaultIcon, PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

function Dashboard() {
  const { user } = useAuth();
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVault, setEditingVault] = useState(null);
  const [unlockingVault, setUnlockingVault] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPasswordSetup, setShowMasterPasswordSetup] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      setLoading(true);
      const data = await api.listVaults();
      setVaults(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load vaults');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async (vaultData) => {
    try {
      if (!masterPassword) {
        setError('Please set a master password first');
        setShowMasterPasswordSetup(true);
        return;
      }

      const salt = generateSalt();
      const encryptedSecret = await encrypt(
        vaultData.secret,
        masterPassword,
        salt
      );

      const vault = {
        name: vaultData.name,
        encryptedSecret,
        salt
      };

      await api.createVault(vault);
      await loadVaults();
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to create vault');
    }
  };

  const handleUpdateVault = async (vaultData) => {
    try {
      if (!masterPassword) {
        setError('Master password required to update');
        return;
      }

      const salt = editingVault.salt;
      const encryptedSecret = vaultData.secret !== editingVault.encryptedSecret
        ? await encrypt(vaultData.secret, masterPassword, salt)
        : editingVault.encryptedSecret;

      await api.updateVault(editingVault.vaultId, {
        name: vaultData.name,
        encryptedSecret
      });

      await loadVaults();
      setShowModal(false);
      setEditingVault(null);
    } catch (err) {
      setError(err.message || 'Failed to update vault');
    }
  };

  const handleDeleteVault = async (vaultId) => {
    if (!confirm('Are you sure you want to delete this vault?')) return;

    try {
      await api.deleteVault(vaultId);
      await loadVaults();
    } catch (err) {
      setError(err.message || 'Failed to delete vault');
    }
  };

  const handleSetMasterPassword = () => {
    if (!newMasterPassword || newMasterPassword.length < 8) {
      setError('Master password must be at least 8 characters');
      return;
    }
    setMasterPassword(newMasterPassword);
    setNewMasterPassword('');
    setShowMasterPasswordSetup(false);
  };

  const handleSaveVault = (vaultData) => {
    if (editingVault) {
      handleUpdateVault(vaultData);
    } else {
      handleCreateVault(vaultData);
    }
  };

  if (unlockingVault) {
    return (
      <div className="app">
        <Header />
        <UnlockVault
          vault={unlockingVault}
          masterPassword={masterPassword}
          onClose={() => setUnlockingVault(null)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">My Vaults</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!masterPassword) {
                setShowMasterPasswordSetup(true);
              } else {
                setShowModal(true);
                setEditingVault(null);
              }
            }}
          >
            <PlusIcon />
            New Vault
          </button>
        </div>

        {!masterPassword && (
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Set Master Password</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
              Your master password is used to encrypt and decrypt your vaults. 
              It is never sent to the server.
            </p>
            {showMasterPasswordSetup ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Master Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newMasterPassword}
                    onChange={(e) => setNewMasterPassword(e.target.value)}
                    placeholder="Enter master password"
                    minLength={8}
                  />
                  <div className="form-hint">Must be at least 8 characters</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleSetMasterPassword}
                >
                  Set Master Password
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setShowMasterPasswordSetup(true)}
              >
                Set Master Password
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p>Loading vaults...</p>
          </div>
        ) : vaults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <VaultIcon />
            </div>
            <h2 className="empty-state-title">No vaults yet</h2>
            <p>Create your first vault to get started</p>
          </div>
        ) : (
          <div className="vault-grid">
            {vaults.map((vault) => (
              <div key={vault.vaultId} className="vault-card">
                <div className="vault-card-header">
                  <div className="vault-icon">
                    <VaultIcon />
                  </div>
                  <div>
                    <div className="vault-name">{vault.name}</div>
                    <div className="vault-meta">Encrypted</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setUnlockingVault(vault)}
                    style={{ flex: 1 }}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingVault(vault);
                      setShowModal(true);
                    }}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteVault(vault.vaultId)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <VaultModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingVault(null);
        }}
        onSave={handleSaveVault}
        vault={editingVault}
      />
    </div>
  );
}

export default Dashboard;

