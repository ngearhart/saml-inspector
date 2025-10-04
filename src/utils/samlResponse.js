import * as xmldsigjs from 'xmldsigjs';
import { fixChromeXMLSerializerImplementation } from './encoder';
import { SignedXml } from 'xml-crypto';


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
        // Note: a valid xs:ID cannot start with a number
        this.rootElement.setAttribute("ID", getRandomAlphaString(5) + getRandomAlphaNumericString(5))
        this.getAssertionElement().setAttribute("ID", getRandomAlphaString(5) + getRandomAlphaNumericString(5))  // These should be different
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
        Array.from(this.rootElement.getElementsByTagName("ds:Signature")).forEach(e => e.remove())
        Array.from(this.rootElement.getElementsByTagName("Signature")).forEach(e => e.remove())
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
        xmldsigjs.XmlSignature.DefaultPrefix = 'dsig' // 'ds' by default - does not work in some SAML implementations
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
                references: [{ hash: "SHA-256", transforms: ["enveloped", "exc-c14n"] }]
            }
        )

        console.log(signedXml.toString())//.replaceAll("ds:", "dsig:").replaceAll("xmlns:ds", "xmlns:dsig"));

        return signedXml.toString()//.replaceAll("ds:", "dsig:").replaceAll("xmlns:ds", "xmlns:dsig")
    }

    resign2(privateKeyPem) {
        return new Promise(async (res, rej) => {
            const privKey = await importPrivateKey(privateKeyPem)
            const publicKey = await pemPublicKeyFromPrivateKey(privKey)
            const sig = new SignedXml();
            // Add assertion sections as reference
            const digestAlgorithm = "http://www.w3.org/2001/04/xmlenc#sha256"
            const signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
            const transformationAlgorithms = [
                'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
                'http://www.w3.org/2001/10/xml-exc-c14n#',
            ]
            const referenceTagXPath = false;
            const isMessageSigned = true;

            if (referenceTagXPath) {
                sig.addReference({
                    xpath: referenceTagXPath,
                    transforms: transformationAlgorithms,
                    digestAlgorithm: digestAlgorithm
                });
            }
            if (isMessageSigned) {
                sig.addReference({
                    // reference to the root node
                    xpath: '/*',
                    transforms: transformationAlgorithms,
                    digestAlgorithm
                });
            }
            
            sig.HashAlgorithms[digestAlgorithm] = MyDigest;
            sig.SignatureAlgorithms[signatureAlgorithm] = MySignatureAlgorithm;
            sig.signatureAlgorithm = signatureAlgorithm;
            sig.publicCert = publicKey.toString()
            sig.privateKey = privateKeyPem
            sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';

            this.removeOldSignatureBlock()
            const raw = this.toString()
            sig.computeSignature(raw, (error, result) => {
                if (error) {
                    rej(error)
                    return
                }
                console.log(result.getSignedXml())
                res(result.getSignedXml());
            });
        })
    }

    toString() {
        const serializer = new XMLSerializer()
        return serializer.serializeToString(this.rootElement)
    }
}

function hexToBase64(hexstring) {
    return btoa(hexstring.match(/\w{2}/g).map(function(a) {
        return String.fromCharCode(parseInt(a, 16));
    }).join(""));
}

function MyDigest() {
    this.getHash = function (xml, callback) {
        const ec = new TextEncoder();
        crypto.subtle.digest("SHA-256", ec.encode(xml)).then((result) => {
            const hashArray = Array.from(new Uint8Array(result));
            const hash = hashArray
                .map((item) => item.toString(16).padStart(2, "0"))
                .join("");
            callback(null, hexToBase64(hash))
        })
    };

    this.getAlgorithmName = function () {
        return "http://www.w3.org/2001/04/xmlenc#sha256";
    };
}

function MySignatureAlgorithm() {
    /*sign the given SignedInfo using the key. return base64 signature value*/
    this.getSignature = function (signedInfo, privateKey, callback) {
        importPrivateKey(privateKey).then(privKeyEncoded => {
            const ec = new TextEncoder();
            console.log(signedInfo)
            crypto.subtle.sign("RSASSA-PKCS1-v1_5", privKeyEncoded, ec.encode(signedInfo)).then((result) => {
                const hashArray = Array.from(new Uint8Array(result));
                const hash = hashArray
                    .map((item) => item.toString(16).padStart(2, "0"))
                    .join("");
                callback(null, hexToBase64(hash))
            })
        })
    };

    this.getAlgorithmName = function () {
        return "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    };
}

function getRandomAlphaString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


function getRandomAlphaNumericString(length) {
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
function arrayBufferToString( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return binary;
}

async function importPrivateKey(pem) {
    // fetch the part of the PEM string between header and footer
    // const pemHeader = "-----BEGIN PRIVATE KEY-----";
    // const pemFooter = "-----END PRIVATE KEY-----";
    // const pemContents = pem.substring(
    //     pemHeader.length,
    //     pem.length - pemFooter.length - 1,
    // );
    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pem);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        true,
        ["sign"],
    );
}

async function pemPublicKeyFromPrivateKey(privateKey) {
    const cryptoKey = await publicKeyFromPrivateKey(privateKey)
    const exported = await crypto.subtle.exportKey("spki", cryptoKey)
    return exportKeyAsPem(exported)
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

function formatAsPem(str) {
    var finalString = '-----BEGIN PUBLIC KEY-----\n';

    while(str.length > 0) {
        finalString += str.substring(0, 64) + '\n';
        str = str.substring(64);
    }

    finalString = finalString + "-----END PUBLIC KEY-----";

    return finalString;
}

function exportKeyAsPem(keydata){
    var keydataS = arrayBufferToString(keydata);
    var keydataB64 = window.btoa(keydataS);
    var keydataB64Pem = formatAsPem(keydataB64);
    return keydataB64Pem;
}
