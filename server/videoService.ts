import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { textToSpeech } from './replit_integrations/audio/client';

interface StoryboardFrame {
  frameNumber: number;
  image?: string;
  description: string;
  action: string;
  dialogue?: string;
  imagePrompt?: string;
}

interface StoryboardData {
  title: string;
  description?: string;
  frames: StoryboardFrame[];
  duration?: string;
}

interface VideoOptions {
  includeNarration?: boolean;
  includeMusic?: boolean;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
          return;
        }
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadBase64Image(base64Data: string, filepath: string): Promise<void> {
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Content, 'base64');
  await fs.promises.writeFile(filepath, buffer);
}

async function generateNarrationAudio(
  frames: StoryboardFrame[],
  tempDir: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<string[]> {
  const audioFiles: string[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const narrationText = frame.dialogue || frame.description;
    
    if (narrationText) {
      try {
        const audioBuffer = await textToSpeech(narrationText, voice, 'mp3');
        const audioFile = path.join(tempDir, `narration_${String(i).padStart(3, '0')}.mp3`);
        await fs.promises.writeFile(audioFile, audioBuffer);
        audioFiles.push(audioFile);
      } catch (error) {
        console.error(`Failed to generate narration for frame ${i}:`, error);
        audioFiles.push('');
      }
    } else {
      audioFiles.push('');
    }
  }
  
  return audioFiles;
}

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration || 4);
      }
    });
  });
}

async function createSilentAudio(duration: number, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input('anullsrc=r=44100:cl=stereo')
      .inputOptions(['-f', 'lavfi'])
      .duration(duration)
      .audioCodec('libmp3lame')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

async function concatenateAudio(audioFiles: string[], outputPath: string): Promise<void> {
  if (audioFiles.length === 0) {
    await createSilentAudio(1, outputPath);
    return;
  }
  
  const listFile = outputPath + '.txt';
  const content = audioFiles.map(f => `file '${f}'`).join('\n');
  await fs.promises.writeFile(listFile, content);
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .audioCodec('libmp3lame')
      .output(outputPath)
      .on('end', () => {
        fs.promises.unlink(listFile).catch(() => {});
        resolve();
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

async function generateBackgroundMusic(duration: number, tempDir: string): Promise<string> {
  const musicFile = path.join(tempDir, 'background_music.mp3');
  
  return new Promise((resolve, reject) => {
    const loopCount = Math.ceil(duration / 4);
    
    ffmpeg()
      .input('anullsrc=r=44100:cl=stereo')
      .inputOptions(['-f', 'lavfi'])
      .complexFilter([
        `sine=f=261.63:d=1,volume=0.08[c];` +
        `sine=f=329.63:d=1,volume=0.06[e];` +
        `sine=f=392:d=1,volume=0.05[g];` +
        `sine=f=293.66:d=1,volume=0.07[d];` +
        `sine=f=349.23:d=1,volume=0.06[f];` +
        `sine=f=440:d=1,volume=0.05[a];` +
        `[c][e][g]amix=inputs=3:duration=first[chord1];` +
        `[d][f][a]amix=inputs=3:duration=first[chord2];` +
        `[chord1][chord2][chord1][chord2]concat=n=4:v=0:a=1[loop];` +
        `[loop]aloop=loop=${loopCount}:size=176400,atrim=0:${duration},` +
        `afade=t=in:st=0:d=1,afade=t=out:st=${Math.max(0, duration - 2)}:d=2,` +
        `lowpass=f=2000,volume=0.4[out]`
      ])
      .outputOptions(['-map', '[out]'])
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(musicFile)
      .on('end', () => resolve(musicFile))
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function generateVideoFromStoryboard(
  storyboardData: StoryboardData,
  options: VideoOptions = {}
): Promise<Buffer> {
  const tempDir = `/tmp/storyboard-video-${Date.now()}`;
  await fs.promises.mkdir(tempDir, { recursive: true });
  
  const { includeNarration = false, includeMusic = false, voice = 'nova' } = options;
  
  try {
    const framesWithImages = storyboardData.frames.filter(f => f.image);
    
    if (framesWithImages.length === 0) {
      throw new Error('No frames with images found in storyboard');
    }
    
    const imageFiles: string[] = [];
    const frameDurations: number[] = [];
    let narrationFiles: string[] = [];
    
    for (let i = 0; i < framesWithImages.length; i++) {
      const frame = framesWithImages[i];
      const imageFile = path.join(tempDir, `frame_${String(i).padStart(3, '0')}.png`);
      
      if (frame.image!.startsWith('data:')) {
        await downloadBase64Image(frame.image!, imageFile);
      } else {
        await downloadImage(frame.image!, imageFile);
      }
      
      imageFiles.push(imageFile);
    }
    
    if (includeNarration) {
      narrationFiles = await generateNarrationAudio(framesWithImages, tempDir, voice);
      
      for (let i = 0; i < narrationFiles.length; i++) {
        if (narrationFiles[i]) {
          try {
            const duration = await getAudioDuration(narrationFiles[i]);
            frameDurations.push(Math.max(duration + 0.5, 3));
          } catch {
            frameDurations.push(4);
          }
        } else {
          frameDurations.push(4);
        }
      }
    } else {
      frameDurations.push(...framesWithImages.map(() => 4));
    }
    
    const totalDuration = frameDurations.reduce((a, b) => a + b, 0);
    
    const concatFile = path.join(tempDir, 'concat.txt');
    const concatContent = imageFiles.map((f, i) => 
      `file '${f}'\nduration ${frameDurations[i]}`
    ).join('\n');
    await fs.promises.writeFile(concatFile, concatContent + `\nfile '${imageFiles[imageFiles.length - 1]}'`);
    
    const silentVideoFile = path.join(tempDir, 'silent_video.mp4');
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-movflags', '+faststart'
        ])
        .output(silentVideoFile)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
    
    if (!includeNarration && !includeMusic) {
      const videoBuffer = await fs.promises.readFile(silentVideoFile);
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      return videoBuffer;
    }
    
    const audioTracks: string[] = [];
    
    if (includeNarration && narrationFiles.some(f => f)) {
      const paddedNarrationFiles: string[] = [];
      let currentTime = 0;
      
      for (let i = 0; i < framesWithImages.length; i++) {
        if (narrationFiles[i]) {
          paddedNarrationFiles.push(narrationFiles[i]);
        } else {
          const silentFile = path.join(tempDir, `silent_${i}.mp3`);
          await createSilentAudio(frameDurations[i], silentFile);
          paddedNarrationFiles.push(silentFile);
        }
        currentTime += frameDurations[i];
      }
      
      const combinedNarration = path.join(tempDir, 'combined_narration.mp3');
      await concatenateAudio(paddedNarrationFiles, combinedNarration);
      audioTracks.push(combinedNarration);
    }
    
    if (includeMusic) {
      try {
        const musicFile = await generateBackgroundMusic(totalDuration, tempDir);
        audioTracks.push(musicFile);
      } catch (error) {
        console.error('Failed to generate background music:', error);
      }
    }
    
    const outputFile = path.join(tempDir, 'output.mp4');
    
    if (audioTracks.length === 0) {
      const videoBuffer = await fs.promises.readFile(silentVideoFile);
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      return videoBuffer;
    }
    
    await new Promise<void>((resolve, reject) => {
      let cmd = ffmpeg().input(silentVideoFile);
      
      audioTracks.forEach(track => {
        cmd = cmd.input(track);
      });
      
      let filterComplex = '';
      if (audioTracks.length === 1) {
        filterComplex = '[1:a]volume=1.0[outa]';
      } else if (audioTracks.length === 2) {
        filterComplex = '[1:a]volume=1.0[narr];[2:a]volume=0.15[music];[narr][music]amix=inputs=2:duration=longest[outa]';
      }
      
      cmd
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '0:v',
          '-map', '[outa]',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart'
        ])
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
    
    const videoBuffer = await fs.promises.readFile(outputFile);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    
    return videoBuffer;
  } catch (error) {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
