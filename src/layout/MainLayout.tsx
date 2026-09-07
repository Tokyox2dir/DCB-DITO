import { Outlet } from 'react-router-dom'
import TopNavBar from '../components/TopNavBar'

export default function MainLayout() {
  return (
    <div className='aura-v2-shell'>
      <TopNavBar />
      <div className='aura-v2-content'>
        <Outlet />
      </div>
    </div>
  )
}
