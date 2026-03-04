import ApiKeyManager from '@/components/settings/ApiKeyManager'

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Configuración</h1>
      <ApiKeyManager />
    </div>
  )
}
