#import <AVFoundation/AVFoundation.h>
#import <WebRTC/RTCVideoCapturer.h>
#import "CapturerEventsDelegate.h"
#import <WebRTC/RTCCVPixelBuffer.h>

NS_ASSUME_NONNULL_BEGIN

@interface FrameCapturer : RTCVideoCapturer

@property(nonatomic, weak) id<CapturerEventsDelegate> eventsDelegate;

- (instancetype)initWithDelegate:(__weak id<RTCVideoCapturerDelegate>)delegate;
- (void)consumeFrame:(CVPixelBufferRef)buffer;
- (void)startCapture;
- (void)stopCapture;

@end

NS_ASSUME_NONNULL_END
