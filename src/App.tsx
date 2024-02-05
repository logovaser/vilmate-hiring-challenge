import MultiRangeSlider, { ChangeResult } from "multi-range-slider-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import transcript from "./assets/transcript.json";
import videoSrc from "./assets/video_2024-02-04_14-59-23.mp4";
import {VideoEditing} from "./VideoEditing";

const transcriptTimestamps: number[] = Object.keys(transcript).map((ts) =>
  parseInt(ts),
);

const getCurrentTranscriptTimestamps = (
  currentTime: number,
  sliderStart: number,
  sliderEnd: number,
) =>
  transcriptTimestamps.filter((ts, index) => {
    const nextTs: number = transcriptTimestamps[index + 1];
    if (!nextTs) return ts <= sliderEnd;
    return nextTs > currentTime && nextTs > sliderStart && ts <= sliderEnd;
  });

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTranscriptTimestamps, setCurrentTranscriptTimestamps] =
    useState<number[]>([]);
  const [sliderStart, setSliderStart] = useState<number>(0);
  const [sliderEnd, setSliderEnd] = useState<number>(0);

  const handleTimeUpdate = useCallback(
    (e: any) => {
      const newCurrentTime = e.target.currentTime;

      setCurrentTime(newCurrentTime);
    },
    [sliderStart, sliderEnd],
  );
  const handleDurationChange = useCallback(
    (e: any) => {
      const newDuration = e.target.duration;
      setDuration(newDuration);
      setCurrentTranscriptTimestamps(
        getCurrentTranscriptTimestamps(currentTime, sliderStart, newDuration),
      );
      if (!sliderEnd || sliderEnd > newDuration) setSliderEnd(newDuration);
    },
    [currentTime, sliderStart, sliderEnd],
  );
  const handleSliderChange = useCallback((e: ChangeResult) => {
    setSliderStart(e.minValue);
    setSliderEnd(e.maxValue);
  }, []);
  useEffect(() => {
    if (!videoRef.current) return;
    if (currentTime < sliderStart) {
      videoRef.current.currentTime = sliderStart;
    } else if (currentTime > sliderEnd) {
      videoRef.current.pause();
      videoRef.current.currentTime = sliderEnd;
    }
  }, [currentTime, sliderStart, sliderEnd]);
  useEffect(() => {
    setCurrentTranscriptTimestamps(
      getCurrentTranscriptTimestamps(currentTime, sliderStart, sliderEnd),
    );
  }, [currentTime, sliderStart, sliderEnd]);


  return (
    <Container>
      <div>
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
        >
          Sorry, your browser doesn't support embedded videos.
        </video>
        <div>
          <MultiRangeSlider
            min={0}
            max={duration}
            step={1}
            minValue={sliderStart}
            maxValue={sliderEnd}
            preventWheel
            onInput={(e: ChangeResult) => {
              handleSliderChange(e);
            }}
          />
        </div>
        <VideoEditing />
      </div>

      <Transcript>
        {currentTranscriptTimestamps.map((ts) => (
          <TranscriptItem key={ts}>
            {transcript[String(ts) as keyof typeof transcript]}
          </TranscriptItem>
        ))}
      </Transcript>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: flex-start;
  height: 100vh;
  overflow: hidden;
`;
const Transcript = styled.div`
  padding: 8px;
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const TranscriptItem = styled.div`
  &:first-child {
    color: midnightblue;
    font-weight: bold;
  }
`;

export default App;
