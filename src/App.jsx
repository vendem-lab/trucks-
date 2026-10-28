import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import MemberLayout from './components/MemberLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { useEffect } from 'react';
import { startLiveStore } from './lib/store.js';
import { useAuth } from './context/authContext.js';

function LiveDataProvider({ children }) {
  const { session, authLoading } = useAuth();
  useEffect(() => {
    if (authLoading) return undefined;
    return startLiveStore(session);
  }, [session?.uid, session?.role, session?.memberId, authLoading]);
  return children;
}

import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Loads from './pages/Loads.jsx';
import Membership from './pages/Membership.jsx';
import News from './pages/News.jsx';
import NewsArticle from './pages/NewsArticle.jsx';
import Events from './pages/Events.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';

import PortalOverview from './pages/portal/Overview.jsx';
import PortalProfile from './pages/portal/Profile.jsx';
import PortalDues from './pages/portal/Dues.jsx';
import PortalAlerts from './pages/portal/Alerts.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import Members from './pages/admin/Members.jsx';
import LoadsAdmin from './pages/admin/Loads.jsx';
import DuesAdmin from './pages/admin/Dues.jsx';
import NewsAdmin from './pages/admin/NewsAdmin.jsx';
import EventsAdmin from './pages/admin/EventsAdmin.jsx';
import Enquiries from './pages/admin/Enquiries.jsx';
import Settings from './pages/admin/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LiveDataProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/loads" element={<Loads />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsArticle />} />
              <Route path="/events" element={<Events />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/login" element={<Login />} />

            <Route
              path="/portal"
              element={
                <ProtectedRoute role="member">
                  <MemberLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PortalOverview />} />
              <Route path="profile" element={<PortalProfile />} />
              <Route path="dues" element={<PortalDues />} />
              <Route path="alerts" element={<PortalAlerts />} />
              <Route path="*" element={<Navigate to="/portal" replace />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute role="staff">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="loads" element={<LoadsAdmin />} />
              <Route path="dues" element={<DuesAdmin />} />
              <Route path="news" element={<NewsAdmin />} />
              <Route path="events" element={<EventsAdmin />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
          </LiveDataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
