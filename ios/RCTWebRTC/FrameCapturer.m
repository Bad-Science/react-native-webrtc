#if TARGET_OS_IOS

#include <mach/mach_time.h>

#import <ReplayKit/ReplayKit.h>
#import <WebRTC/RTCCVPixelBuffer.h>
#import <WebRTC/RTCVideoFrameBuffer.h>

@interface FrameCapturer ()

@end

@implementation FrameCapturer {
    mach_timebase_info_data_t _timebaseInfo;
    int64_t _startTimeStampNs;
}

- (instancetype)initWithDelegate:(__weak id<RTCVideoCapturerDelegate>)delegate {
    self = [super initWithDelegate:delegate];
    if (self) {
        mach_timebase_info(&_timebaseInfo);
    }

    return self;
}

- (void)startCapture{
    _startTimeStampNs = -1;
}

- (void)consumeFrame:(CVPixelBufferRef)frame {
    [self didCaptureVideoFrame:frame withOrientation:kCGImagePropertyOrientationUp];
}

- (void)stopCapture {
    [self.eventsDelegate capturerDidEnd:self];
}

// MARK: Private Methods


// THE MAGIC SPOT. complete frames from the socket are sent here from readBytesFromStream
// Note: we might actually want to structure thus more like the media devide capturer, gutted to audio and frame capture
- (void)didCaptureVideoFrame:(CVPixelBufferRef)pixelBuffer withOrientation:(CGImagePropertyOrientation)orientation {
    int64_t currentTime = mach_absolute_time();
    int64_t currentTimeStampNs = currentTime * _timebaseInfo.numer / _timebaseInfo.denom;

    if (_startTimeStampNs < 0) {
        _startTimeStampNs = currentTimeStampNs;
    }

    RTCCVPixelBuffer *rtcPixelBuffer = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:pixelBuffer];
    int64_t frameTimeStampNs = currentTimeStampNs - _startTimeStampNs;

    RTCVideoRotation rotation;
    switch (orientation) {
        case kCGImagePropertyOrientationLeft:
            rotation = RTCVideoRotation_90;
            break;
        case kCGImagePropertyOrientationDown:
            rotation = RTCVideoRotation_180;
            break;
        case kCGImagePropertyOrientationRight:
            rotation = RTCVideoRotation_270;
            break;
        default:
            rotation = RTCVideoRotation_0;
            break;
    }

    RTCVideoFrame *videoFrame = [[RTCVideoFrame alloc] initWithBuffer:rtcPixelBuffer
                                                             rotation:rotation
                                                          timeStampNs:frameTimeStampNs];

    // this seems like we are emitting the videoFrame back to the source? the delegate is the source stream soooooooooox
    [self.delegate capturer:self didCaptureVideoFrame:videoFrame];
}

@end

#endif
