
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
        return Promise.reject(new TypeError('audio and/or video is required'));
    }

    // Normalize constraints.
    constraints = RTCUtil.normalizeConstraints(constraints);

    // Request required permissions
    const reqPermissions: Promise<boolean>[] = [];

    if (constraints.audio) {
        reqPermissions.push(permissions.request({ name: 'microphone' }));
    }

    return new Promise((resolve, reject) => {
        Promise.all(reqPermissions).then(results => {
            // Check permission results 
            for (const result of results) {
                if (!result) {
                    const error = {
                        message: 'Permission denied.',
                        name: 'SecurityError'
                    };
    
                    reject(new MediaStreamError(error));
                    return;
                }
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
