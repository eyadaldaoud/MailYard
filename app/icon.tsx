import { ImageResponse } from 'next/og';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

// Brand mark: signal-yellow parcel stamped on depot chrome.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1c1f1c',
          borderRadius: 14,
          border: '2px solid #171a17',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            display: 'flex',
            background: '#ffd200',
            borderRadius: 4,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 4,
              height: '100%',
              background: '#1c1f1c',
              position: 'absolute',
              left: 13,
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
