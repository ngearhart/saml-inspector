export default class SamlRequest {
    constructor(xml) {
        this.xml = xml

        this.rootElement = xml.getElementsByTagName("samlp:AuthnRequest")[0]

        if (this.rootElement) {
            
        }
    }

    getElementList() {
        return [
            {
                line: 0,
                title: "Root Element"
            },
            {
                line: ,
                title: "Issuer"
            }
        ]
    }
}
