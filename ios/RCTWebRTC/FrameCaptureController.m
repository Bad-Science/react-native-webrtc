#if TARGET_OS_IOS

#import "FrameCaptureController.h"
#import "FrameCapturer.h"

@interface FrameCaptureController ()

@property(nonatomic, retain) FrameCapturer *capturer;

@end

@interface FrameCaptureController (CapturerEventsDelegate)<CapturerEventsDelegate>
- (void)capturerDidEnd:(RTCVideoCapturer *)capturer;
@end


@implementation FrameCaptureController

- (instancetype)initWithCapturer:(nonnull FrameCapturer *)capturer {
    self = [super init];
    if (self) {
        self.capturer = capturer;
        self.deviceId = @"frame-capture";
    }

    return self;
}

- (void)dealloc {
    [self.capturer stopCapture];
}

- (void)startCapture {
    self.capturer.eventsDelegate = self;
    [self.capturer startCapture];
}

- (void)consumeFrame:(CVPixelBufferRef)frame {
    [self.capturer consumeFrame:frame];
}

- (void)stopCapture {
    [self.capturer stopCapture];
}

- (NSDictionary *)getSettings {
    return @{
        @"deviceId": self.deviceId,
        @"groupId": @"",
        @"frameRate" : @(30)
    };
}
// MARK: CapturerEventsDelegate Methods

- (void)capturerDidEnd:(RTCVideoCapturer *)capturer {
    [self.eventsDelegate capturerDidEnd:capturer];
}

@end

#endif
