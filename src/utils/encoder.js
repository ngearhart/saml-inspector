
// All possible tag names in saml:Assertion
// Extracted from https://docs.oasis-open.org/security/saml/v2.0/saml-schema-assertion-2.0.xsd
const assertionElementNames = [
    "BaseID",
    "NameID",
    "EncryptedID",
    "Issuer",
    "AssertionIDRef",
    "AssertionURIRef",
    "Assertion",
    "Subject",
    "SubjectConfirmation",
    "SubjectConfirmationData",
    "Conditions",
    "Condition",
    "AudienceRestriction",
    "Audience",
    "OneTimeUse",
    "ProxyRestriction",
    "Advice",
    "EncryptedAssertion",
    "Statement",
    "AuthnStatement",
    "SubjectLocality",
    "AuthnContext",
    "AuthnContextClassRef",
    "AuthnContextDeclRef",
    "AuthnContextDecl",
    "AuthenticatingAuthority",
    "AuthzDecisionStatement",
    "Action",
    "Evidence",
    "AttributeStatement",
    "Attribute",
    "AttributeValue",
    "EncryptedAttribute",
]

/**
 * Chrome XML Serialization works differently than Firefox when using namespaced XML tags.
 * They are technically both compliant with the XML spec, but some XML parsers don't like the namespace result.
 * 
 * This function will force all tags in the SAML Assertion to use the explicit `saml:` namespace prefix
 *  if and only if the original assertion element starts with the namespaced tag.
 */
export function fixChromeXMLSerializerImplementation(plaintextPayload) {
    // if (plaintextPayload.includes("saml:Assertion")) {
    //     for (const tag of assertionElementNames) {
    //         plaintextPayload = plaintextPayload.replaceAll("<" + tag, "<saml:" + tag)
    //         plaintextPayload = plaintextPayload.replaceAll("</" + tag, "</saml:" + tag)
    //     }
    // }
    return plaintextPayload
}


export default function encode(plaintextPayload) {
    return btoa(fixChromeXMLSerializerImplementation(plaintextPayload.trim()))
}
