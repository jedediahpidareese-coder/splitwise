import { isCloudMode } from './lib/supabase'
import LocalApp from './app/LocalApp'
import CloudApp from './app/CloudApp'

// Cloud mode (sign-in + sync) when Supabase env vars are set; otherwise local.
export default function App() {
  return isCloudMode ? <CloudApp /> : <LocalApp />
}
