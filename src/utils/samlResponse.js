export default class SamlResponse {
    constructor(xml) {
        this.xml = xml

        this.rootElement = xml.getElementsByTagName("samlp:Response")[0]

        // Some SAML Response implementations put "saml:" before tag names (e.g. Keycloak), some don't (e.g. Entra)
        this.samlTagPrefix = this.rootElement.getElementsByTagName("saml:Assertion").length > 0 ? "saml:" : ""
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

    replaceNotOnOrAfter(minutes=5) {
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

    convertToImpersonated(newSolicitationId) {
        this.replaceIssueInstant()
            .replaceSolicitation(newSolicitationId)
            .replaceResponseIds()
            .replaceNotOnOrAfter()
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
