import { useLocalStore } from '../data/useLocalStore'
import MainShell from './MainShell'

// No sign-in, data on this device only.
export default function LocalApp() {
  const { store, session } = useLocalStore()
  return <MainShell store={store} session={session} />
}
