
import { NativeModules } from 'react-native';
import { Constraints, MediaTrackConstraints } from './Constraints';
import MediaStream from './MediaStream';
import MediaStreamError from './MediaStreamError';
import permissions from './Permissions';
import * as RTCUtil from './RTCUtil';

const { WebRTCModule } = NativeModules;

export type NativeBuffer = { pointer: bigint };
export type FrameConsumer = (frame: NativeBuffer | ArrayBuffer) => Promise<number>;
export default function getInputMedia(constraints: Constraints = {}): Promise<{stream: MediaStream, pushFrame: FrameConsumer}> {
    // According to
    // https://www.w3.org/TR/mediacapture-streams/#dom-mediadevices-getusermedia,
    // the constraints argument is a dictionary of type MediaStreamConstraints.
    if (typeof constraints !== 'object') {
        return Promise.reject(new TypeError('constraints is not a dictionary'));
    }

    if (!constraints.audio && !constraints.video) {
        return Promise.reject(new TypeError('audio or video is required'));
    }

    // Normalize constraints.
    constraints = RTCUtil.normalizeConstraints(constraints);

    // Request required permissions
    // Because the video is coming from an external source, we don't check camera permissions
    const hasNeededPermissions: Promise<boolean> = constraints.audio
        ? permissions.request({ name: 'microphone' })
        : Promise.resolve(true);

    return new Promise((resolve, reject) => {
        hasNeededPermissions.then(hasPermission => {
            if (!hasPermission) {
                reject(new MediaStreamError({message: 'Permission Denied', name: 'SecurityError'}));
                return;
            }

            const success = (id, tracks) => {
                // Store initial constraints.
                for (const trackInfo of tracks) {
                    const c = constraints[trackInfo.kind];

                    if (typeof c === 'object') {
                        trackInfo.constraints = RTCUtil.deepClone(c);
                    }
                }

                const info = {
                    streamId: id,
                    streamReactTag: id,
                    tracks
                };

                const pushFrame: FrameConsumer = (frame): Promise<number> => {
                   return pushFrameToStream(frame, id);
                };
                const stream = new MediaStream(info);
                resolve({stream, pushFrame});
            };

            const failure = (type, message) => {
                let error;

                switch (type) {
                    case 'TypeError':
                        error = new TypeError(message);
                        break;
                }

                if (!error) {
                    error = new MediaStreamError({ message, name: type });
                }

                reject(error);
            };

            WebRTCModule.getInputMedia(constraints, success, failure);
        });
    });
}

export function pushFrameToStream(frame: NativeBuffer | ArrayBuffer, streamId: string): Promise<number> {
    if (frame instanceof ArrayBuffer) {
        return Promise.reject(new TypeError('ArrayBuffer is not supported yet'));
    } else if (typeof frame === 'object' && frame['pointer']) {
        return WebRTCModule.pushNativeFrame(streamId, frame.pointer);
    } else {
        return Promise.reject(new TypeError('frame is not a NativeBuffer(CVPixelBufferRef ptr) or ArrayBuffer'));
    }
}
