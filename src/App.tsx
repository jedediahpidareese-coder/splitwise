import { isCloudMode } from './lib/supabase'
import { DialogProvider } from './components/dialog'
import LocalApp from './app/LocalApp'
import CloudApp from './app/CloudApp'

// Cloud mode (sign-in + sync) when Supabase env vars are set; otherwise local.
export default function App() {
  return (
    <DialogProvider>
      {isCloudMode ? <CloudApp /> : <LocalApp />}
    </DialogProvider>
  )
}
