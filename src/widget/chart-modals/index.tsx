import { Component, Show } from 'solid-js'
import ChartTypeSettingsModal from '../chart-type-settings-modal'
import SymbolSearchModal from '../symbol-search-modal'
import IndicatorModal from '../indicator-modal'
import TimezoneModal from '../timezone-modal'
import SettingModal from '../setting-modal'
import ScreenshotModal from '../screenshot-modal'
import IndicatorSettingModal from '../indicator-setting-modal'
import PineEditorModal from '../pine-editor-modal'
import { SymbolInfo, Datafeed } from '../../types'
import { SelectDataSourceItem } from '../../component'

export interface ChartModalsProps {
  locale: string
  // Chart Type Settings
  chartTypeSettingsVisible: boolean
  chartType: string
  renkoBrickSize: number
  rangeBarSize: number
  autoSizeValue: number
  onChartTypeSettingsClose: () => void
  onChartTypeSizeConfirm: (size: number) => void
  
  // Symbol Search
  symbolSearchModalVisible: boolean
  datafeed: Datafeed
  onSymbolSearchClose: () => void
  onSymbolSelected: (symbol: SymbolInfo) => void

  // Indicator
  indicatorModalVisible: boolean
  mainIndicators: string[]
  subIndicators: Record<string, string>
  onIndicatorModalClose: () => void
  onMainIndicatorChange: (data: any) => void
  onSubIndicatorChange: (data: any) => void

  // Timezone
  timezoneModalVisible: boolean
  timezone: SelectDataSourceItem
  onTimezoneModalClose: () => void
  onTimezoneConfirm: (timezone: SelectDataSourceItem) => void

  // Settings
  settingModalVisible: boolean
  currentStyles: any
  onSettingModalClose: () => void
  onSettingChange: (style: any) => void
  onSettingRestoreDefault: (options: SelectDataSourceItem[]) => void

  // Screenshot
  screenshotUrl: string
  onScreenshotClose: () => void

  // Indicator Setting
  indicatorSettingModalParams: { visible: boolean, indicatorName: string, paneId: string, calcParams: any[], extendData?: any }
  onIndicatorSettingModalClose: () => void
  onIndicatorSettingConfirm: (params: any[]) => void

  // Pine Editor
  pineEditorVisible: boolean
  onPineEditorClose: () => void
  onPineEditorApply: (code: string) => void
}

const ChartModals: Component<ChartModalsProps> = props => {
  return (
    <>
      <Show when={props.chartTypeSettingsVisible}>
        <ChartTypeSettingsModal
          locale={props.locale}
          chartType={props.chartType}
          currentSize={props.chartType === 'renko' ? props.renkoBrickSize : props.rangeBarSize}
          autoSize={props.autoSizeValue}
          onConfirm={props.onChartTypeSizeConfirm}
          onClose={props.onChartTypeSettingsClose}
        />
      </Show>
      <Show when={props.symbolSearchModalVisible}>
        <SymbolSearchModal
          locale={props.locale}
          datafeed={props.datafeed}
          onSymbolSelected={props.onSymbolSelected}
          onClose={props.onSymbolSearchClose}/>
      </Show>
      <Show when={props.indicatorModalVisible}>
        <IndicatorModal
          locale={props.locale}
          mainIndicators={props.mainIndicators}
          subIndicators={props.subIndicators}
          onClose={props.onIndicatorModalClose}
          onMainIndicatorChange={props.onMainIndicatorChange}
          onSubIndicatorChange={props.onSubIndicatorChange}/>
      </Show>
      <Show when={props.timezoneModalVisible}>
        <TimezoneModal
          locale={props.locale}
          timezone={props.timezone}
          onClose={props.onTimezoneModalClose}
          onConfirm={props.onTimezoneConfirm}
        />
      </Show>
      <Show when={props.settingModalVisible}>
        <SettingModal
          locale={props.locale}
          currentStyles={props.currentStyles}
          onClose={props.onSettingModalClose}
          onChange={props.onSettingChange}
          onRestoreDefault={props.onSettingRestoreDefault}
        />
      </Show>
      <Show when={props.screenshotUrl.length > 0}>
        <ScreenshotModal
          locale={props.locale}
          url={props.screenshotUrl}
          onClose={props.onScreenshotClose}
        />
      </Show>
      <Show when={props.indicatorSettingModalParams.visible}>
        <IndicatorSettingModal
          locale={props.locale}
          params={props.indicatorSettingModalParams}
          onClose={props.onIndicatorSettingModalClose}
          onConfirm={props.onIndicatorSettingConfirm}
        />
      </Show>
      <Show when={props.pineEditorVisible}>
        <PineEditorModal
          locale={props.locale}
          visible={props.pineEditorVisible}
          onClose={props.onPineEditorClose}
          onApply={props.onPineEditorApply}
        />
      </Show>
    </>
  )
}

export default ChartModals
