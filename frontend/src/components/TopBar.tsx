/*
    <obc-top-bar showappsbutton="" showdimmingbutton="" showclock="">
      <obc-alert-button class="alert-button" flatwhenidle="" nalerts="0" standalone="" slot="alerts" style="max-width: 48px;" alerttype="warning">
      </obc-alert-button>
      <obc-alert-topbar-element class="alert-display" slot="alerts" nalerts="0" flatwhenidle="" maxwidth="480" alerttype="warning">
      </obc-alert-topbar-element>
    </obc-top-bar>
*/

import { ObcTopBar } from '@oicl/openbridge-webcomponents-react/components/top-bar/top-bar'
import { ObcAlertButton } from '@oicl/openbridge-webcomponents-react/components/alert-button/alert-button'
import { ObcAlertTopbarElement } from '@oicl/openbridge-webcomponents-react/components/alert-topbar-element/alert-topbar-element'
import '../styles/dashboard.css'

function onMenuButtonClick() {
  console.log('Menu button clicked')
}

function onDimmingButtonClick() {
  console.log('Dimming button clicked')
}

function onAppsButtonClick() {
  console.log('Clock button clicked')
}

function onLeftMoreButtonClick() {
  console.log('Left more button clicked')
}

function onAlertButtonClicked() {
  console.log('Alert button clicked')
}

function onMuteclick() {
  console.log('Mute clicked')
}

function onAckclick() {
  console.log('Acknowledge clicked')
}

function onAlertclick() {
  console.log('Alert clicked')
}

function onMessageclick() {
  console.log('Message clicked')
}

export function TopBar() {
  return (
    <div className="top-bar">
      <ObcTopBar
        onMenuButtonClicked={onMenuButtonClick}
        onDimmingButtonClicked={onDimmingButtonClick}
        onAppsButtonClicked={onAppsButtonClick}
        onLeftMoreButtonClicked={onLeftMoreButtonClick}
      >
        <ObcAlertButton onClick={onAlertButtonClicked}></ObcAlertButton>
        <ObcAlertTopbarElement
          onMuteclick={onMuteclick}
          onAckclick={onAckclick}
          onAlertclick={onAlertclick}
          onMessageclick={onMessageclick}
        ></ObcAlertTopbarElement>
      </ObcTopBar>
    </div>
  )
}
