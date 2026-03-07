import ApiKeyManager from '@/components/settings/ApiKeyManager'
import FabricWizard from '@/components/ideas/FabricWizard'

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      <ApiKeyManager />

      <div className="border-t border-gray-200 pt-8">
        <FabricWizard />
      </div>

      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Variables de Entorno</h2>
        <p className="text-sm text-gray-500 mb-3">
          Las API keys también se pueden configurar via variables de entorno. Los valores en esta pantalla tienen prioridad.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 space-y-1">
          <p>OPENAI_API_KEY=sk-...</p>
          <p>ANTHROPIC_API_KEY=sk-ant-...</p>
        </div>
      </div>
    </div>
  )
}
