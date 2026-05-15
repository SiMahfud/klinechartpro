import { Component, createSignal, createEffect } from 'solid-js'
import { Modal } from '../../component'
import i18n from '../../i18n'

export interface PineEditorModalProps {
  locale: string
  visible: boolean
  onClose: () => void
  onApply: (code: string) => void
  initialCode?: string
}

const DEFAULT_PINE = `//@version=5
indicator("My Custom SMA", overlay=true)
length = input.int(14, "Length")
plot(ta.sma(close, length), "SMA", color=color.blue, linewidth=2)
`

const PineEditorModal: Component<PineEditorModalProps> = props => {
  const [code, setCode] = createSignal(props.initialCode || DEFAULT_PINE)

  createEffect(() => {
    if (props.visible) {
      setCode(props.initialCode || DEFAULT_PINE)
    }
  })

  return (
    <Modal
      title="Pine Script Editor"
      onClose={props.onClose}
      width={600}
      buttons={[
        {
          children: i18n('confirm', props.locale),
          onClick: () => {
            props.onApply(code())
            props.onClose()
          }
        }
      ]}>
      <div style={{ padding: '10px' }}>
        <p style={{ "font-size": '12px', "margin-bottom": '10px', color: 'var(--klinecharts-pro-text-second-color)' }}>
          Write or paste Pine Script (v5) here. Supported functions include basic ta.*, math.*, and plot/hline.
        </p>
        <textarea
          value={code()}
          onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
          style={{
            width: '100%',
            height: '300px',
            "font-family": 'monospace',
            padding: '10px',
            "background-color": 'var(--klinecharts-pro-popover-background-color)',
            color: 'var(--klinecharts-pro-text-color)',
            border: '1px solid var(--klinecharts-pro-border-color)',
            "border-radius": '4px',
            resize: 'vertical'
          }}
          spellcheck={false}
        />
      </div>
    </Modal>
  )
}

export default PineEditorModal
