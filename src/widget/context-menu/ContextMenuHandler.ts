import { Chart } from 'klinecharts'

export interface ContextMenuActionParams {
  key: string
  overlayId: string
  widget: Chart | null
  widgetRef: HTMLDivElement | undefined
  theme: string
  gridVisible: boolean
  setGridVisible: (visible: boolean) => void
  setStyleEditorOverlayId: (id: string) => void
  setStyleEditorCurrentStyles: (styles: any) => void
  setStyleEditorVisible: (visible: boolean) => void
  setIndicatorModalVisible: (visible: boolean) => void
  setSettingModalVisible: (visible: boolean) => void
  setScreenshotUrl: (url: string) => void
  setContextMenuVisible: (visible: boolean) => void
  saveDrawings: () => void
}

export function handleContextMenuAction(params: ContextMenuActionParams) {
  const {
    key, overlayId, widget, widgetRef, theme, gridVisible,
    setGridVisible, setStyleEditorOverlayId, setStyleEditorCurrentStyles,
    setStyleEditorVisible, setIndicatorModalVisible, setSettingModalVisible,
    setScreenshotUrl, setContextMenuVisible, saveDrawings
  } = params

  switch (key) {
    // --- Overlay actions ---
    case 'edit_style': {
      setStyleEditorOverlayId(overlayId)
      // Read current styles from the overlay instance
      try {
        const overlayStore = (widget as any)?._chartStore?.()?.getOverlayStore?.()
        const overlays = overlayStore?.getInstances?.() ?? []
        const o = overlays.find((ov: any) => ov.id === overlayId)
        const s = o?.styles ?? {}
        setStyleEditorCurrentStyles({
          lineColor: s?.line?.color ?? s?.polygon?.borderColor,
          lineWidth: s?.line?.size ?? s?.polygon?.borderSize,
          lineStyle: s?.line?.style ?? s?.polygon?.borderStyle,
          fillColor: s?.polygon?.color ?? s?.rect?.color
        })
      } catch {
        setStyleEditorCurrentStyles({})
      }
      setStyleEditorVisible(true)
      break
    }
    case 'lock': {
      try {
        const overlayStore = (widget as any)?._chartStore?.()?.getOverlayStore?.()
        const overlays = overlayStore?.getInstances?.() ?? []
        const o = overlays.find((ov: any) => ov.id === overlayId)
        widget?.overrideOverlay({ id: overlayId, lock: !o?.lock })
      } catch { /* ignore */ }
      break
    }
    case 'hide':
      widget?.overrideOverlay({ id: overlayId, visible: false })
      break
    case 'delete':
      widget?.removeOverlay({ id: overlayId })
      saveDrawings()
      break
    // --- Chart area actions ---
    case 'add_indicator':
      setIndicatorModalVisible(true)
      break
    case 'chart_settings':
      setSettingModalVisible(true)
      break
    case 'screenshot':
      if (widget) {
        const url = widget.getConvertPictureUrl(true, 'jpeg', theme === 'dark' ? '#151517' : '#ffffff')
        setScreenshotUrl(url)
      }
      break
    case 'toggle_grid': {
      const newVisible = !gridVisible
      setGridVisible(newVisible)
      widget?.setStyles({ grid: { show: newVisible } })
      break
    }
    case 'goto_date': {
      // Simulate a click on the bottom-bar goto-date button
      const gotoBtn = document.querySelector('.bottom-bar-goto .bottom-bar-icon-btn') as HTMLElement
      gotoBtn?.click()
      break
    }
    case 'go_to_latest': {
      const dataList = widget?.getDataList()
      if (dataList && dataList.length > 0) {
        widget?.scrollToDataIndex(dataList.length - 1, 300)
      }
      break
    }
    case 'fullscreen': {
      const container = (widgetRef as unknown as HTMLDivElement)?.closest('.klinecharts-pro')
      if (container) {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          (container as HTMLElement).requestFullscreen()
        }
      }
      break
    }
    case 'remove_all_drawings':
      widget?.removeOverlay()
      saveDrawings()
      break
  }
  setContextMenuVisible(false)
}
