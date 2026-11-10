/**
 * Remotion compositions for the pre-rendered cut. Durations come from shared/story/storyboard.json, the same file
 * the Vue interactive story uses, so the two modes cannot drift apart.
 */
import { Composition } from 'remotion'
import storyboard from '../../../shared/story/storyboard.json'
import { ScanFilm } from './ScanFilm'

const FPS = storyboard.fps
const FRAMES = Math.round(storyboard.duration * FPS)

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ScanFilm" component={ScanFilm} durationInFrames={FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ vertical: false, startAt: 0 }} />
    <Composition id="ScanFilmVertical" component={ScanFilm} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{ vertical: true, startAt: 0 }} />
    {/* short preview for checking the pipeline quickly: scenes 1–2 */}
    <Composition id="ScanFilmPreview" component={ScanFilm} durationInFrames={35 * FPS} fps={FPS} width={1280} height={720} defaultProps={{ vertical: false, startAt: 0 }} />
  </>
)
