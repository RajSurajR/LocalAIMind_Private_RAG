import { useEffect } from 'react'

import { ChatPage } from './pages/ChatPage'
import { LoadingPage } from './pages/LoadingPage'
import { useSidebarStore } from './store/sidebarStore'

function App() {
  const isInitializing = useSidebarStore((state) => state.isInitializing)
  const initializeSidebar = useSidebarStore((state) => state.initializeSidebar)

  useEffect(() => {
    initializeSidebar()
  }, [initializeSidebar])

  if (isInitializing) {
    return <LoadingPage />
  }

  return <ChatPage />
}

export default App