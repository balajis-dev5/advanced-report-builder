import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import FullScreenLoader from '../components/FullScreenLoader'

/** Gate for authenticated areas. Redirects to /login when there is no user. */
export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
