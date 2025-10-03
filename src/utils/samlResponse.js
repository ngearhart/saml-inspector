import * as xmldsigjs from 'xmldsigjs';
import { fixChromeXMLSerializerImplementation } from './encoder';


export default class SamlResponse {
    constructor(xml) {
        this.xml = xml

        this.rootElement = xml.getElementsByTagName("samlp:Response")[0]

        // Some SAML Response implementations put "saml:" before tag names (e.g. Keycloak), some don't (e.g. Entra)
        this.samlTagPrefix = this.rootElement.getElementsByTagName("saml:Assertion").length > 0 ? "saml:" : ""
    }

    getDestination() {
        return this.rootElement.getAttribute("Destination")
    }

    getAudience() {
        return this.getAssertionElement().getElementsByTagName(this.samlTagPrefix + "Audience")[0].textContent.trim()
    }

    getIssuer() {
        return this.getAssertionElement().getElementsByTagName(this.samlTagPrefix + "Issuer")[0].textContent.trim()
    }

    getAssertionElement() {
        return this.rootElement.getElementsByTagName(this.samlTagPrefix + "Assertion")[0]
    }

    replaceResponseIds() {
        this.rootElement.setAttribute("ID", getRandomString(10))
        this.getAssertionElement().setAttribute("ID", getRandomString(10))  // These should be different
        return this
    }

    replaceSolicitation(newSolicitationId) {
        this.rootElement.setAttribute("InResponseTo", newSolicitationId)
        Array.from(this.rootElement.getElementsByTagName(this.samlTagPrefix + "SubjectConfirmationData")).forEach((element) => {
            element.setAttribute("InResponseTo", newSolicitationId)
        });

        return this
    }

    removeSolicitation() {
        this.rootElement.removeAttribute("InResponseTo")
        Array.from(this.rootElement.getElementsByTagName(this.samlTagPrefix + "SubjectConfirmationData")).forEach((element) => {
            element.removeAttribute("InResponseTo")
        });

        return this
    }

    replaceIssueInstant() {
        const dateNow = new Date().toISOString()
        this.rootElement.setAttribute("IssueInstant", dateNow)
        const assertion = this.getAssertionElement()
        assertion.setAttribute("IssueInstant", dateNow)

        // Also set AuthnInstance
        Array.from(assertion.getElementsByTagName(this.samlTagPrefix + "AuthnStatement")).forEach((element) => element.setAttribute("AuthnInstant", dateNow))

        // Also set NotBefore
        Array.from(assertion.getElementsByTagName(this.samlTagPrefix + "Conditions")).forEach((element) => element.setAttribute("NotBefore", dateNow))

        return this
    }

    replaceNotOnOrAfter(minutes = 5) {
        const dateOnOrAfter = new Date()
        dateOnOrAfter.setTime(dateOnOrAfter.getTime() + (minutes * 60 * 1000))

        const assertion = this.getAssertionElement()
        Array.from(assertion.getElementsByTagName(this.samlTagPrefix + "SubjectConfirmationData")).forEach((element) => {
            element.setAttribute("NotOnOrAfter", dateOnOrAfter.toISOString())
        })
        Array.from(assertion.getElementsByTagName(this.samlTagPrefix + "Conditions")).forEach((element) => {
            element.setAttribute("NotOnOrAfter", dateOnOrAfter.toISOString())
        })

        Array.from(assertion.getElementsByTagName(this.samlTagPrefix + "AuthnStatement")).forEach((element) => {
            element.setAttribute("SessionNotOnOrAfter", dateOnOrAfter.toISOString())
        });
        return this
    }

    removeOldSignatureBlock() {
        Array.from(this.rootElement.getElementsByTagName("dsig:Signature")).forEach(e => e.remove())
        return this
    }

    toStringWithTagSerializationFix() {
        return fixChromeXMLSerializerImplementation(this.toString())
    }

    convertToImpersonated(newSolicitationId) {
        this.replaceIssueInstant()
            .replaceResponseIds()
            .replaceNotOnOrAfter()
            .removeOldSignatureBlock()
        if (newSolicitationId) {
            this.replaceSolicitation(newSolicitationId)
        } else {
            this.removeSolicitation()
        }
        return this
    }

    async resign(privateKeyPem) {
        this.removeOldSignatureBlock()

        const privKey = await importPrivateKey(privateKeyPem)
        const publicKey = await publicKeyFromPrivateKey(privKey)

        // Parse XML document
        const xml = xmldsigjs.Parse(this.toString());

        // Create signature
        const signedXml = new xmldsigjs.SignedXml();
        await signedXml.Sign(
            {
                name: "RSASSA-PKCS1-v1_5",
                saltLength: 32,
            },
            privKey,
            xml,
            {
                keyValue: publicKey,
                references: [{ hash: "SHA-256", transforms: ["enveloped", "c14n"] }]
            }
        )

        console.log(signedXml.toString());

        return this
    }

    toString() {
        const serializer = new XMLSerializer()
        return serializer.serializeToString(this.rootElement)
    }
}

function getRandomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// From https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#examples
function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

async function importPrivateKey(pem) {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(
        pemHeader.length,
        pem.length - pemFooter.length - 1,
    );
    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSA-PSS",
            hash: "SHA-256",
        },
        true,
        ["sign"],
    );
}

// From https://www.putzisan.com/articles/derive-rsa-public-key-from-private-key-web-crypto
async function publicKeyFromPrivateKey(privateKey) {
    // Export the private key in JWK format
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", privateKey);
    // Extract the modulus and public exponent from the private JWK
    const { n, e } = privateKeyJwk;
    // Create a new JWK with the public components
    const publicKeyJwk = { kty: "RSA", e, n };

    const rsaParams = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    // Re-import the public key from our generated public JWK object
    return crypto.subtle.importKey("jwk", publicKeyJwk, rsaParams, true, ["verify"]);
}
