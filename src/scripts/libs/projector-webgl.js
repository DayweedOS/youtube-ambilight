import { SafeOffscreenCanvas, wrapErrorHandler } from './generic'
import ProjectorShadow from './projector-shadow'

export default class ProjectorWebGL {
  type = 'ProjectorWebGL'
  lostCount = 0
  scales = [{ x: 1, y: 1 }]

  constructor(containerElem, initProjectorListeners) {
    this.containerElem = containerElem
    this.initProjectorListeners = initProjectorListeners

    this.initShadow()
    this.initBlurCtx()
    this.canvas = new SafeOffscreenCanvas(1, 1);
    this.canvas.addEventListener('webglcontextlost', wrapErrorHandler((event) => {
      event.preventDefault();
      if(!this.isControlledLose) {
        console.warn('Ambient light for YouTube™ | Project ctx lost')
      }
      this.invalidateShaderCache()
      this.lost = true
      if(!this.isControlledLose) {
        this.lostCount++
      }
      if(!this.isPageHidden && this.isControlledLose) {
        setTimeout(this.handlePageVisibility, 1)
      }
    }), false);
    this.canvas.addEventListener('webglcontextrestored', wrapErrorHandler(() => {
      if(!this.isControlledLose && this.lostCount >= 3) {
        console.error('Ambient light for YouTube™ | Projector ctx crashed 3 times. Stopped restoring WebGL.')
        return
      }
      if(!this.isControlledLose) {
        console.log(`Ambient light for YouTube™ | Projector ctx restoring (${this.lostCount})`)
      }
      this.initCtx()
      if(!this.isControlledLose) {
        this.initShadow()
        this.initBlurCtx()
      }
      if(
        this.ctx && !this.ctx.isContextLost() && 
        this.blurCtx && (!this.blurCtx.isContextLost || !this.blurCtx.isContextLost())
      ) {
        this.initProjectorListeners()
        this.lost = false
        if(!this.isControlledLose) {
          console.log(`Ambient light for YouTube™ | Projector ctx restored (${this.lostCount})`)
        }
      } else {
        if(!this.isControlledLose) {
          console.warn(`Ambient light for YouTube™ | Projector ctx restore failed (${this.lostCount})`)
        }
      }
      if(this.handleRestored) {
        this.handleRestored(this.isControlledLose)
      }
      this.isControlledLose = false
    }), false);
    this.initCtx()
    this.handlePageVisibility()
  }

  invalidateShaderCache() {
    this.viewport = undefined
    this.fScale = undefined
    this.fScaleStep = undefined
    this.fScalesLength = undefined
    this.fHeightCrop = undefined
    this.fTextureMipmapLevel = undefined
  }

  handlePageVisibility = (isPageHidden) => {
    if(isPageHidden === undefined) {
      isPageHidden = document.visibilityState === 'hidden'
    }
    this.isPageHidden = isPageHidden

    if(!this.ctxLose) {
      this.ctxLose = this.ctx.getExtension('WEBGL_lose_context')
    }

    const ctxLost = this.ctx.isContextLost()
    if(this.isPageHidden && !ctxLost) {
      this.isControlledLose = true
      this.ctxLose.loseContext()
    } else if(!this.isPageHidden && this.lost && ctxLost && this.isControlledLose) {
      this.ctxLose.restoreContext()
    }
  }

  remove() {
    this.containerElem.remove(this.canvas)
  }

  // TODO: Cut off left, top and right canvas outside the browser + blur size
  resize(width, height) {
    this.width = width
    this.height = height
  }

  initShadow() {
    this.shadow = new ProjectorShadow()
  }

  draw = (src) => {
    if(this.ctxIsInvalid || src.ctx?.ctxIsInvalid) return

    const textureMipmapLevel = Math.max(0, Math.round(Math.log(src.height / this.height) / Math.log(2)))
    if(textureMipmapLevel !== this.fTextureMipmapLevel) {
      this.fTextureMipmapLevel = textureMipmapLevel
      this.ctx.uniform1f(this.fTextureMipmapLevelLoc, textureMipmapLevel);
    }

    this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.RGBA, this.ctx.RGBA, this.ctx.UNSIGNED_BYTE, src);
    this.ctx.generateMipmap(this.ctx.TEXTURE_2D)
    
    this.ctx.drawArrays(this.ctx.TRIANGLE_FAN, 0, 4);
    
    this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.RGBA, 1, 1, 0, this.ctx.RGBA, this.ctx.UNSIGNED_BYTE, null); // clear projectorsTexture

    this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
    this.blurCtx.drawImage(this.canvas, this.blurBound, this.blurBound);
  }

  onBlurCtxLost = wrapErrorHandler((event) => {
    event.preventDefault();
    this.lost = true
    this.lostCount++
    this.invalidateShaderCache()
    console.warn(`Ambient light for YouTube™ | Projector blurCtx lost (${this.lostCount})`)
  })

  onBlurCtxRestored = wrapErrorHandler(() => {
    console.log(`Ambient light for YouTube™ | Projector blurCtx restoring (${this.lostCount})`)
    if(this.lostCount >= 3) {
      console.error('Ambient light for YouTube™ | Projector blurCtx crashed 3 times. Stopped restoring WebGL.')
      return
    }
    this.initBlurCtx()
    if(this.blurCtx && (!this.blurCtx.isContextLost || !this.blurCtx.isContextLost())) {
      this.initProjectorListeners()
      this.lost = false
      console.log(`Ambient light for YouTube™ | Projector blurCtx restored (${this.lostCount})`)
    } else {
      console.warn(`Ambient light for YouTube™ | Projector blurCtx restore failed (${this.lostCount})`)
    }
  })

  initBlurCtx() {
    if(this.blurCanvas) {
      this.containerElem.removeChild(this.blurCanvas)
      if(this.blurCtx) {
        this.blurCanvas.removeEventListener('contextlost', this.onBlurCtxLost)
        this.blurCanvas.removeEventListener('contextrestored', this.onBlurCtxRestored)
      }
    }

    this.blurCanvas = document.createElement('canvas')
    this.blurCanvas.classList.add('ambilight__projector')
    this.containerElem.prepend(this.blurCanvas)
    this.boundaryElem = this.blurCanvas
    this.blurCanvas.addEventListener('contextlost', this.onBlurCtxLost)
    this.blurCanvas.addEventListener('contextrestored', this.onBlurCtxRestored)
    this.blurCtx = this.blurCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    })
  }

  initCtx() {
    const ctxOptions = {
      failIfMajorPerformanceCaveat: true,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      alpha: true,
      depth: false,
      antialias: false,
      desynchronized: true
    }
    this.ctx = this.canvas.getContext('webgl2', ctxOptions);
    if(this.ctx) {
      this.webGLVersion = 2
    } else {
      this.ctx = this.canvas.getContext('webgl', ctxOptions);
      if(this.ctx) {
        this.webGLVersion = 1
      }
    }
    if(this.ctxIsInvalid) return

    this.projectors = [{
      elem: this.canvas,
      ctx: this.ctx
    }]

    // Program
    this.program = this.ctx.createProgram();

    // Textures
    this.shadowTexture = this.ctx.createTexture();
    this.ctx.activeTexture(this.ctx.TEXTURE0);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.shadowTexture);
    this.ctx.pixelStorei(this.ctx.UNPACK_FLIP_Y_WEBGL, true);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.LINEAR);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);

    this.projectorsTexture = this.ctx.createTexture();
    this.ctx.activeTexture(this.ctx.TEXTURE1);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.projectorsTexture);
    this.ctx.pixelStorei(this.ctx.UNPACK_FLIP_Y_WEBGL, true);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR_MIPMAP_LINEAR);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.LINEAR);
    this.ctx.hint(this.ctx.GENERATE_MIPMAP_HINT, this.ctx.NICEST);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);
    if(this.webGLVersion !== 1) {
      this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAX_LEVEL, 16);
    }
    const tfaExt = (
      this.ctx.getExtension('EXT_texture_filter_anisotropic') ||
      this.ctx.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      this.ctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    );
    if(tfaExt) {
      let max = this.ctx.getParameter(tfaExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 0;
      this.ctx.texParameteri(this.ctx.TEXTURE_2D, tfaExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, max));
    }

    // Shaders
    const vertexShaderSrc = `
      precision lowp float;
      attribute vec2 vPosition;
      attribute vec2 vUV;
      varying vec2 fUV;
      
      void main(void) {
        fUV = vUV;
        gl_Position = vec4(vPosition, 0, 1);
      }
    `;
    const vertexShader = this.ctx.createShader(this.ctx.VERTEX_SHADER);
    this.ctx.shaderSource(vertexShader, vertexShaderSrc);
    this.ctx.compileShader(vertexShader);
    if (!this.ctx.getShaderParameter(vertexShader, this.ctx.COMPILE_STATUS)) {
      throw new Error(`vertexShader: ${this.ctx.getShaderInfoLog(vertexShader)}`);
    }
    this.ctx.attachShader(this.program, vertexShader);
    
    const fragmentShaderSrc = `
      precision lowp float;
      varying vec2 fUV;
      uniform float fTextureMipmapLevel;
      uniform vec2 fCropOffsetUV;
      uniform vec2 fCropScaleUV;
      uniform sampler2D textureSampler;
      uniform sampler2D shadowSampler;
      uniform vec2 fScale;
      uniform vec2 fScaleStep;

      vec4 multiTexture(sampler2D sampler, vec2 uv) {
        vec2 direction = ceil(uv * 2.) - 1.;
        vec2 iUV = ((direction - uv) * fScale) / ((direction - .5) * fScaleStep);
        int impreciseI = int(min(iUV[0], iUV[1]));
        for (int preciseI = 0; preciseI < 200; preciseI++) {
          if (preciseI < impreciseI) continue;
          int i = ${(this.webGLVersion === 1) ? 'impreciseI' : 'preciseI'};
          vec2 scaledUV = (uv - .5) * (fScale / (fScale - fScaleStep * vec2(i)));
          vec2 croppedUV = fCropOffsetUV + (scaledUV / fCropScaleUV);
          return texture2D(sampler, croppedUV, fTextureMipmapLevel);
        }
      }

      void main(void) {
        vec4 ambilight = multiTexture(textureSampler, fUV);
        float shadowAlpha = texture2D(shadowSampler, fUV).a;
        ambilight[3] = 1. - shadowAlpha;
        gl_FragColor = ambilight;
      }
    `;
    const fragmentShader = this.ctx.createShader(this.ctx.FRAGMENT_SHADER);
    this.ctx.shaderSource(fragmentShader, fragmentShaderSrc);
    this.ctx.compileShader(fragmentShader);
    if (!this.ctx.getShaderParameter(fragmentShader, this.ctx.COMPILE_STATUS)) {
      throw new Error(`fragmentShader: ${this.ctx.getShaderInfoLog(fragmentShader)}`);
    }
    this.ctx.attachShader(this.program, fragmentShader);
    
    // Program
    this.ctx.linkProgram(this.program);
    if (!this.ctx.getProgramParameter(this.program, this.ctx.LINK_STATUS)) {
      throw new Error(`program: ${this.ctx.getProgramInfoLog(this.program)}`);
    }
    this.ctx.validateProgram(this.program);
    if(!this.ctx.getProgramParameter(this.program, this.ctx.VALIDATE_STATUS)) {
      throw new Error(`program: ${this.ctx.getProgramInfoLog(this.program)}`);
    }
    this.ctx.useProgram(this.program);

    // Buffers
    const vUVBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, vUVBuffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array([
      0, 1, 
      0, 0, 
      1, 0, 
      1, 1
    ]), this.ctx.STATIC_DRAW);
    const vUVLoc = this.ctx.getAttribLocation(this.program, 'vUV');
    this.ctx.vertexAttribPointer(vUVLoc, 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    this.ctx.enableVertexAttribArray(vUVLoc);

    const vPositionBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, vPositionBuffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array([
      -1, 1, 
      -1, -1, 
      1, -1, 
      1, 1
    ]), this.ctx.STATIC_DRAW);
    const vPositionLoc = this.ctx.getAttribLocation(this.program, 'vPosition'); 
    this.ctx.vertexAttribPointer(vPositionLoc, 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    this.ctx.enableVertexAttribArray(vPositionLoc);

    const shadowSamplerLoc = this.ctx.getUniformLocation(this.program, 'shadowSampler');
    this.ctx.uniform1i(shadowSamplerLoc, 0);

    const textureSamplerLoc = this.ctx.getUniformLocation(this.program, 'textureSampler');
    this.ctx.uniform1i(textureSamplerLoc, 1);
    
    this.fTextureMipmapLevelLoc = this.ctx.getUniformLocation(this.program, 'fTextureMipmapLevel');
    this.fScaleLoc = this.ctx.getUniformLocation(this.program, 'fScale');
    this.fScaleStepLoc = this.ctx.getUniformLocation(this.program, 'fScaleStep');
    this.fCropOffsetUVLoc = this.ctx.getUniformLocation(this.program, 'fCropOffsetUV');
    this.fCropScaleUVLoc = this.ctx.getUniformLocation(this.program, 'fCropScaleUV');

    this.invalidateShaderCache()

    this.updateCtx()
  }

  rescale(scales, lastScale, projectorSize, heightCrop, settings) {
    this.shadow.rescale(lastScale, projectorSize, settings)

    this.scaleStep = {
      x: scales[2]?.x - scales[1]?.x,
      y: scales[2]?.y - scales[1]?.y,
    }

    this.scale = lastScale
    this.scalesLength = scales.length

    this.heightCrop = heightCrop

    const width = Math.floor(projectorSize.w * this.scale.x)
    const height = Math.floor(projectorSize.h * this.scale.y)
    this.canvas.width = width
    this.canvas.height = height

    const blurPx = settings.blur * (this.height / 512) * 1.275
    this.blurBound = Math.max(1, Math.ceil(blurPx * 2.64))
    this.blurCanvas.width = width + this.blurBound * 2
    this.blurCanvas.height = height + this.blurBound * 2
    this.blurCanvas.style.transform = `scale(${this.scale.x + ((this.blurBound * 2) / projectorSize.w)}, ${this.scale.y + ((this.blurBound * 2) / projectorSize.h)})`
    
    this.blurCtx.filter = `blur(${blurPx}px)`
    
    this.updateCtx()
  }

  updateCtx() {
    if(this.ctxIsInvalid) return

    const fScaleChanged = this.fScale?.x !== this.scale?.x || this.fScale?.y !== this.scale?.y
    if(fScaleChanged) {
      this.fScale = this.scale
      this.ctx.uniform2fv(this.fScaleLoc, new Float32Array([this.fScale?.x, this.fScale?.y]));
    }

    const fScaleStepChanged = this.fScaleStep?.x !== this.scaleStep?.x || this.fScaleStep?.y !== this.scaleStep?.y
    if(fScaleStepChanged) {
      this.fScaleStep = this.scaleStep
      this.ctx.uniform2fv(this.fScaleStepLoc, new Float32Array([this.fScaleStep?.x, this.fScaleStep?.y]));
    }

    const fHeightCropChanged = this.fHeightCrop !== this.heightCrop;
    if(fHeightCropChanged) {
      this.fHeightCrop = this.heightCrop
      const fCropScaleUV = [
        1, 1 / (1 - this.fHeightCrop * 2)
      ]
      const fCropOffsetUV = [
        .5, this.fHeightCrop + (1 / (fCropScaleUV[1] * 2))
      ]
      this.ctx.uniform2fv(this.fCropOffsetUVLoc, new Float32Array(fCropOffsetUV));
      this.ctx.uniform2fv(this.fCropScaleUVLoc, new Float32Array(fCropScaleUV));
    }

    this.ctx.activeTexture(this.ctx.TEXTURE0);
    this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.ALPHA, this.ctx.ALPHA, this.ctx.UNSIGNED_BYTE, this.shadow.elem);
    this.ctx.activeTexture(this.ctx.TEXTURE1);
    
    if (!this.viewport || this.viewport.width !== this.ctx.drawingBufferWidth || this.viewport.height !== this.ctx.drawingBufferHeight) {
      this.viewport = { width: this.ctx.drawingBufferWidth, height: this.ctx.drawingBufferHeight };
      this.ctx.viewport(0, 0, this.ctx.drawingBufferWidth, this.ctx.drawingBufferHeight);
    }
  }

  clearRect() {
    if(this.ctxIsInvalid) return
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT); // Or set preserveDrawingBuffer to false te always draw from a clear canvas
  }

  get ctxIsInvalid() {
    const invalid = (!this.ctx || this.ctx.isContextLost() || !this.blurCtx || (this.blurCtx.isContextLost && this.blurCtx.isContextLost()))
    if (invalid && !this.isControlledLose && !this.ctxIsInvalidWarned) {
      this.ctxIsInvalidWarned = true
      console.warn(`Ambient light for YouTube™ | Invalid Projector ctx: ${this.ctx ? 'Lost' : 'Is null'}`)
    }
    return invalid;
  }
}