declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    addVirtualFileSystem: (vfs: unknown) => void;
    addFonts: (fonts: unknown) => void;
    createPdf: (doc: unknown) => {
      getBlob: () => Promise<Blob>;
      getBuffer?: () => Promise<ArrayBuffer>;
      download?: (name?: string) => Promise<void>;
      getDataUrl?: () => Promise<string>;
    };
  };
  export default pdfMake;
}
