import { createSignal, onCleanup } from 'solid-js'
import { Chart, ActionType } from 'klinecharts'
import { BarReplayManager } from '../../bar-replay'
import type { SymbolInfo, Period, Datafeed } from '../../types'

export function useReplayManager(getWidget: () => Chart | null, datafeed: Datafeed, symbol: () => SymbolInfo, period: () => Period) {
  const [replayActive, setReplayActive] = createSignal(false)
  const [replaySelecting, setReplaySelecting] = createSignal(false)
  const [replayCrosshairX, setReplayCrosshairX] = createSignal(0)
  const [replayCrosshairVisible, setReplayCrosshairVisible] = createSignal(false)
  const [replayStatus, setReplayStatus] = createSignal<string>('idle')
  const [replayIndex, setReplayIndex] = createSignal(0)
  const [replayTotal, setReplayTotal] = createSignal(0)
  const [replaySpeed, setReplaySpeed] = createSignal(500)
  
  let replayManager: BarReplayManager | null = null
  let replaySelectCleanup: (() => void) | null = null
  let replayLastDataIndex = -1

  const cancelReplaySelection = () => {
    replaySelectCleanup?.()
    replaySelectCleanup = null
    setReplaySelecting(false)
    setReplayCrosshairVisible(false)
  }

  const startReplayFromIndex = (startIndex: number) => {
    const widget = getWidget()
    if (!widget) return

    // Pause live datafeed to prevent price jumps during replay
    datafeed.unsubscribe(symbol(), period())
    ;(window as any)._replayActive = true

    replayManager = new BarReplayManager(widget, datafeed)

    // Check for pending strategy replay
    const pendingStrategy = (window as any)._pendingReplayStrategy
    const hasStrategy = !!pendingStrategy
    if (pendingStrategy) {
      ;(window as any)._pendingReplayStrategy = null
    }

    replayManager.setHandlers({
      onStep: (index, total, bar) => {
        setReplayIndex(index); setReplayTotal(total)
        // Process strategy on each step if active
        if (hasStrategy && bar) {
          try {
            const processReplay = (window as any)._processReplayStrategy
            if (processReplay) processReplay(index, bar)
          } catch (e) {
            console.warn('[Strategy Replay] Error processing bar:', e)
          }
        }
      },
      onStatusChange: (status) => setReplayStatus(status),
      onEnd: () => {
        setReplayStatus('ended')
        // Clean up strategy state when replay ends
        if (hasStrategy) {
          ;(window as any)._activeReplayStrategy = null
          ;(window as any)._replayStrategyEngine = null
          ;(window as any)._processReplayStrategy = null
        }
      }
    })
    replayManager.start({ dataSource: 'current', speed: replaySpeed(), startFrom: startIndex }).then(() => {
      setReplayActive(true)
      setReplayTotal(replayManager!.getTotal())
      setReplayIndex(replayManager!.getIndex())
    })
  }

  const enterReplaySelection = () => {
    const widget = getWidget()
    if (!widget || replayActive()) return
    setReplaySelecting(true)
    setReplayCrosshairVisible(false)
    replayLastDataIndex = -1

    const crosshairHandler = (data: any) => {
      if (data.x != null && data.x > 0) {
        setReplayCrosshairX(data.x)
        setReplayCrosshairVisible(true)
        if (data.dataIndex != null) {
          replayLastDataIndex = data.dataIndex
        }
      } else {
        setReplayCrosshairVisible(false)
      }
    }
    widget.subscribeAction(ActionType.OnCrosshairChange, crosshairHandler)

    const clickHandler = (data: any) => {
      if (!replaySelecting()) return
      const dataList = widget.getDataList()
      if (!dataList || dataList.length === 0) return
      
      let dataIndex = data.dataIndex ?? replayLastDataIndex
      if (dataIndex == null || dataIndex < 0) {
        dataIndex = Math.floor(dataList.length / 2)
      }
      dataIndex = Math.max(0, Math.min(dataIndex, dataList.length - 1))

      cancelReplaySelection()
      startReplayFromIndex(dataIndex)
    }
    widget.subscribeAction(ActionType.OnCandleBarClick, clickHandler)

    replaySelectCleanup = () => {
      widget?.unsubscribeAction(ActionType.OnCrosshairChange, crosshairHandler)
      widget?.unsubscribeAction(ActionType.OnCandleBarClick, clickHandler)
    }
  }

  const startReplay = (dataSource: 'current' | 'custom') => {
    if (dataSource === 'current') {
      enterReplaySelection()
    }
  }

  const stopReplay = () => {
    replayManager?.stop()
    setReplayActive(false)

    // Resume live datafeed after replay ends
    ;(window as any)._replayActive = false
    // Re-subscribe will happen automatically via useChartData effect
    // when the original data is restored by BarReplayManager.stop()
  }

  onCleanup(() => {
    cancelReplaySelection()
    stopReplay()
    replayManager?.destroy()
  })

  return {
    replayActive, setReplayActive,
    replaySelecting, setReplaySelecting,
    replayCrosshairX, setReplayCrosshairX,
    replayCrosshairVisible, setReplayCrosshairVisible,
    replayStatus, setReplayStatus,
    replayIndex, setReplayIndex,
    replayTotal, setReplayTotal,
    replaySpeed, setReplaySpeed,
    getReplayManager: () => replayManager,
    enterReplaySelection,
    cancelReplaySelection,
    startReplayFromIndex,
    startReplay,
    stopReplay
  }
}
