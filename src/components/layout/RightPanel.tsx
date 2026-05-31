import { useUiStore } from '../../store/uiStore'
import { BasicFields } from '../editor/BasicFields'
import { AdvancedFields } from '../editor/AdvancedFields'
import { GreetingEditor } from '../editor/GreetingEditor'
import { TagEditor } from '../editor/TagEditor'
import { WorldBookPanel } from '../worldbook/WorldBookPanel'
import { JsonView } from '../preview/JsonView'
import { CardView } from '../preview/CardView'

export function RightPanel() {
  const { rightTab, setRightTab } = useUiStore()

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white">
      <div className="flex items-center border-b border-gray-200 bg-gray-50 overflow-x-auto">
        <button
          className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${rightTab === 'editor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRightTab('editor')}
        >
          ✏️ 编辑
        </button>
        <button
          className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${rightTab === 'json' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRightTab('json')}
        >
          📄 JSON
        </button>
        <button
          className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${rightTab === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRightTab('preview')}
        >
          🖼️ 预览
        </button>
        <div className="flex-1" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {rightTab === 'editor' && (
          <div className="space-y-6">
            <BasicFields />
            <GreetingEditor />
            <TagEditor />
            <AdvancedFields />
            <WorldBookPanel />
          </div>
        )}
        {rightTab === 'json' && <JsonView />}
        {rightTab === 'preview' && <CardView />}
      </div>
    </div>
  )
}
