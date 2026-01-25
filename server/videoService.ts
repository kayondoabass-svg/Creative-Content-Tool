import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface StoryboardFrame {
  frameNumber: number;
  image?: string;
  description: string;
  action: string;
  dialogue?: string;
}

interface StoryboardData {
  title: string;
  description?: string;
  frames: StoryboardFrame[];
  duration?: string;
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

export async function generateVideoFromStoryboard(storyboardData: StoryboardData): Promise<Buffer> {
  const tempDir = `/tmp/storyboard-video-${Date.now()}`;
  await fs.promises.mkdir(tempDir, { recursive: true });
  
  try {
    const framesWithImages = storyboardData.frames.filter(f => f.image);
    
    if (framesWithImages.length === 0) {
      throw new Error('No frames with images found in storyboard');
    }
    
    const secondsPerFrame = 4;
    const imageFiles: string[] = [];
    
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
    
    const concatFile = path.join(tempDir, 'concat.txt');
    const concatContent = imageFiles.map(f => `file '${f}'\nduration ${secondsPerFrame}`).join('\n');
    await fs.promises.writeFile(concatFile, concatContent + `\nfile '${imageFiles[imageFiles.length - 1]}'`);
    
    const outputFile = path.join(tempDir, 'output.mp4');
    
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
