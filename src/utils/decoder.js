
import { inflateSync } from 'fflate';

import xmlFormat from 'xml-formatter';

export default class Decoder {

    constructor(input, decodedMethods=null) {
        this.input = input
        this.decodedMethods = decodedMethods
        if (this.decodedMethods === null) {
            this.decodedMethods = []
        }
    }

    uriDecode() {
        try {
            return new Decoder(
                decodeURIComponent(this.input),
                ["URI Decoded", ...this.decodedMethods]
            )
        } catch {
            return this
        }
    }

    base64Decode() {
        try {
            return new Decoder(
                base64ToArrayBuffer(this.input),
                ["Base64 Decoded", ...this.decodedMethods]
            )
        } catch {
            return this
        }
    }

    inflate() {
        try {
            return new Decoder(
                inflateSync(this.input),
                ["Inflated", ...this.decodedMethods]
            )
        } catch {
            return this
        }
    }

    utf8Parse() {
        try {
            return new Decoder(
                new TextDecoder().decode(this.input),
                ["UTF-8 Parsed", ...this.decodedMethods]
            )
        } catch {
            return this
        }
    }

    format() {
        try {
            return new Decoder(
                xmlFormat(this.input),
                ["XML Formatted", ...this.decodedMethods]
            )
        } catch {
            return this
        }
    }

    toString() {
        return this.input
    }

}

function base64ToArrayBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
