import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';
import { RouterProvider } from './router';

function App() {
  const { booting, isAuthenticated } = useAuth();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">
        正在校验登录态...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <RouterProvider />;
}

export default App;
