// Declaración de tipos para xml-crypto v2.x
// Evita errores de TypeScript al importar

declare module 'xml-crypto' {
  export class SignedXml {
    signatureAlgorithm: string
    canonicalizationAlgorithm: string
    signingKey: Buffer
    keyInfoProvider: {
      getKeyInfo(): string
      getKey(): Buffer
    }

    addReference(
      xpath: string,
      transforms: string[],
      digestAlgorithm: string
    ): void

    computeSignature(xml: string): void
    getSignatureXml(): string
    getSignedXml(): string
  }
}
