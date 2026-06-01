import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Array<'student' | 'teacher' | 'admin'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse font-medium">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to Auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated but does not match required role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(`Access denied. Role ${user.role} is not permitted.`);
    
    // Redirect admins to /admin, others to /dashboard (which handles student/teacher routing)
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Permitted -> render nested routes
  return <Outlet />;
};

export default ProtectedRoute;
