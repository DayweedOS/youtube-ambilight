import { defaultCrashOptions, storage } from './libs/storage';
import { getFeedbackFormLink, getPrivacyPolicyLink } from './libs/utils'

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