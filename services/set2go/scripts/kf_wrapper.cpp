/* Minimal C-ABI wrapper around libKeyFinder 2.x for ctypes use.
   Compile: see build_kf.sh alongside this file. */
#include <keyfinder/keyfinder.h>
#include <keyfinder/audiodata.h>
extern "C" {

/* Returns key_t integer (0-24). 24 = SILENCE / unknown.
   samples: interleaved float32 PCM (will be promoted to double inside)
   n_samples: total number of samples (frames * channels)
   channels: 1 for mono, 2 for stereo
   frame_rate: e.g. 44100 */
int keyfinder_key(const float* samples, int n_samples, int channels, int frame_rate)
{
    KeyFinder::AudioData audio;
    audio.setChannels(channels);
    audio.setFrameRate((unsigned int)frame_rate);
    audio.addToSampleCount(n_samples);
    for (int i = 0; i < n_samples; i++)
        audio.setSample(i, (double)samples[i]);
    KeyFinder::KeyFinder kf;
    return (int)kf.keyOfAudio(audio);
}

} // extern "C"
