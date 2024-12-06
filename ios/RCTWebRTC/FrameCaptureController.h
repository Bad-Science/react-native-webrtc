#import <Foundation/Foundation.h>
#import "CaptureController.h"
#import "CapturerEventsDelegate.h"
#import <CoreVideo/CoreVideo.h>

NS_ASSUME_NONNULL_BEGIN

@class FrameCapturer;

@interface FrameCaptureController : CaptureController

- (instancetype)initWithCapturer:(nonnull FrameCapturer *)capturer;
- (void)consumeFrame:(CVPixelBufferRef)buffer;
- (void)startCapture;
- (void)stopCapture;

@end

NS_ASSUME_NONNULL_END
