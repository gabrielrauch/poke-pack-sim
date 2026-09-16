import { createApp } from './api/app'
import { createProvider } from './provider'

export default createApp({ provider: createProvider() })
