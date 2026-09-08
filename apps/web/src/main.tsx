import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './auth/Auth';
import { Shell } from './layouts/Shell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Prospects } from './pages/Prospects';
import { ProspectDetail } from './pages/ProspectDetail';
import { Records } from './pages/Records';
import { Today } from './pages/Today';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { LoadingState } from './components/ui';
import './styles.css';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: true },
  },
});
function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="today" element={<Today />} />
          <Route path="prospects" element={<Prospects />} />
          <Route path="prospects/:id" element={<ProspectDetail />} />
          <Route path="pipeline" element={<Prospects pipeline />} />
          {['followups', 'meetings', 'deals', 'clients', 'outreach'].map(
            (kind) => (
              <Route
                key={kind}
                path={kind}
                element={<Records key={kind} kind={kind} />}
              />
            ),
          )}
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <Link to="/">Return to dashboard</Link>
              </div>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
