import { getOS, getBrowser, getBrowserVersion } from './libs/utils'

const getVersion = () => {
  try {
    return (chrome.runtime.getManifest() || {}).version
  } catch (ex) {
    return null
  }
}

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason !== 'install' && details.reason !== 'update')
    return

  if (chrome.runtime.setUninstallURL) {
    const version = getVersion() || ''
    const os = getOS() || ''
    const browser = getBrowser() || ''
    const browserVersion = getBrowserVersion()
    const feedbackFormLink = `https://docs.google.com/forms/d/e/1FAIpQLSe5lenJCbDFgJKwYuK_7U_s5wN3D78CEP5LYf2lghWwoE9IyA/viewform?usp=pp_url&entry.1590539866=${version}&entry.1676661118=${os}&entry.964326861=${browser}&entry.908541589=${browserVersion}`
    chrome.runtime.setUninstallURL(feedbackFormLink)
  }
})

chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.runtime.openOptionsPage()
})