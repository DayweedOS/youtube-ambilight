import { defaultCrashOptions, storage } from './libs/storage'
import { syncStorage } from './libs/sync-storage'
import { getFeedbackFormLink, getPrivacyPolicyLink } from './libs/utils'
import SettingsConfig from './libs/settings-config'

document.querySelector('#feedbackFormLink').href = getFeedbackFormLink()
document.querySelector('#privacyPolicyLink').href = getPrivacyPolicyLink()

let crashOptions;

const updateCrashReportOptions = () => {
  document.querySelector('[name="video"]').disabled = !crashOptions.crash
  document.querySelector('[name="technical"]').disabled = !crashOptions.crash
  document.querySelector('[name="crash"]').checked = crashOptions.crash
  document.querySelector('[name="technical"]').checked = crashOptions.crash && crashOptions.technical
  document.querySelector('[name="video"]').checked = crashOptions.crash && crashOptions.video
}

[...document.querySelectorAll('[type="checkbox"]')].forEach(
  function addCheckboxInputChangeEventListener(input) {
    input.addEventListener('change', async () => {
      try {
        crashOptions[input.name] = input.checked
        await storage.set('crashOptions', crashOptions)
      } catch(ex) {
        alert('Crash reports options changed to many times. Please wait a few seconds.')
        input.checked = !input.checked
        crashOptions[input.name] = input.checked
      }
      updateCrashReportOptions()
    })
  }
)

;(async function initCrashReportOptions() {
  crashOptions = (await storage.get('crashOptions')) || defaultCrashOptions
  updateCrashReportOptions()
})()

;[...document.querySelectorAll('.expandable__toggle')].forEach(
  function addExpendableToggleClickEventListener (elem) {
    elem.addEventListener('click', () => {
      elem.closest('.expandable').classList.toggle('expanded')
    })
  }
)

if(!chrome?.storage?.local?.onChanged) {
  const synchronizationWarning = document.createElement('div')
  synchronizationWarning.textContent = 'Unable to synchronize any crash option changes to youtube pages that are already open. Make sure to refresh any open youtube pages after you\'ve changed an option.'
  synchronizationWarning.classList.add('warning')
  document.querySelector('.warnings-container').appendChild(synchronizationWarning)
}

const importExportStatus = document.querySelector('#importExportStatus')
const importExportStatusDetails = document.querySelector('#importExportStatusDetails')
let importWarnings = []
const importSettings = async (storageName, importJson) => {
  try {
    importExportStatus.textContent = ''
    importExportStatus.classList.remove('has-error')
    importExportStatusDetails.textContent = ''
    importExportStatusDetails.scrollTo(0, 0)

    const jsonString = await importJson()
    if(!jsonString) throw new Error('No settings found to import')

    const importedObject = JSON.parse(jsonString)
    if(typeof importedObject !== 'object') throw new Error('No settings found to import')

    const settings = {}
    SettingsConfig.forEach(({ name, type, min, step, max }) => {
      if(!(name in importedObject)) return

      let value = importedObject[name]
      if(type === 'checkbox' || type === 'section') {
        if(typeof value !== 'boolean') {
          importWarnings.push(`Skipped "${name}": ${JSON.stringify(value)} is not a boolean.`)
          return
        }
      } else if(type === 'list') {
        if(typeof value !== 'number') {
          importWarnings.push(`Skipped "${name}": ${JSON.stringify(value)} is not a number.`)
          return
        }
        const valueRoundingLeft = ((value - (min ?? 0)) * 10) % ((step ?? 0.1) * 10)
        if(valueRoundingLeft !== 0) {
          importWarnings.push(`Rounded down "${name}": ${JSON.stringify(value)} is not in steps of ${step ?? 0.1}${min === undefined ? '' : ` from ${min}`}.`)
          value = Math.round((value - valueRoundingLeft) * 10) / 10
        }
        if(min !== undefined && value < min) {
          importWarnings.push(`Clipped "${name}": ${JSON.stringify(value)} is lower than the minimum of ${min}.`)
          value = min
        }
        if(max !== undefined && value > max) {
          importWarnings.push(`Clipped "${name}": ${JSON.stringify(value)} is higher than the maximum of ${max}.`)
          value = max
        }
      }

      settings[`setting-${name}`] = value
    })
    
    if(!Object.keys(settings).length) throw new Error('No settings found to import')
    
    Object.keys(importedObject)
      .filter(name => !(`setting-${name}` in settings))
      .forEach(name => {
        importWarnings.push(`Skipped "${name}". (This settings might have been removed or migrated to another name after an update.`)
      })

    await storage.set(settings)

    importExportStatus.textContent = 
`Imported ${Object.keys(settings).length} settings from ${storageName}.
(Refresh any open YouTube browser tabs to use the new settings.)${
importWarnings.length ? `\n\nWith ${importWarnings.length} warnings:\n- ${importWarnings.join('\n- ')}` : ''
}`
    if(importWarnings.length) {
      importExportStatus.classList.add('has-error')
    }
    importWarnings = []

    importExportStatusDetails.textContent = `View imported settings (Click)\n\n${
      Object.keys(settings).map(key => `${key.substring('setting-'.length)}: ${JSON.stringify(settings[key])}`).join('\n')
    }`
  } catch(ex) {
    console.error('Failed to import settings', ex)
    importExportStatus.classList.add('has-error')
    importExportStatus.textContent = `Failed to import settings: \n${ex?.message}`
  }
}
const exportSettings = async (storageName, exportJson) => {
  try {
    importExportStatus.textContent = ''
    importExportStatus.classList.remove('has-error')
    importExportStatusDetails.textContent = ''
    importExportStatusDetails.scrollTo(0, 0)
    
    const storedSettings = await storage.get(null)

    const settings = {}
    Object.keys(storedSettings).forEach(key => {
      if (!key.startsWith('setting-')) return

      const name = key.substring('setting-'.length)
      if(!SettingsConfig.some(setting => setting.name === name)) return

      settings[name] = storedSettings[key]
    })
    if(!Object.keys(settings).length) throw new Error('Nothing to export. All settings still have their default values.')
  
    const jsonString = JSON.stringify(settings, null, 2)
    await exportJson(jsonString)
    importExportStatus.textContent = `Exported ${Object.keys(settings).length} settings to ${storageName}`
    importExportStatusDetails.textContent = `View exported settings (Click)\n\n${
      Object.keys(settings).map(key => `${key}: ${JSON.stringify(settings[key])}`).join('\n')
    }`
  } catch(ex) {
    console.error('Failed to export settings', ex)
    importExportStatus.classList.add('has-error')
    importExportStatus.textContent = `Failed to export settings: \n${ex?.message}`
  }
}

const importFileButton = document.querySelector('#importFileBtn')
const importFileInput = document.querySelector('[name="import-settings-file"]')
importFileInput.addEventListener('change', async () => {
  if(!importFileInput.files.length) return

  await importSettings('a file', async () => {
    return await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.addEventListener('load', e => resolve(e.target.result))
        reader.readAsText(importFileInput.files[0])
      } catch(ex) {
        reject(ex)
      }
      importFileInput.value = ''
    })
  })
})
importFileButton.addEventListener('click', () => importFileInput.click())

const exportFileButton = document.querySelector('#exportFileBtn')
exportFileButton.addEventListener('click', async () => {
  await exportSettings('a file', (jsonString) => {
    const blob = new Blob([jsonString], { type: 'text/plain' })

    const link = document.createElement("a");
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', 'ambient-light-for-youtube-settings.json')
    link.click()

    URL.revokeObjectURL(link.href)
  })
})

const importAccountButton = document.querySelector('#importAccountBtn')
importAccountButton.addEventListener('click', async () => {
  await importSettings('cloud storage', async () => {
    return await syncStorage.get('settings')
  })
})

const exportAccountButton = document.querySelector('#exportAccountBtn')
exportAccountButton.addEventListener('click', async () => {
  await exportSettings('cloud storage', async (jsonString) => {
    await syncStorage.set('settings', jsonString)
    await syncStorage.set('settings-date', (new Date()).toJSON())
  })
})

const importableAccountStatus =  document.querySelector('#importableAccountStatus')
const updateImportableAccountStatus = async () => {
  const jsonString = await syncStorage.get('settings-date')
  if(jsonString) {
    const settingsDate = new Date(jsonString)
    importableAccountStatus.textContent = `Last cloud storage export was on: ${settingsDate.toLocaleDateString()} at ${settingsDate.toLocaleTimeString()}`
    importAccountButton.disabled = false
  } else {
    importableAccountStatus.textContent = ''
    importAccountButton.disabled = true
  }
}
updateImportableAccountStatus()

chrome.storage.onChanged.addListener(updateImportableAccountStatus)
window.addEventListener('beforeunload', () => {
  chrome.storage.onChanged.removeListener(updateImportableAccountStatus)
})