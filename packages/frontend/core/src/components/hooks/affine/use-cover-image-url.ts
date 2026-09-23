import { useEffect, useState } from 'react';

type BlobReader = {
  get(key: string): Promise<Blob | null>;
};

const isDirectImageSource = (source: string) =>
  /^(?:data:|blob:|https?:)/.test(source);

export const useCoverImageUrl = (
  source: string | undefined,
  blobReader: BlobReader | undefined
) => {
  const [url, setUrl] = useState<string | undefined>(() =>
    source && isDirectImageSource(source) ? source : undefined
  );

  useEffect(() => {
    if (!source) {
      setUrl(undefined);
      return;
    }
    if (isDirectImageSource(source)) {
      setUrl(source);
      return;
    }
    if (!blobReader) {
      setUrl(undefined);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;
    setUrl(undefined);
    void blobReader
      .get(source)
      .then(blob => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(error => {
        console.error('Failed to load page cover', error);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobReader, source]);

  return url;
};
