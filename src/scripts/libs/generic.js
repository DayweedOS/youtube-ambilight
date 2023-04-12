export const uuidv4 = () => {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export const waitForDomElement = (check, container, timeout) => new Promise((resolve, reject) => {
  if (check()) {
    resolve()
  } else {
    let timeoutId;
    const observer = new MutationObserver((mutationsList, observer) => {
      if (!check()) return

      if(timeoutId) clearTimeout(timeoutId)
      observer.disconnect()
      resolve()
    })
    if(timeout) {
      timeoutId = setTimeout(() => {
        observer.disconnect()
        reject(new Error(`Element not found after ${timeout}ms`))
      })
    }
    observer.observe(container, {
      childList: true,
      subtree: true
    })
    return observer
  }
})

let errorHandler = (ex) => {
  console.error(`Ambient light for YouTube™ |`, ex)
}
export const setErrorHandler = (handler) => {
  errorHandler = handler
}

const wrapErrorHandlerHandleError = (stack, ex, reportOnce, reported) => {
  if(reportOnce) {
    if(reported.includes(ex.message)) return
    reported.push(ex.message)
  }
  appendErrorStack(stack, ex)
  if(errorHandler)
    errorHandler(ex)
}

const withErrorHandler = (callback, reportOnce, stack, reported) =>
  function errorHandler(...args) {
    try {
      return callback(...args)
    } catch(ex) {
      wrapErrorHandlerHandleError(stack, ex, reportOnce, reported)
    }
  }

const withAsyncErrorHandler = (callback, reportOnce, stack, reported) => 
  async function asyncErrorHandler(...args) {
    try {
      return await callback(...args)
    } catch(ex) {
      wrapErrorHandlerHandleError(stack, ex, reportOnce, reported)
    }
  }

export const wrapErrorHandler = (callback, reportOnce = false) =>
  (callback.constructor.name === 'AsyncFunction'
    ? withAsyncErrorHandler 
    : withErrorHandler
  )(callback, reportOnce, new Error().stack, [])

export const setTimeout = (handler, timeout) => {
  return window.setTimeout(wrapErrorHandler(handler), timeout)
}

export function on(elem, eventNames, callback, options, getListenerCallback, reportOnce = false) {
  const stack = new Error().stack
  const callbacksName = `on_${eventNames.split(' ').join('_')}`
  let reported = [];
  const namedCallbacks = {
    [callbacksName]: async (...args) => {
      try {
        await callback(...args)
      } catch(ex) {
        if(reportOnce) {
          if(reported.includes(ex.message)) return
          reported.push(ex.message)
        }
        const e = args[0]
        let elem = {}
        if(e && e.currentTarget) {
          if(e.currentTarget.cloneNode) {
            elem = e.currentTarget.cloneNode(false)
          } else {
            elem.nodeName = e.currentTarget.toString()
          }
        }
        const type = (e.type === 'keydown') ? `${e.type} keyCode: ${e.keyCode}` : e.type;
        ex.message = `${ex.message} \nOn event: ${type} \nAnd element: ${elem.outerHTML || elem.nodeName || 'Unknown'}`
  
        appendErrorStack(stack, ex)
        if(errorHandler)
          errorHandler(ex)
      }
    }
  }
  const eventListenerCallback = namedCallbacks[callbacksName]

  const list = eventNames.split(' ')
  list.forEach(function eventNamesAddEventListener(eventName) {
    elem.addEventListener(eventName, eventListenerCallback, options)
  })

  if(getListenerCallback)
    getListenerCallback(eventListenerCallback)
}

export function off(elem, eventNames, callback) {
  const list = eventNames.split(' ')
  list.forEach(function eventNamesRemoveEventListener(eventName) {
    elem.removeEventListener(eventName, callback)
  })
}

export const html = document.documentElement
export const body = document.body

export const raf = (callback) => (window.webkitRequestAnimationFrame || requestAnimationFrame)(wrapErrorHandler(callback))

export const ctxOptions = {
  alpha: false,
  // desynchronized: true,
  imageSmoothingQuality: 'low'
}

export class Canvas {
  constructor(width, height, pixelated) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    if (pixelated) {
      canvas.style.imageRendering = 'pixelated'
    }
    return canvas
  }
}

export class SafeOffscreenCanvas {
  constructor(width, height, pixelated) {
    if(typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height)
    } else {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      if (pixelated) {
        canvas.style.imageRendering = 'pixelated'
      }
      return canvas
    }
  }
}

export function requestIdleCallback(callback, options) {
  return window.requestIdleCallback(wrapErrorHandler(callback), options)
}

export const appendErrorStack = (stack, ex) => {
  try {
    const stackToAppend = stack.substring(stack.indexOf('\n') + 1)
    const stackToSearch = stackToAppend.substring(stackToAppend.indexOf('\n') + 1) // The first line in the stack trace can contain an extra function name
    const alreadyContainsStack = ((ex.stack || ex.message).indexOf(stackToSearch) !== -1)
    if(!alreadyContainsStack) {
      ex.stack = `${ex.stack || ex.message}\n${stackToAppend}`
    }
  } catch(ex) { console.warn(ex) }
  return ex
}

let _supportsWebGL;
export const supportsWebGL = () => {
  if(_supportsWebGL === undefined) {
    try {
      _supportsWebGL = (
        !!window.WebGLRenderingContext && (
          !!document.createElement('canvas')?.getContext('webgl') ||
          !!document.createElement('canvas')?.getContext('webgl2')
      ))
    } catch {
      _supportsWebGL = false
    }
  }
  return _supportsWebGL
}

export const isWatchPageUrl = () => (location.pathname === '/watch')

export const getCookie = async (name) => 
  window.cookieStore
    ? await cookieStore.get(name)
    : document.cookie.split('; ')
      .map(cookie => {
        const nameValue = cookie.split(/=(.*)/s);
        return {
          name: nameValue[0],
          value: nameValue[1]
        }
      })
      .find(cookie => cookie.name === name)