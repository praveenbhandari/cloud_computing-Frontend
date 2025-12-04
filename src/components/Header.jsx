import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOutIcon, VaultIcon } from './Icons';

function Header() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="header">
      <Link to="/dashboard" className="header-logo">
        <VaultIcon />
        <h1>Zero<span>Vault</span></h1>
      </Link>
      <div className="header-nav">
        {user && (
          <>
            <div className="header-user">{user.email}</div>
            <button className="btn btn-ghost" onClick={handleLogout} title="Logout">
              <LogOutIcon />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;

