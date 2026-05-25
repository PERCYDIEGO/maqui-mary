// Declaración de tipos para xml-crypto v2.x
// Evita errores de TypeScript al importar

declare module 'xml-crypto' {
  interface SignedXmlOptions {
    canonicalizationAlgorithm?: string
    signatureAlgorithm?: string
    idAttribute?: string
    implicitTransforms?: string[]
  }

  export class SignedXml {
    signatureAlgorithm: string
    canonicalizationAlgorithm: string
    signingKey: Buffer
    keyInfoProvider: {
      getKeyInfo(): string
      getKey(): Buffer
    }

    constructor(idMode?: string | null, options?: SignedXmlOptions)

    addReference(
      xpath: string,
      transforms: string[],
      digestAlgorithm: string,
      uri?: string,
      digestValue?: string,
      inclusiveNamespacesPrefixList?: string,
      isEmptyUri?: boolean
    ): void

    computeSignature(xml: string, opts?: { prefix?: string; attrs?: Record<string, string>; location?: { reference: string; action: string }; existingPrefixes?: Record<string, string> }): void
    getSignatureXml(): string
    getSignedXml(): string
  }
}
