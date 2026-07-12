import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import FullScreenLoader from '../components/FullScreenLoader'

/** Gate for guest-only pages (login/register). Sends signed-in users to the app. */
export default function GuestRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <FullScreenLoader />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
