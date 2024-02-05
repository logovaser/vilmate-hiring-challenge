import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import blankImgSrc from "./assets/blank.png";
import videoSrc from "./assets/video_2024-02-04_14-59-23.mp4";

const loadFFMpeg = async (ffmpeg: FFmpeg, baseURL: string) =>
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

export function VideoEditing() {
  const ffmpegRef = useRef(new FFmpeg());
  const [isFFMpegLoaded, setIsFFMpegLoaded] = useState<boolean>(false);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [leftImg, setLeftImg] = useState<File | null>(null);
  const [rightImg, setRightImg] = useState<File | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderingProgressMessage, setRenderingProgressMessage] =
    useState<string>("");

  useEffect(() => {
    loadFFMpeg(
      ffmpegRef.current,
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm",
    ).then(() => {
      setIsFFMpegLoaded(true);
    });
  }, []);

  if (!isFFMpegLoaded) return null;

  const render = async () => {
    try {
      setIsRendering(true);
      setRenderingProgressMessage(`0 % (rendered time: 0 s)`);
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on("log", ({ message }) => {
        console.log(message);
      });
      ffmpeg.on("progress", ({ progress, time }) => {
        setRenderingProgressMessage(
          `${Math.floor(progress * 100)} % (rendered time: ${Math.floor(time / 1000000)} s)`,
        );
      });

      await ffmpeg.writeFile("original.mp4", await fetchFile(videoSrc));
      await ffmpeg.writeFile("blank.png", await fetchFile(blankImgSrc));
      if (introVideo)
        await ffmpeg.writeFile(introVideo.name, await fetchFile(introVideo));
      if (leftImg)
        await ffmpeg.writeFile(leftImg.name, await fetchFile(leftImg));
      if (rightImg)
        await ffmpeg.writeFile(rightImg.name, await fetchFile(rightImg));

      const getFilterComplex = () => {
        if (introVideo)
          return `[0:v]scale=640:480,setsar=1[v0];
[v0][2:v]overlay[v0];
[v0][3:v]overlay=x=(main_w-overlay_w):0[v0];
[1:v]scale=640:480,setsar=1[v1];
[v1][2:v]overlay[v1];
[v1][3:v]overlay=x=(main_w-overlay_w):0[v1];
[v1][1:a][v0][0:a]concat=n=2:v=1:a=1[v][a]`;
        return `[0:v][2:v]overlay[v0];
[v0][3:v]overlay=x=(main_w-overlay_w):0`;
      };

      await ffmpeg.exec([
        "-i",
        "original.mp4",
        "-i",
        introVideo?.name || "blank.png",
        "-i",
        leftImg?.name || "blank.png",
        "-i",
        rightImg?.name || "blank.png",
        "-filter_complex",
        getFilterComplex(),
        ...(introVideo ? ["-vsync", "vfr", "-map", "[v]", "-map", "[a]"] : []),
        "-preset",
        "ultrafast",
        "output.mp4",
      ]);

      const fileData = await ffmpeg.readFile("output.mp4");
      const data = new Uint8Array(fileData as ArrayBuffer);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" }),
      );
      a.download = "output.mp4";
      a.click();
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <VideoEditingControls>
      <div>
        <label htmlFor="addIntroInput">{"Into: "}</label>
        <input
          type="file"
          id="addIntroInput"
          accept="video/*"
          onChange={(e: any) => {
            setIntroVideo(e.target?.files[0]);
          }}
        />
      </div>
      <div>
        <label htmlFor="addLeftImgInput">{"Left icon: "}</label>
        <input
          type="file"
          id="addLeftImgInput"
          accept="image/*"
          onChange={(e: any) => {
            setLeftImg(e.target?.files[0]);
          }}
        />
      </div>
      <div>
        <label htmlFor="addRightImgInput">{"Right icon: "}</label>
        <input
          type="file"
          id="addRightImgInput"
          accept="image/*"
          onChange={(e: any) => {
            setRightImg(e.target?.files[0]);
          }}
        />
      </div>
      <button
        disabled={!introVideo && !leftImg && !rightImg}
        onClick={() => {
          render();
        }}
      >
        {"Render and Download the video"}
      </button>

      {isRendering && (
        <ProcessingFallback>
          <RenderingProgressMessage>
            {renderingProgressMessage}
          </RenderingProgressMessage>
        </ProcessingFallback>
      )}
    </VideoEditingControls>
  );
}

const VideoEditingControls = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const ProcessingFallback = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);

  display: flex;
  justify-content: center;
  align-items: center;
`;
const RenderingProgressMessage = styled.div`
  padding: 16px;
  width: 300px;
  background: #fff;
`;
