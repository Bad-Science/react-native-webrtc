
import { NativeModules } from 'react-native';
import { MediaTrackConstraints } from './Constraints';
import MediaStream from './MediaStream';
import MediaStreamError from './MediaStreamError';
import permissions from './Permissions';
import * as RTCUtil from './RTCUtil';

const { WebRTCModule } = NativeModules;

export interface Constraints {
    audio?: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
}

export type PushFrame = (frame: any) => Promise<number>;
export default function getInputMedia(constraints: Constraints = {}): Promise<{stream: MediaStream, pushFrame: PushFrame}> {
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

                const pushFrame = (frame: any, _id?: number): Promise<number> => WebRTCModule.pushFrame(_id ?? id, frame);
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
