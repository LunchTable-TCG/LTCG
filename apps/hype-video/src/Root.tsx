import { Composition } from "remotion";
import { HypeVideo } from "./HypeVideo";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="HypeVideo"
        component={HypeVideo}
        durationInFrames={1800} // 30 seconds at 60fps
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
