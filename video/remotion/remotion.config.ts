import { Config } from '@remotion/cli/config'

// The film world is WebGL (Three.js). ANGLE gives hardware GL in headless Chrome on Windows/macOS;
// use `--gl=swangle` on machines without a GPU (slower, software).
Config.setChromiumOpenGlRenderer('angle')
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
Config.setConcurrency(1) // one WebGL context at a time keeps GPU memory predictable
Config.setCodec('h264')
