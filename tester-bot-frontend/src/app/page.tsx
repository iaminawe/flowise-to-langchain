import { Metadata } from 'next'
import { App } from '@/components/App'

export const metadata: Metadata = {
  title: 'Tester Bot - Flowise to LangChain Converter',
  description: 'Test and convert your Flowise flows to LangChain applications',
}

export default function HomePage() {
  return <App />
}
