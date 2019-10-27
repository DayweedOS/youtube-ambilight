# Chrome YouTube Ambilight
This Chrome Extension adds ambilight to the videos you view on YouTube

## Installation
Go to [YouTube Ambilight on the Chrome Web Store](https://chrome.google.com/webstore/detail/youtube-ambilight/paponcgjfojgemddooebbgniglhkajkj) and add the extension to Chrome

## Planned features
  - [Usability] Turn on the Ambilight extension on existing tabs after the installation. This way a refresh is not needed anymore
  
## Privacy & Security
- This Chrome Extension uses the [activeTab](https://developer.chrome.com/extensions/activeTab) permission only on urls that start with https://www.youtube.com. The extension will only activate the ambilight extension on YouTube's /watch page

The following projectfiles are inserted into that specific webpage:
- \src\scripts\youtube-ambilight.js
- \src\styles\main.css

The only requests being sent are crash reports. If a crash occures a request is being sent to [Sentri.io](https://sentry.io). 
No other requests are sent to any webserver, website or api.

## Report, request or contribute
Feel free to 
- contribute to the project at https://github.com/WesselKroos/chrome-youtube-ambilight
- report bugs at https://github.com/WesselKroos/chrome-youtube-ambilight/issues
- request a feature at https://github.com/WesselKroos/chrome-youtube-ambilight/issues
- or ask a question at https://github.com/WesselKroos/chrome-youtube-ambilight/issues

## New features: progress
- FPS counter
- Start ambilight with the MutationObserver
- Switch darkmode with the MutationObserver
- Reset to light mode (Setting is automatically enabled)
- Don't apply ambilight styling in light theme
- Hide horizontal black bars setting
- Surrounding content shadow setting
- Error reporting
- Check optimizations on a laptop like the async rendering of the canvas
- debanding (noise levels)
- Combine scale & hide horizontal black bars settings
- Group settings
- Restore VR exclusion
- Remove ambilight bleeding on the browser edges since Chrome 73
- Split shadow settings into opacity and size
- Resize, stop, start, other source events performance
- Fix styles error Sentry
- Fullscreen slider knob size
- Turn FPS on/off even when ambilight is turned off
- Render ambilight when paused
- Smooth Motion with seeking support
- Fix framedrop when cutting of the black bars in version 2.27.1 vs 2.27
- Make sure the new buffers dont crash Chrome on lower end devices and it's still smooth on laptops (opacity: 0; stackoverflows the gpu memory)
- Temporary turn off the video sync canvas when the framerate is to low
x Adjust the lowest spread setting to rendering only one canvas element
x Only horizontal ambilight setting
x Buffer frames in video sync mode for smoother motion in the video
? Fix antialiasing in video sync mode. Example: https://youtu.be/e8SkIex2zXk?t=76 https://www.youtube.com/watch?v=PaErPyEnDvk